# =============================================================================
# OmniLlama Cleaner - Documentation Generation Module
#
# This module provides accessible, robust, and extensible tools for generating
# project documentation, including README.md files, document summaries, and
# citation extraction. It leverages LLMs for summarization and technical writing,
# and integrates with the rest of the herd_ai ecosystem.
# =============================================================================

from pathlib import Path
import logging
from typing import List, Dict, Any, Optional

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.panel import Panel

# =============================================================================
# Import configuration and utility functions with fallbacks for various contexts
# =============================================================================
try:
    from herd_ai.utils.file import get_file_text
    from herd_ai.utils.ai_provider import process_with_ai
    from herd_ai.rename import generate_description
    from herd_ai.citations import extract_citations_from_text
    from herd_ai.utils.analysis import generate_document_summary
    from herd_ai.config import DEFAULT_AI_PROVIDER, CODE_EXTENSIONS, TEXT_EXTENSIONS
    from herd_ai.utils import config as herd_config
except Exception as e:
    print(f"Error importing modules in docs.py: {e}")
    print("Make sure you're running from the project directory or the package is installed.")

console = Console()

# =============================================================================
# generate_docs
# -----------------------------------------------------------------------------
# Generates a comprehensive README.md for a project directory by summarizing
# all files and leveraging an LLM for professional documentation output.
# =============================================================================
def generate_docs(directory: Path, recursive: bool, provider: Optional[str] = None, log_callback: Optional[Any] = None):
    """
    Generate a full README.md by summarizing project files with rich feedback.
    Args:
        directory: Directory to scan for files.
        recursive: If True, scan subdirectories recursively.
        provider: AI provider to use for generation (e.g., "ollama", "xai", "gemini").
        log_callback: Optional callback for logging/progress feedback.
    Returns:
        Dictionary with results of the documentation generation process
    """
    result = {
        "success": False,
        "files_processed": 0,
        "readme_path": None,
        "error": None
    }
    try:
        # Ensure directory is a Path object
        if isinstance(directory, str):
            directory = Path(directory)
        def log(msg: str):
            if log_callback:
                log_callback(msg)
            else:
                console.print(msg)
                
        # Report start
        log(f"[dim]Starting documentation generation for {directory}[/dim]")
        
        # Get provider from config if not specified
        if provider is None and herd_config:
            saved_provider = herd_config.get_provider()
            if saved_provider:
                provider = saved_provider
                log(f"[cyan]Loading provider from config: {saved_provider}[/cyan]")
        provider = provider or DEFAULT_AI_PROVIDER
        
        log(Panel.fit("[bold blue]Generating Documentation[/bold blue]", title="Documentation Operation"))
        log(f"[bold cyan]Using AI provider: {provider}[/bold cyan]")
        
        # Get relevant file extensions from config
        try:
            code_exts = set(CODE_EXTENSIONS.keys())
            md_exts = {ext for ext in TEXT_EXTENSIONS if ext.lower() == '.md'}
            valid_exts = code_exts.union(md_exts)
            log(f"[dim]Processing code and Markdown files only ({len(valid_exts)} valid extensions)[/dim]")
        except Exception as e:
            valid_exts = {'.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.c', '.cpp', '.h', '.cs', '.go', '.rs', '.php', '.rb', '.md'}
            log(f"[yellow]Could not load extension list from config, using defaults. Error: {e}[/yellow]")
            
        entries = []
        walker = directory.rglob('*') if recursive else directory.glob('*')
        log(f"[dim]Scanning directory: {directory}, recursive={recursive}[/dim]")
        
        files = [p for p in walker if p.is_file() 
                                  and not p.name.startswith('.') 
                                  and not p.name.startswith('|_')
                                  and not any(part.startswith('.') or part.startswith('|_') for part in p.parts)
                                  and p.suffix.lower() in valid_exts]
                                  
        log(f"[dim]Found {len(files)} code and Markdown files to analyze[/dim]")
        
        if not files:
            msg = "No code or Markdown files found to document!"
            log(f"[yellow]{msg}[/yellow]")
            result["success"] = True
            result["message"] = msg
            return result
            
        processed_files = 0
        error_files = 0
        
        with Progress(SpinnerColumn(), TextColumn("{task.description}"), console=console if not log_callback else None) as progress:
            task = progress.add_task("Analyzing files...", total=len(files))
            
            for p in files:
                try:
                    log(f"[dim]Generating description for {p.name}[/dim]")
                    desc = generate_description(p, provider=provider)
                    rel = p.relative_to(directory)
                    entries.append(f"- **{rel}**: {desc[:200]}")
                    processed_files += 1
                except Exception as e:
                    log(f"[red]Error analyzing {p.name}: {e}[/red]")
                    error_files += 1
                    
                progress.update(task, advance=1)
                
        log(f"[dim]Generated {len(entries)} file descriptions[/dim]")
        
        files_block = "\n".join(entries)
        prompt = "Write a comprehensive README.md:\n\n" + files_block
        log(f"[dim]Sending prompt to {provider} for README generation[/dim]")
        
        system_prompt = (
            "You are a technical documentation expert. Generate a professional README.md file "
            "based on the file descriptions provided. Include the following sections: "
            "Overview, Installation, Usage, Features, and Project Structure. "
            "Format with proper Markdown and use concise, clear language."
        )
        
        # Use a placeholder file path since we're not processing a specific file
        placeholder_file = directory / "README.md.tmp"
        log(f"[dim]Using placeholder file: {placeholder_file}[/dim]")
        
        resp = process_with_ai(placeholder_file, prompt, provider=provider, custom_system_prompt=system_prompt)
        readme_path = directory / "README.md"
        
        # Ensure output directory exists
        readme_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Process AI response and save README
        if resp and resp.strip():
            log(f"[dim]Got response of length {len(resp)} from {provider}[/dim]")
            readme_path.write_text(resp, encoding="utf-8")
            log(Panel.fit(f"[green]README.md successfully generated at {readme_path}![/]", title="Documentation Complete"))
            
            result["success"] = True
            result["files_processed"] = processed_files
            result["readme_path"] = str(readme_path)
            result["readme_size"] = len(resp)
            return result
        else:
            msg = "Documentation generation failed. Empty response from AI provider."
            log(f"[red]{msg}[/red]")
            
            result["error"] = msg
            result["files_processed"] = processed_files
            result["readme_path"] = None
            return result
            
    except Exception as e:
        error_msg = f"Error generating documentation: {str(e)}"
        if log_callback:
            log_callback(f"[red]{error_msg}[/red]")
        result["error"] = error_msg
        return result

# =============================================================================
# export_document_summary
# -----------------------------------------------------------------------------
# Generates a Markdown summary of all documents in a directory, including
# document counts, word totals, types, and top keywords.
# =============================================================================
def export_document_summary(dir: Path, out: Path = None, provider: Optional[str] = None) -> Path:
    """
    Generate and export a document summary as Markdown.

    Args:
        dir: Directory containing documents to summarize.
        out: Output path (defaults to dir/document_summary.md).
        provider: AI provider to use (if needed for underlying functions).

    Returns:
        Path to the generated summary file.
    """
    sm = generate_document_summary(dir, provider=provider)
    if out is None:
        out = dir / 'document_summary.md'

    md = f"# Summary for {dir}\n\n"
    md += f"- Document Count: {sm['count']}\n"
    md += f"- Total Words: {sm['total_words']}\n\n"
    md += "## Types\n"
    for t, c in sm['document_types'].items():
        md += f"- {t}: {c}\n"
    md += "\n## Top Keywords\n"
    for kw, c in sorted(sm['top_keywords'].items(), key=lambda x: -x[1])[:20]:
        md += f"- {kw}: {c}\n"

    out.write_text(md)
    return out

# =============================================================================
# extract_citations_from_document
# -----------------------------------------------------------------------------
# Extracts citations from a document file using robust text extraction and
# citation parsing utilities.
# =============================================================================
def extract_citations_from_document(file_path: Path, styles: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Extract citations from a document using robust text extraction and citation parsing.

    Args:
        file_path: Path to the document.
        styles: List of citation styles to extract (default: ['apa']).

    Returns:
        List of citation dictionaries.
    """
    try:
        text = get_file_text(file_path)
        if not text or not text.strip():
            logging.info(f"No text extracted from {file_path}")
            return []
        
        if styles is None:
            styles = ['apa']
            
        citations = extract_citations_from_text(text, styles)
        logging.info(f"{file_path}: {len(citations)} citations found")
        return citations
    except Exception as e:
        logging.error(f"Error extracting citations from {file_path}: {e}")
        return []