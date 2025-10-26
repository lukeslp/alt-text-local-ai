# =============================================================================
# herd_ai.rename
# 
# File renaming functionality using LLM (Large Language Model) suggestions.
# Provides batch and single-file renaming, using AI to generate meaningful
# filenames based on file content. Includes logging, undo support, and
# flexible provider/model selection.
# =============================================================================

import json
from json import JSONDecodeError
from pathlib import Path
import logging
import time
from typing import List, Set, Dict, Callable, Any, Optional, Union, Tuple
import os

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, MofNCompleteColumn, TimeElapsedColumn
from rich.panel import Panel
from rich.table import Table

# =============================================================================
# Import configuration, file utilities, and AI provider modules.
# Tries several import paths for compatibility with different project layouts.
# =============================================================================
try:
    try:
        from herd_ai.config import PROCESS_EXTENSIONS, RENAME_TEMPLATE, DEFAULT_AI_PROVIDER, IMAGE_EXTENSIONS
        from herd_ai.utils.file import get_file_text, clean_filename
        from herd_ai.utils.ai_provider import process_with_ai
        from herd_ai.utils import config as herd_config
    except ImportError:
        try:
            from llamacleaner.config import PROCESS_EXTENSIONS, RENAME_TEMPLATE, DEFAULT_AI_PROVIDER, IMAGE_EXTENSIONS
            from llamacleaner.utils.file import get_file_text, clean_filename
            from llamacleaner.utils.ai_provider import process_with_ai
            from llamacleaner.utils import config as herd_config
        except ImportError:
            from config import PROCESS_EXTENSIONS, RENAME_TEMPLATE, DEFAULT_AI_PROVIDER, IMAGE_EXTENSIONS
            from utils.file import get_file_text, clean_filename
            from utils.ai_provider import process_with_ai
            from utils import config as herd_config
except Exception as e:
    print(f"Error importing modules in rename.py: {e}")
    print("Make sure you're running from the project directory or the package is installed.")
    raise

logger = logging.getLogger(__name__)
console = Console()

# =============================================================================
# generate_description
# 
# Generates a meaningful content description for a file, to be used as context
# in LLM prompts. Handles PDFs, Word documents, and plain text files.
# =============================================================================
def generate_description(path: Path, provider: Optional[str] = None) -> str:
    """
    Generate a short description of a file's content.
    
    Args:
        path: Path to the file
        provider: AI provider (not used in this function, for compatibility)
        
    Returns:
        str: A short description of the file content
    """
    try:
        try:
            try:
                from herd_ai.utils.file import extract_text_from_pdf, extract_text_from_docx
            except ImportError:
                try:
                    from llamacleaner.utils.file import extract_text_from_pdf, extract_text_from_docx
                except ImportError:
                    from utils.file import extract_text_from_pdf, extract_text_from_docx
        except Exception as e:
            print(f"Error importing file utilities: {e}")
            raise
        
        ext = path.suffix.lower()
        if ext == ".pdf":
            text = extract_text_from_pdf(path)
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            return lines[0][:500] if lines else f"PDF document {path.stem}"
        elif ext in {".docx", ".doc"}:
            text = extract_text_from_docx(path)
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            return lines[0][:500] if lines else f"Document {path.stem}"
        else:
            txt = get_file_text(path)
            return txt[:500] + "..." if len(txt) > 500 else txt
    except Exception as e:
        logger.error(f"Error generating description for {path}: {e}")
        return f"File {path.stem}"

# =============================================================================
# rename_file
# 
# Renames a file to the provided suggestion (after cleaning), logs the action
# for undo, and ensures no collisions or trivial renames occur.
# =============================================================================
def rename_file(path: Path, suggestion: str, omni_paths: Dict[str, Any]) -> bool:
    new_base = clean_filename(suggestion)
    new_name = new_base + path.suffix.lower()
    target = path.with_name(new_name)
    
    if target.exists():
        console.print(f"[yellow]Skipping rename; target exists: {target}[/]")
        return False
    
    if path.name == new_name:
        console.print(f"[yellow]Skipping rename; name unchanged: {path.name}[/]")
        return False
    
    if path.stem.lower() == new_base.lower():
        console.print(f"[yellow]Skipping rename; names too similar: {path.stem} ≈ {new_base}[/]")
        return False
    
    try:
        console.log(f"Renaming {path.name} → {new_name}")
        path.rename(target)
        undo_log = omni_paths.get("undo_log", omni_paths.get("backup_dir", path.parent) / "undo_log.json")
        try:
            if isinstance(undo_log, Path) and undo_log.exists():
                with open(undo_log, "r") as ul:
                    try:
                        log = json.load(ul)
                    except JSONDecodeError:
                        log = []
            else:
                log = []
            log.append({
                "type": "rename", 
                "old": str(path), 
                "new": str(target),
                "timestamp": time.time()
            })
            if isinstance(undo_log, Path):
                undo_log.parent.mkdir(exist_ok=True, parents=True)
                with open(undo_log, "w") as ul:
                    json.dump(log, ul, indent=2)
        except Exception as e:
            logger.error(f"Error logging rename action: {e}")
        return True
    except Exception as e:
        console.print(f"[red]Error renaming {path.name}: {e}[/]")
        return False

# =============================================================================
# batch_process_files
# 
# Processes a list of files in batches, sending their content to the LLM for
# filename suggestions, and renaming them accordingly. Handles logging, timing,
# and provider/model selection.
# =============================================================================
def batch_process_files(
    files: List[Path],
    omni_paths: Dict[str, Any],
    log_callback: Optional[Callable[[str], None]] = None,
    batch_size: int = 10,
    provider: str = None
) -> Tuple[int, int]:
    if provider is None and herd_config:
        saved_provider = herd_config.get_provider()
        if saved_provider:
            provider = saved_provider
            if log_callback:
                log_callback(f"[cyan]Loading provider from config: {saved_provider}[/cyan]")
    provider = provider or DEFAULT_AI_PROVIDER

    def log(msg: str) -> None:
        if log_callback:
            log_callback(msg)
        else:
            logger.info(msg)
    
    if not files:
        log("[yellow]No files to process.[/]")
        return 0, 0

    log(f"[bold cyan]Using AI provider: {provider}[/bold cyan]")

    if provider == "xai":
        masked_key = "********"
        api_key = None
        if herd_config:
            api_key = herd_config.get_api_key('xai')
        if not api_key:
            api_key = os.environ.get("XAI_API_KEY", "")
            if api_key:
                log(f"[cyan]Using X.AI API key from environment variable[/cyan]")
            else:
                log(f"[bold yellow]Warning: No X.AI API key found. Processing may fail.[/bold yellow]")
        else:
            if len(api_key) > 8:
                masked_key = f"{api_key[:4]}...{api_key[-4:]}"
            log(f"[cyan]Using X.AI API key from config: {masked_key}[/cyan]")

    success_count = 0
    batches = [files[i:i+batch_size] for i in range(0, len(files), batch_size)]
    log(f"[cyan]Processing {len(files)} files in {len(batches)} batches[/cyan]")
    processing_times = []
    overall_start_time = time.time()

    for batch_idx, batch in enumerate(batches, 1):
        log(f"[cyan]Processing batch {batch_idx}/{len(batches)} ({len(batch)} files)[/cyan]")
        for file_idx, filepath in enumerate(batch, 1):
            file_start_time = time.time()
            log(f"[dim cyan]Processing file {file_idx}/{len(batch)} in batch {batch_idx}: {filepath.name}[/dim cyan]")
            if filepath.suffix.lower() not in PROCESS_EXTENSIONS:
                log(f"[yellow]Skipping unsupported file type: {filepath}[/]")
                continue
            model = "default"
            try:
                from herd_ai.config import get_model_for_file
                model = get_model_for_file(filepath, provider)
                log(f"[cyan]Using model {model} for {filepath.name} with provider {provider}[/cyan]")
            except ImportError:
                log(f"[yellow]Could not determine specific model for {provider}[/yellow]")
            desc = generate_description(filepath, provider=provider)
            file_contents = get_file_text(filepath)
            if not file_contents.strip():
                suggestion = f"{clean_filename(filepath.stem)}_v2"
                log(f"[yellow]No text content, using basic rename: {suggestion}[/]")
                if rename_file(filepath, suggestion, omni_paths):
                    success_count += 1
                    file_time = time.time() - file_start_time
                    processing_times.append(file_time)
                    log(f"[green]Renamed {filepath.name} → {suggestion}{filepath.suffix} in {file_time:.2f}s[/]")
                continue
            prompt = (
                f"Based on this file's content, suggest a concise, meaningful filename (no more than 5 words):\n\n"
                f"Current name: {filepath.name}\n"
                f"Content sample: {file_contents[:1000] if len(file_contents) > 1000 else file_contents}\n\n"
                "Respond with ONLY the new filename (no extension)."
            )
            log(f"[cyan]Sending prompt to {provider} (model: {model}) for {filepath.name}[/cyan]")
            ai_start_time = time.time()
            try:
                raw = process_with_ai(filepath, prompt, provider=provider, custom_system_prompt=RENAME_TEMPLATE)
                # Handle dict responses by extracting the 'text' field
                if isinstance(raw, dict):
                    text_response = raw.get("text", "")
                else:
                    text_response = raw or ""
                ai_processing_time = time.time() - ai_start_time
                log(f"[blue]AI processing took {ai_processing_time:.2f} seconds for {filepath.name}[/blue]")
                log(f"[dim]Raw AI response ({len(text_response) if text_response else 0} chars): {repr(text_response[:100])}{'...' if text_response and len(text_response) > 100 else ''}[/dim]")
            except Exception as e:
                log(f"[red]Exception while calling AI for {filepath.name}: {e}[/red]")
                continue
            # Skip empty or whitespace-only responses
            if not text_response or not text_response.strip():
                log(f"[yellow]Empty response from AI for {filepath.name}[/]")
                continue
            suggestion = clean_filename(text_response.strip())
            if not suggestion or suggestion.lower().startswith("please") or len(suggestion) > 100:
                log(f"[yellow]Invalid suggestion: {suggestion}[/]")
                continue
            if rename_file(filepath, suggestion, omni_paths):
                success_count += 1
                file_time = time.time() - file_start_time
                processing_times.append(file_time)
                log(f"[green]Renamed {filepath.name} → {suggestion}{filepath.suffix} in {file_time:.2f}s[/]")
            else:
                log(f"[yellow]Skipped rename for {filepath.name}[/]")
    total_time = time.time() - overall_start_time
    if processing_times:
        avg_time = sum(processing_times) / len(processing_times)
        min_time = min(processing_times)
        max_time = max(processing_times)
        log(f"[bold cyan]Processing Statistics:[/bold cyan]")
        log(f"[cyan]Total processing time: {total_time:.2f}s[/cyan]")
        log(f"[cyan]Average processing time: {avg_time:.2f}s per file[/cyan]")
        log(f"[cyan]Fastest processing time: {min_time:.2f}s[/cyan]")
        log(f"[cyan]Slowest processing time: {max_time:.2f}s[/cyan]")
    return success_count, len(files)

# =============================================================================
# process_renames
# 
# Entry point for renaming files or directories (optionally recursively).
# Handles exclusion, provider/model selection, and delegates to batch processing.
# =============================================================================
def process_renames(
    file_or_dir: Path, 
    recursive: bool = False, 
    log_callback: Optional[Callable[[str], None]] = None,
    exclude_ext: Set[str] = None,
    omni_paths: Dict[str, Any] = None,
    provider: str = None
) -> None:
    if omni_paths is None:
        omni_paths = {}
    if exclude_ext is None:
        exclude_ext = set()
    if provider is None and herd_config:
        saved_provider = herd_config.get_provider()
        if saved_provider:
            provider = saved_provider
            if log_callback:
                log_callback(f"[cyan]Loading provider from config: {saved_provider}[/cyan]")
    provider = provider or DEFAULT_AI_PROVIDER

    def log(msg: str) -> None:
        if log_callback:
            log_callback(msg)
        else:
            logger.info(msg)

    def is_image_file(path):
        ext = path.suffix.lower()
        return ext in IMAGE_EXTENSIONS if 'IMAGE_EXTENSIONS' in globals() else ext in {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg'}

    if file_or_dir.is_file():
        if file_or_dir.suffix.lower() in exclude_ext:
            log(f"[yellow]Skipping excluded extension: {file_or_dir}[/]")
            return
        if provider == "xai" and is_image_file(file_or_dir):
            log(f"[yellow]Skipping image file for xai provider: {file_or_dir}[/]")
            return
        if file_or_dir.suffix.lower() in PROCESS_EXTENSIONS:
            success, total = batch_process_files([file_or_dir], omni_paths, log_callback, provider=provider)
            if success > 0:
                log(f"[green]Successfully renamed {success}/{total} files[/]")
            else:
                log(f"[yellow]No files were renamed.[/]")
            return
        log(f"[yellow]Skipping unsupported file type: {file_or_dir}[/]")
        return

    if file_or_dir.is_dir():
        start_dir_time = time.time()
        log(f"[bold cyan]Scanning directory: {file_or_dir}[/bold cyan]")
        log(f"[bold cyan]Using AI provider: {provider}[/bold cyan]")
        try:
            from herd_ai.config import get_model_for_file
            sample_file = next((p for p in file_or_dir.glob('*') if p.is_file() and p.suffix.lower() in PROCESS_EXTENSIONS), None)
            if sample_file:
                model = get_model_for_file(sample_file, provider)
                log(f"[cyan]Using model {model} for text files with provider {provider}[/cyan]")
        except (ImportError, StopIteration):
            log(f"[yellow]Could not determine specific model for {provider}[/yellow]")
        if provider == "xai":
            masked_key = "********"
            api_key = None
            if herd_config:
                api_key = herd_config.get_api_key('xai')
            if not api_key:
                api_key = os.environ.get("XAI_API_KEY", "")
                if api_key:
                    log(f"[cyan]Using X.AI API key from environment variable[/cyan]")
                else:
                    log(f"[bold yellow]Warning: No X.AI API key found. Processing may fail.[/bold yellow]")
            else:
                if len(api_key) > 8:
                    masked_key = f"{api_key[:4]}...{api_key[-4:]}"
                log(f"[cyan]Using X.AI API key from config: {masked_key}[/cyan]")
        walker = file_or_dir.rglob('*') if recursive else file_or_dir.glob('*')
        files = [
            p for p in walker 
            if p.is_file() 
            and not p.name.startswith('.')
            and not p.name.startswith('|_')
            and not any(part.startswith('.') or part.startswith('|_') for part in p.parts)
            and p.suffix.lower() in PROCESS_EXTENSIONS
            and p.suffix.lower() not in exclude_ext
            and not (provider == "xai" and is_image_file(p))
        ]
        if not files:
            log(f"[yellow]No applicable files found in {file_or_dir}[/]")
            return
        log(f"[cyan]Found {len(files)} files to process[/cyan]")
        success, total = batch_process_files(files, omni_paths, log_callback, provider=provider)
        total_time = time.time() - start_dir_time
        avg_time = total_time / max(1, success) if success > 0 else 0
        log(f"[bold green]━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━[/bold green]")
        log(f"[bold green]Processing Summary:[/bold green]")
        log(f"[green]Successfully renamed {success}/{total} files[/green]")
        log(f"[green]Provider used: {provider}[/green]")
        log(f"[green]Directory: {file_or_dir}[/green]")
        log(f"[green]Total processing time: {total_time:.2f} seconds[/green]")
        if success > 0:
            log(f"[green]Average time per renamed file: {avg_time:.2f} seconds[/green]")
        log(f"[bold green]━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━[/bold green]")
        return

    log(f"[yellow]Path is neither a file nor a directory: {file_or_dir}[/]")

# =============================================================================
# process_rename_file
# 
# Processes a single file renaming operation, sending a prompt to the LLM and
# returning the suggested new filename. Used for fine-grained or custom renaming.
# =============================================================================
def process_rename_file(file_path, prompt, provider=None, custom_system_prompt=None):
    start_time = time.time()
    if provider is None and herd_config:
        saved_provider = herd_config.get_provider()
        if saved_provider:
            provider = saved_provider
            logger.info(f"Loading provider from config: {saved_provider}")
    provider = provider or DEFAULT_AI_PROVIDER
    logger.info(f"Processing rename with provider: {provider}")
    model = "default"
    try:
        from herd_ai.config import get_model_for_file
        model = get_model_for_file(file_path, provider)
        logger.info(f"Using model: {model} for {file_path}")
    except ImportError:
        pass
    try:
        ai_start_time = time.time()
        raw = process_with_ai(file_path, prompt, provider=provider, custom_system_prompt=custom_system_prompt)
        # Handle dict responses by extracting the 'text' field
        if isinstance(raw, dict):
            text_response = raw.get("text", "")
        else:
            text_response = raw or ""
        ai_time = time.time() - ai_start_time
        if not text_response or not text_response.strip():
            logger.warning(f"Empty response from {provider} for {file_path}")
            return None
        logger.info(f"AI processing took {ai_time:.2f}s with {provider} model {model}")
        suggestion = text_response.strip()
        total_time = time.time() - start_time
        logger.info(f"Total processing time: {total_time:.2f}s for {file_path}")
        return suggestion
    except Exception as e:
        logger.error(f"Error in process_rename_file for {file_path}: {e}")
        return None

# =============================================================================
# __main__ test harness
# 
# Minimal test for the AI provider, for development/debugging.
# =============================================================================
if __name__ == "__main__":
    import time
    try:
        try:
            from herd_ai.utils.ai_provider import process_with_ai
        except ImportError:
            try:
                from llamacleaner.utils.ai_provider import process_with_ai
            except ImportError:
                from utils.ai_provider import process_with_ai
    except logging.exception as e:
        print(f"Error importing ai_provider module: {e}")
        raise
        
    print("[TEST] Starting minimal AI provider test...")
    start = time.time()
    response = process_with_ai(
        Path("test_file.py"),
        "Suggest a filename for a Python script that prints 'Hello, world!'", 
        provider=DEFAULT_AI_PROVIDER,
        custom_system_prompt="You are a filename suggestion assistant. Given the contents of a file, you suggest a concise, descriptive filename without an extension. Respond with exactly the filename (no quotes, no extension, no extra text)."
    )
    end = time.time()
    print(f"[TEST] AI response: {repr(response)}")
    print(f"[TEST] Time elapsed: {end - start:.2f} seconds") 