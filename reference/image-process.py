###############################################################################
# herd_ai/image_processor.py
#
# Image Processing and Accessibility Module
#
# This module provides robust, accessible, and extensible tools for processing
# images in a directory. It generates alt text and detailed descriptions using
# AI, embeds alt text into images, renames files based on content, and creates
# Markdown documentation for each image. It supports batch processing, caching,
# and conversion of various image formats, with a focus on accessibility and
# integration with LLM workflows.
###############################################################################

import os
import logging
import base64
import tempfile
import io
import gc
import json
import re
import shutil
import time
import sys
import argparse
from pathlib import Path
from typing import Dict, Optional, Tuple, Union, Any, List, Set, Callable

from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, MofNCompleteColumn, TimeElapsedColumn
from rich.table import Table
from rich.prompt import Prompt

###############################################################################
# PIL Import and Fallback Handling
###############################################################################
try:
    from PIL import Image, ExifTags, ImageFile
    ImageFile.LOAD_TRUNCATED_IMAGES = True
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

###############################################################################
# Configuration and Utility Imports with Fallbacks
###############################################################################
try:
    try:
        from herd_ai.config import IMAGE_EXTENSIONS, DEFAULT_AI_PROVIDER, IMAGE_ALT_TEXT_TEMPLATE
        from herd_ai.utils.file import extract_text_from_image, get_image_dimensions, embed_alt_text_into_image
        from herd_ai.utils.ai_provider import process_with_ai
        from herd_ai.utils.file import clean_filename, get_cache_key
    except ImportError:
        try:
            from llamacleaner.config import IMAGE_EXTENSIONS, DEFAULT_AI_PROVIDER, IMAGE_ALT_TEXT_TEMPLATE
            from llamacleaner.utils.file import extract_text_from_image, get_image_dimensions, embed_alt_text_into_image
            from llamacleaner.utils.ai_provider import process_with_ai
            from llamacleaner.utils.file import clean_filename, get_cache_key
        except ImportError:
            from config import IMAGE_EXTENSIONS, DEFAULT_AI_PROVIDER, IMAGE_ALT_TEXT_TEMPLATE
            from utils.file import extract_text_from_image, get_image_dimensions, embed_alt_text_into_image
            from utils.ai_provider import process_with_ai
            from utils.file import clean_filename, get_cache_key
except Exception as e:
    print(f"Error importing modules in image_processor.py: {e}")
    print("Make sure you're running from the project directory or the package is installed.")
    IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg'}
    DEFAULT_AI_PROVIDER = "ollama"
    IMAGE_ALT_TEXT_TEMPLATE = (
        "You are an AI specializing in describing images for accessibility purposes. "
        "Write comprehensive alt text for this image. "
        "Format your response in JSON with description, alt_text, suggested_filename, and tags."
    )
    def extract_text_from_image(path):
        return ""
    def get_image_dimensions(path):
        return None
    def embed_alt_text_into_image(path, alt_text):
        pass
    def process_with_ai(file_path, prompt, provider=None, custom_system_prompt=None):
        return None
    def clean_filename(name):
        return name.lower().replace(' ', '_')
    def get_cache_key(path_str):
        import hashlib
        return hashlib.md5(path_str.encode('utf-8')).hexdigest()

logger = logging.getLogger(__name__)
console = Console()

ALT_CACHE_FILE = "alt_text_cache.json"
SUPPORTED_CONVERT_EXTS = {'.heic', '.heif', '.webp', '.gif'}

try:
    from herd_ai.utils import config as herd_config
except ImportError:
    herd_config = None

###############################################################################
# ImageProcessor Class
#
# Handles single image and directory processing, including AI-based alt text
# generation, file renaming, alt text embedding, and Markdown documentation.
###############################################################################
class ImageProcessor:
    def __init__(self, max_size_mb: float = 25.0, omni_paths: Optional[Dict[str, Any]] = None, provider: str = None):
        if provider is None and herd_config:
            provider = herd_config.get_provider()
        self.max_size_mb = max_size_mb
        self.alt_cache: Dict[str, Any] = {}
        self.omni_paths = omni_paths or {}
        self.provider = provider or DEFAULT_AI_PROVIDER
        if not PIL_AVAILABLE:
            logger.warning("PIL/Pillow not installed. Image processing capabilities will be limited.")

    def can_process(self, file_path: Path) -> bool:
        """
        Determine if a file can be processed based on its extension.
        """
        return file_path.suffix.lower() in IMAGE_EXTENSIONS

    def convert_image_for_processing(self, image_path: Path, max_size: int = 1000000) -> Tuple[Optional[bytes], Optional[str]]:
        """
        Convert and optimize an image for AI processing.
        Handles RGBA/LA images, resizes large images, and outputs JPEG bytes.
        Returns a tuple of (image_data, error_message).
        """
        try:
            with Image.open(image_path) as img:
                if img.mode in ('RGBA', 'LA'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'RGBA':
                        background.paste(img, mask=img.split()[3])
                    else:
                        background.paste(img, mask=img.split()[1])
                    img = background
                elif img.mode not in ('RGB', 'L'):
                    img = img.convert('RGB')
                if img.size[0] * img.size[1] > 4000000:
                    img.thumbnail((2000, 2000), Image.Resampling.LANCZOS)
                buffer = io.BytesIO()
                save_kwargs = {}
                if img.format == 'JPEG':
                    save_kwargs['quality'] = 85
                    save_kwargs['optimize'] = True
                elif img.format == 'PNG':
                    save_kwargs['optimize'] = True
                else:
                    save_kwargs['quality'] = 85
                img.save(buffer, format='JPEG', **save_kwargs)
                return buffer.getvalue(), None
        except Exception as e:
            return None, f"Error converting image: {str(e)}"

    ###############################################################################
    # process_single_image
    #
    # Processes a single image file: generates alt text and description using AI,
    # embeds alt text, renames the file if needed, and creates a Markdown summary.
    # Returns a dictionary with processing results and error info.
    ###############################################################################
    def process_single_image(
        self, 
        file_path: Path, 
        omni_paths: Dict[str, Any], 
        log_callback: Optional[Callable[[str], None]] = None
    ) -> Dict[str, Any]:
        result = {
            "file": str(file_path),
            "alt_text_generated": False,
            "dimensions": None,
            "renamed": False,
            "error": None,
            "new_path": None,
            "markdown_path": None
        }
        def log(msg: str) -> None:
            if log_callback:
                log_callback(msg)
            else:
                console.print(msg)
        if not PIL_AVAILABLE:
            log(f"[yellow]PIL/Pillow not available for image processing: {file_path}[/]")
            result["error"] = "PIL/Pillow not available"
            return result
        try:
            base_dir = omni_paths.get("base_dir", file_path.parent / ".herd")
            if isinstance(base_dir, str):
                base_dir = Path(base_dir)
            before_dims = get_image_dimensions(file_path)
            result["dimensions"] = before_dims
            log(f"[bold blue]Processing image:[/] {file_path.name} ({before_dims})")
            if herd_config:
                config_provider = herd_config.get_provider()
                if config_provider and config_provider != self.provider:
                    log(f"[yellow]Warning: Using provider '{self.provider}' instead of configured provider '{config_provider}'[/]")
                if self.provider == "xai":
                    masked_key = "********"
                    api_key = herd_config.get_api_key('xai')
                    if api_key:
                        if len(api_key) > 8:
                            masked_key = f"{api_key[:4]}...{api_key[-4:]}"
                        log(f"[cyan]Using X.AI API key: {masked_key}[/cyan]")
                    else:
                        log(f"[yellow]Warning: No X.AI API key found in config. Using environment variable if available.[/]")
            log(f"[cyan]Using AI provider: {self.provider}[/cyan]")
            if 'get_model_for_file' in globals():
                model = get_model_for_file(file_path, self.provider)
                log(f"[cyan]Using model: {model} for {file_path.name}[/cyan]")
            image_data, error = self.convert_image_for_processing(file_path)
            if error:
                log(f"[yellow]{error}[/]")
                result["error"] = error
                return result
            ocr = extract_text_from_image(file_path) or ""
            prompt = (
                "You will receive both OCR-extracted text and a base64-encoded image. "
                "Return a JSON object with the following keys:\n"
                "- alt_text: A brief but descriptive alt text for the image (2-4 sentences)\n"
                "- description: A very detailed description of what's in the image (15+ sentences)\n"
                "- categories: A list of categories/tags for the image\n"
                "- suggested_filename: A concise, descriptive filename (5-8 words max, lowercase with underscores)\n\n"
                f"OCR Text: {ocr[:1000]}\n"
                f"Current filename: {file_path.name}\n"
            )
            if image_data:
                b64 = base64.b64encode(image_data).decode('utf-8')
                if len(b64) < 500000:
                    prompt += f"Image Base64: {b64}"
                else:
                    prompt += "Image Base64: [Image too large, using OCR text only]"
            log(f"[cyan]Analyzing image with {self.provider}: {file_path.name}[/cyan]")
            start_time = time.time()
            data = {}
            if self.provider == "xai":
                data = process_with_ai(file_path, prompt, provider=self.provider, custom_system_prompt=IMAGE_ALT_TEXT_TEMPLATE)
                if not data or not isinstance(data, dict):
                    log(f"[red]X.AI processing failed or returned invalid data for {file_path.name}[/red]")
                    result["error"] = "X.AI processing failed or returned invalid data"
                    return result
            else:
                raw = process_with_ai(file_path, prompt, provider=self.provider, custom_system_prompt=IMAGE_ALT_TEXT_TEMPLATE)
                
                # Handle dictionary responses with as_text flag (for error handling from Ollama)
                if isinstance(raw, dict) and raw.get("as_text", False):
                    # This is an error response from Ollama that should be treated as text
                    if raw.get("error", False):
                        log(f"[yellow]AI provider returned an error: {raw.get('text', 'Unknown error')}[/]")
                        result["error"] = raw.get("text", "AI provider error")
                        data = {}
                    else:
                        raw = raw.get("text", "")
                
                # Normal text response processing
                if not isinstance(raw, dict) and (not raw or not raw.strip()):
                    log(f"[yellow]Warning: AI returned empty response for {file_path.name}[/]")
                    data = {}
                elif not isinstance(raw, dict):
                    try:
                        data = json.loads(raw)
                    except json.JSONDecodeError as e:
                        log(f"[yellow]Error parsing AI response for {file_path.name}: {e}[/]")
                        if raw and "{" in raw and "}" in raw:
                            try:
                                start = raw.find("{")
                                end = raw.rfind("}") + 1
                                if start >= 0 and end > start:
                                    json_str = raw[start:end]
                                    data = json.loads(json_str)
                            except:
                                pass
                        else:
                            data = {}
                else:
                    # Handle dict responses (e.g., Ollama) by parsing JSON from 'text' field if present
                    if 'alt_text' in raw:
                        data = raw
                    elif 'text' in raw:
                        try:
                            data = json.loads(raw.get('text', ''))
                        except json.JSONDecodeError:
                            data = {}
                    else:
                        data = raw
            end_time = time.time()
            processing_time = end_time - start_time
            log(f"[cyan]Processing completed in {processing_time:.2f} seconds with {self.provider}[/cyan]")
            alt = data.get("alt_text", "")
            desc = data.get("description", "")
            cats = data.get("categories", data.get("tags", [])) or []
            if isinstance(cats, str):
                cats = [cat.strip() for cat in cats.split(",")]
            name_raw = data.get("suggested_filename", "")
            if alt:
                log(f"[green]Generated alt text: {alt[:50]}...[/]")
            else:
                log(f"[yellow]No alt text generated[/]")
            if name_raw:
                log(f"[green]Suggested filename: {name_raw}[/]")
            else:
                log(f"[yellow]No filename suggested[/]")
            self.alt_cache[get_cache_key(str(file_path))] = alt
            if alt:
                result["alt_text_generated"] = True
                log(f"[green]Generated alt text for {file_path.name}[/]")
                try:
                    embed_alt_text_into_image(file_path, alt)
                    log(f"[green]Embedded alt text in {file_path.name}[/]")
                except Exception as e:
                    log(f"[yellow]Error embedding alt text in {file_path.name}: {e}[/]")
            after_dims = get_image_dimensions(file_path)
            if name_raw and len(name_raw.strip()) > 3:
                new_stem = clean_filename(name_raw)
                new_name = f"{new_stem}{file_path.suffix.lower()}"
                new_path = file_path.with_name(new_name)
                if not new_path.exists() and new_name != file_path.name and new_stem != file_path.stem:
                    try:
                        file_path.rename(new_path)
                        log(f"[green]Renamed image:[/] {file_path.name} → {new_name}")
                        file_path = new_path
                        result["renamed"] = True
                        result["new_path"] = str(new_path)
                    except Exception as e:
                        log(f"[yellow]Error renaming {file_path.name}: {e}[/]")
                else:
                    base, ext = os.path.splitext(new_name)
                    counter = 1
                    while True:
                        candidate = f"{base}_{counter}{ext}"
                        candidate_path = file_path.with_name(candidate)
                        if not candidate_path.exists():
                            try:
                                file_path.rename(candidate_path)
                                log(f"[green]Renamed image:[/] {file_path.name} → {candidate}")
                                file_path = candidate_path
                                result["renamed"] = True
                                result["new_path"] = str(candidate_path)
                            except Exception as e:
                                log(f"[yellow]Error renaming {file_path.name}: {e}[/]")
                            break
                        counter += 1
            md_content = [
                f"# {file_path.stem}",
                "",
                f"**Alt Text:** {alt}",
                "",
                f"**Description:** {desc}",
                "",
                "## Categories"
            ]
            for c in cats:
                md_content.append(f"- {c}")
            md_content.extend([
                "",
                "## Metadata",
                f"- Dimensions before: {before_dims}",
                f"- Dimensions after: {after_dims}",
                f"- File path: {file_path}",
                f"- AI Provider: {self.provider}",
                f"- Process date: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(Path(file_path).stat().st_mtime))}"
            ])
            md_path = file_path.with_suffix('.md')
            try:
                md_path.write_text("\n".join(md_content), encoding='utf-8')
                result["markdown_path"] = str(md_path)
                log(f"[green]Created markdown file: {md_path.name}[/]")
            except Exception as e:
                log(f"[yellow]Error creating markdown for {file_path.name}: {e}[/]")
            table = Table(title=f"Summary for {file_path.name}")
            table.add_column("Field", style="bold cyan")
            table.add_column("Value", style="white")
            table.add_row("Dimensions", str(after_dims))
            table.add_row("AI Provider", self.provider)
            table.add_row("Processing Time", f"{processing_time:.2f} seconds")
            table.add_row("Alt Text", alt[:50] + "..." if len(alt) > 50 else alt or "[red]None[/]")
            table.add_row("Categories", ", ".join(cats) or "[red]None[/]")
            table.add_row("Description", desc[:50] + "..." if len(desc) > 50 else desc or "[red]None[/]")
            if result["renamed"]:
                table.add_row("Renamed To", Path(result["new_path"]).name)
            console.print(table)
            return result
        except Exception as e:
            error_msg = f"Error processing image {file_path}: {str(e)}"
            log(f"[red]{error_msg}[/]")
            result["error"] = error_msg
            return result

    ###############################################################################
    # process_directory
    #
    # Processes all images in a directory (optionally recursively), generating
    # alt text, renaming files, and creating Markdown documentation for each.
    # Returns a dictionary with processing statistics.
    ###############################################################################
    def process_directory(
        self, 
        directory: Path, 
        recursive: bool = False,
        batch_size: int = 10,
        force: bool = False,
        rename: bool = False,
        override_md: bool = False,
        test: bool = False,
        log_callback: Optional[Callable[[str], None]] = None,
        provider: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process all images in a directory.
        
        Wrapper around process_images_cli for backward compatibility with CLI module.
        
        Args:
            directory: Directory to process
            recursive: Whether to process subdirectories
            batch_size: Number of images to process at once
            force: Whether to force reprocessing of images with existing alt text
            rename: Whether to rename images based on content
            override_md: Whether to override existing markdown files
            test: Whether to test metadata before and after embedding
            log_callback: Optional callback for logging
            provider: AI provider to use
            
        Returns:
            Dictionary with processing statistics and success status
        """
        result = {
            "success": False,
            "files_processed": 0,
            "output_dir": None,
            "message": None,
            "error": None
        }
        
        try:
            if log_callback:
                log_callback(f"[bold cyan]Processing images in: {directory}[/]")
            
            # Prompt for options when invoked from CLI (i.e., when force/rename/etc. are not explicitly set)
            # Only prompt if we have a log_callback (interactive mode)
            if log_callback and all(not x for x in [force, rename, override_md, test]):
                log_callback("[yellow]Please configure image processing options:[/yellow]")
                
                force = Prompt.ask("[bright_yellow]Force reprocessing even if .md or cache exists?[/bright_yellow] (y/n)", default="n").lower() == "y"
                rename = Prompt.ask("[bright_yellow]Rename files based on content analysis?[/bright_yellow] (y/n)", default="n").lower() == "y"
                override_md = Prompt.ask("[bright_yellow]Override existing markdown file check and reprocess images?[/bright_yellow] (y/n)", default="n").lower() == "y"
                test = Prompt.ask("[bright_yellow]Check metadata before and after embedding alt text?[/bright_yellow] (y/n)", default="n").lower() == "y"
                
                log_callback(f"[bright_blue]Options: force={force}, rename={rename}, override_md={override_md}, test={test}[/bright_blue]")
            
            # Ensure directory is a Path object
            if isinstance(directory, str):
                directory = Path(directory)
            
            # Check if directory exists
            if not directory.exists():
                error_msg = f"Directory not found: {directory}"
                if log_callback:
                    log_callback(f"[red]{error_msg}[/red]")
                result["error"] = error_msg
                return result
            
            # Setup paths
            base_dir = directory / ".herd"
            images_dir = base_dir / "images"
            
            # Ensure directories exist
            base_dir.mkdir(parents=True, exist_ok=True)
            images_dir.mkdir(parents=True, exist_ok=True)
            
            stats = process_images_cli(
                directory=directory,
                recursive=recursive,
                force=force,
                rename=rename,
                override_md=override_md,
                test=test,
                log_callback=log_callback,
                provider=provider
            )
            
            # Return detailed results
            result["success"] = True
            result["files_processed"] = stats.get("total", 0)
            result["files_processed_success"] = stats.get("processed", 0)
            result["files_with_errors"] = stats.get("errors", 0)
            result["output_dir"] = str(images_dir)
            result["message"] = f"Processed {stats.get('processed', 0)}/{stats.get('total', 0)} images"
            
            return result
            
        except Exception as e:
            error_msg = f"Error processing images: {str(e)}"
            if log_callback:
                log_callback(f"[red]{error_msg}[/red]")
            result["error"] = error_msg
            return result

###############################################################################
# convert_to_jpeg
#
# Converts HEIC/HEIF, WebP, or GIF images to JPEG for processing.
# Returns the path to the converted JPEG or None on failure.
###############################################################################
def convert_to_jpeg(image_path: Path) -> Optional[Path]:
    try:
        from PIL import Image
        temp_path = Path(tempfile.gettempdir()) / f"temp_{image_path.stem}.jpg"
        if image_path.suffix.lower() in {'.heic', '.heif'}:
            try:
                import pyheif
                heif_file = pyheif.read(str(image_path))
                img = Image.frombytes(
                    heif_file.mode, heif_file.size, heif_file.data,
                    "raw", heif_file.mode, heif_file.stride,
                )
                img.save(temp_path, "JPEG", quality=95)
                return temp_path
            except Exception:
                pass
        elif image_path.suffix.lower() == '.webp':
            img = Image.open(image_path)
            if img.mode in ('RGBA', 'LA'):
                background = Image.new('RGBA', img.size, (255, 255, 255))
                img = Image.alpha_composite(background.convert(img.mode), img)
            img = img.convert("RGB")
            img.save(temp_path, "JPEG", quality=95)
            return temp_path
        elif image_path.suffix.lower() == '.gif':
            img = Image.open(image_path)
            img.seek(0)
            img = img.convert("RGB")
            img.save(temp_path, "JPEG", quality=95)
            return temp_path
    except Exception:
        pass
    return None

###############################################################################
# load_alt_cache / save_alt_cache
#
# Persistent cache helpers for alt text and processing results.
###############################################################################
def load_alt_cache() -> Dict[str, Any]:
    if os.path.exists(ALT_CACHE_FILE):
        with open(ALT_CACHE_FILE, "r", encoding="utf-8") as fp:
            return json.load(fp)
    return {}

def save_alt_cache(cache: Dict[str, Any]):
    with open(ALT_CACHE_FILE, "w", encoding="utf-8") as fp:
        json.dump(cache, fp, indent=2, ensure_ascii=False)

###############################################################################
# process_images_cli
#
# Main entry point for batch image processing from the CLI.
# Handles directory traversal, caching, format conversion, and logging.
###############################################################################
def process_images_cli(
    directory: Path,
    recursive: bool = False,
    force: bool = False,
    rename: bool = False,
    override_md: bool = False,
    test: bool = False,
    log_callback: Optional[Any] = None,
    provider: str = None
):
    if provider is None and herd_config:
        saved_provider = herd_config.get_provider()
        if saved_provider:
            provider = saved_provider
            if log_callback:
                log_callback(f"[cyan]Loading provider from config: {provider}[/cyan]")
    provider = provider or DEFAULT_AI_PROVIDER
    if log_callback:
        log_callback(f"[cyan]Using AI provider: {provider}[/cyan]")
        if provider == "xai":
            masked_key = "********"
            api_key = None
            if herd_config:
                api_key = herd_config.get_api_key('xai')
            if not api_key:
                api_key = os.environ.get("XAI_API_KEY", "")
                if api_key:
                    log_callback(f"[cyan]Using X.AI API key from environment variable[/cyan]")
                else:
                    log_callback(f"[yellow]Warning: No X.AI API key found. Processing may fail.[/yellow]")
            else:
                if len(api_key) > 8:
                    masked_key = f"{api_key[:4]}...{api_key[-4:]}"
                log_callback(f"[cyan]Using X.AI API key from config: {masked_key}[/cyan]")
    if log_callback:
        options = []
        if force:
            options.append("force=True (reprocess even if cached)")
        if rename:
            options.append("rename=True (rename files)")
        if override_md:
            options.append("override_md=True (override existing markdown)")
        if test:
            options.append("test=True (testing mode)")
        if options:
            log_callback(f"[cyan]Options: {', '.join(options)}[/cyan]")
    cache = load_alt_cache()
    stats = {
        "total": 0, "processed": 0, "skipped": 0, "renamed": 0, "errors": 0,
        "converted": 0, "optimized": 0
    }
    images = []
    walker = directory.rglob('*') if recursive else directory.glob('*')
    for p in walker:
        if not p.is_file() or any(part.startswith('.') or part.startswith('|_') for part in p.parts):
            continue
        if p.suffix.lower() in IMAGE_EXTENSIONS or p.suffix.lower() in SUPPORTED_CONVERT_EXTS:
            images.append(p)
    stats["total"] = len(images)
    if not images:
        if log_callback:
            log_callback("[yellow]No images found in directory.[/]")
        return stats
    for img_path in images:
        try:
            md_path = img_path.with_suffix('.md')
            cache_key = f"{img_path}:{os.path.getmtime(img_path)}"
            if md_path.exists() and not override_md and not force:
                if log_callback:
                    log_callback(f"[yellow]Skipping {img_path.name}: .md exists[/]")
                stats["skipped"] += 1
                continue
            if cache_key in cache and not force:
                if log_callback:
                    log_callback(f"[yellow]Skipping {img_path.name}: in cache[/]")
                stats["skipped"] += 1
                continue
            to_process = img_path
            if img_path.suffix.lower() in SUPPORTED_CONVERT_EXTS:
                jpeg_path = convert_to_jpeg(img_path)
                if jpeg_path:
                    to_process = jpeg_path
                    stats["converted"] += 1
            processor = ImageProcessor(provider=provider)
            if 'get_model_for_file' in globals() and log_callback:
                try:
                    from herd_ai.config import get_model_for_file
                    model = get_model_for_file(to_process, provider)
                    log_callback(f"[cyan]Using model {model} for {img_path.name}[/cyan]")
                except ImportError:
                    pass
            start_time = time.time()
            result = processor.process_single_image(
                to_process, 
                {"base_dir": directory}, 
                log_callback
            )
            processing_time = time.time() - start_time
            if log_callback:
                log_callback(f"[cyan]Processing time: {processing_time:.2f} seconds[/cyan]")
            if result.get("error"):
                stats["errors"] += 1
            else:
                stats["processed"] += 1
                if result.get("renamed"):
                    stats["renamed"] += 1
            cache[cache_key] = {
                "alt_text": result.get("alt_text_generated"),
                "dimensions": result.get("dimensions"),
                "renamed": result.get("renamed"),
                "error": result.get("error"),
                "provider": provider,
                "processing_time": processing_time
            }
            save_alt_cache(cache)
        except Exception as e:
            if log_callback:
                log_callback(f"[red]Error processing {img_path}: {e}[/red]")
            stats["errors"] += 1
            continue
    if log_callback:
        log_callback(f"[bold green]Image processing complete. Summary:[/bold green]")
        log_callback(f"[green]Total images: {stats['total']}[/green]")
        log_callback(f"[green]Processed: {stats['processed']}[/green]")
        log_callback(f"[green]Converted: {stats['converted']}[/green]")
        log_callback(f"[green]Skipped: {stats['skipped']}[/green]")
        log_callback(f"[green]Renamed: {stats['renamed']}[/green]")
        log_callback(f"[green]Errors: {stats['errors']}[/green]")
        log_callback(f"[green]Provider used: {provider}[/green]")
    return stats

###############################################################################
# main
#
# CLI entry point for image processing. Parses arguments and invokes processing.
###############################################################################
def main():
    parser = argparse.ArgumentParser(description="Process images to generate alt text and markdown files.")
    parser.add_argument("--dir", required=True, help="Directory containing images to process")
    parser.add_argument("--recursive", "-r", action="store_true", help="Process subdirectories recursively")
    parser.add_argument("--force", "-f", action="store_true", help="Force reprocessing even if .md or cache exists")
    parser.add_argument("--rename", "-n", action="store_true", help="Rename files based on content analysis")
    parser.add_argument("--override_md", "-m", action="store_true", help="Override existing markdown file check and reprocess images")
    parser.add_argument("--test", "-t", action="store_true", help="Check metadata before and after embedding alt text")
    parser.add_argument("--provider", "-p", help=f"AI provider to use (default: {DEFAULT_AI_PROVIDER})")
    args = parser.parse_args()
    directory = Path(args.dir)
    if not directory.exists() or not directory.is_dir():
        print(f"[red]Invalid directory: {directory}[/red]")
        sys.exit(1)
    process_images_cli(directory, recursive=args.recursive, force=args.force, 
                      rename=args.rename, override_md=args.override_md, 
                      test=args.test, provider=args.provider)

if __name__ == "__main__":
    main()

# Process directory function for CLI compatibility
def process_directory(
    directory: Path,
    recursive: bool = False,
    batch_size: int = 10,
    force: bool = False,
    rename: bool = False,
    override_md: bool = False,
    test: bool = False,
    log_callback: Optional[Callable[[str], None]] = None,
    provider: Optional[str] = None
) -> Dict[str, Any]:
    """
    Process all images in a directory.
    
    Wrapper around process_images_cli for backward compatibility with CLI module.
    
    Args:
        directory: Directory to process
        recursive: Whether to process subdirectories
        batch_size: Number of images to process at once
        force: Whether to force reprocessing of images with existing alt text
        rename: Whether to rename images based on content
        override_md: Whether to override existing markdown files
        test: Whether to test metadata before and after embedding
        log_callback: Optional callback for logging
        provider: AI provider to use
        
    Returns:
        Dictionary with processing statistics
    """
    result = {
        "success": False,
        "files_processed": 0,
        "output_dir": None,
        "message": None,
        "error": None
    }
    
    try:
        if log_callback:
            log_callback(f"[bold cyan]Processing images in: {directory}[/]")
            
        # Prompt for options when invoked from CLI (i.e., when force/rename/etc. are not explicitly set)
        # Only prompt if we have a log_callback (interactive mode)
        if log_callback and all(not x for x in [force, rename, override_md, test]):
            log_callback("[yellow]Please configure image processing options:[/yellow]")
            
            force = Prompt.ask("[bright_yellow]Force reprocessing even if .md or cache exists?[/bright_yellow] (y/n)", default="n").lower() == "y"
            rename = Prompt.ask("[bright_yellow]Rename files based on content analysis?[/bright_yellow] (y/n)", default="n").lower() == "y"
            override_md = Prompt.ask("[bright_yellow]Override existing markdown file check and reprocess images?[/bright_yellow] (y/n)", default="n").lower() == "y"
            test = Prompt.ask("[bright_yellow]Check metadata before and after embedding alt text?[/bright_yellow] (y/n)", default="n").lower() == "y"
            
            log_callback(f"[bright_blue]Options: force={force}, rename={rename}, override_md={override_md}, test={test}[/bright_blue]")
        
        # Process the directory
        stats = process_images_cli(
            directory, 
            recursive=recursive,
            force=force, 
            rename=rename, 
            override_md=override_md, 
            test=test,
            log_callback=log_callback,
            provider=provider
        )
        
        if log_callback:
            log_callback(f"[bold green]Completed processing {stats.get('processed', 0)} out of {stats.get('total', 0)} images.[/]")
            
        # Set up result for return
        result["success"] = True
        result["files_processed"] = stats.get("processed", 0)
        result["output_dir"] = str(directory / ".herd" / "images") if directory else None
        result["stats"] = stats
        
    except Exception as e:
        import traceback
        error_msg = f"{e}\n{traceback.format_exc()}"
        if log_callback:
            log_callback(f"[bold red]Error processing directory: {e}[/]")
        result["success"] = False
        result["error"] = str(e)
        result["traceback"] = error_msg
    
    return result

# Add batch_extract_alt_text and list_alt_text_formats functions for CLI compatibility
def batch_extract_alt_text(
    directory: Path,
    output_format: str = "text",
    recursive: bool = False,
    log_callback: Optional[Callable[[str], None]] = None
) -> str:
    """
    Extract alt text from multiple images in a directory.
    
    Args:
        directory: Directory containing images
        output_format: Format for output (text, json, csv, markdown)
        recursive: Whether to process subdirectories
        log_callback: Optional callback for logging
        
    Returns:
        String with extracted alt text in requested format
    """
    if log_callback:
        log_callback(f"[bold cyan]Extracting alt text from images in: {directory}[/]")
    
    processor = ImageProcessor()
    image_files = []
    
    # Find all image files
    if recursive:
        image_files = [p for p in directory.rglob("*") if p.is_file() and processor.can_process(p)]
    else:
        image_files = [p for p in directory.glob("*") if p.is_file() and processor.can_process(p)]
    
    if log_callback:
        log_callback(f"[cyan]Found {len(image_files)} image files[/]")
    
    # Extract alt text
    results = []
    for img_file in image_files:
        try:
            from herd_ai.utils.file import read_alt_text
            alt_text = read_alt_text(img_file)
            if alt_text:
                results.append({
                    "file": str(img_file),
                    "alt_text": alt_text
                })
        except Exception as e:
            if log_callback:
                log_callback(f"[yellow]Error reading alt text from {img_file}: {e}[/]")
    
    # Format output
    output = ""
    if output_format == "json":
        output = json.dumps(results, indent=2)
    elif output_format == "csv":
        output = "file,alt_text\n"
        for r in results:
            safe_alt_text = r["alt_text"].replace('"', '""')
            output += f'"{r["file"]}","{safe_alt_text}"\n'
    elif output_format == "markdown":
        output = "# Image Alt Text\n\n"
        for r in results:
            output += f"## {Path(r['file']).name}\n\n"
            output += f"![{r['alt_text']}]({r['file']})\n\n"
            output += f"**Alt Text:** {r['alt_text']}\n\n"
    else:  # text
        for r in results:
            output += f"{r['file']}: {r['alt_text']}\n\n"
    
    return output

def list_alt_text_formats() -> List[str]:
    """
    List available output formats for alt text extraction.
    
    Returns:
        List of format names
    """
    return ["text", "json", "csv", "markdown"]