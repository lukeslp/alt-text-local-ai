# =============================================================================
# Herd AI - Idealized Citation Extraction and Management Module
#
# This module provides robust, accessible, and extensible tools for extracting,
# enriching, and managing citations from academic papers and documents.
# Features:
#   - User can select output file format(s) (md, bib, txt, csv, etc.)
#   - User can select citation style(s) to extract (APA, MLA, Chicago, IEEE, Vancouver)
#   - Extracts in-text, reference list, and DOI citations from text and document files
#   - Deduplicates citations by raw string/DOI
#   - Enriches DOIs via CrossRef
#   - Outputs master JSON and summary statistics
#   - CLI and function API
#   - Designed for accessibility and LLM workflows
# =============================================================================

import os
import json
import logging
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
import re
from datetime import datetime
import csv
import argparse
import bibtexparser
from bibtexparser.bwriter import BibTexWriter
from bibtexparser.bibdatabase import BibDatabase
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

# Setup path for local imports
current_dir = Path(__file__).parent.resolve()
parent_dir = current_dir.parent.resolve()
root_dir = parent_dir.parent.resolve()
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

# =============================================================================
# Import configuration and utility functions, with fallbacks for various contexts
# =============================================================================
try:
    try:
        # First try standard package imports
        from herd_ai.utils.file import get_file_text, is_ignored_file
        from herd_ai.config import TEXT_EXTENSIONS, DOCUMENT_EXTENSIONS
    except ImportError:
        try:
            # Then try legacy package imports
            from llamacleaner.utils.file import get_file_text, is_ignored_file
            from llamacleaner.config import TEXT_EXTENSIONS, DOCUMENT_EXTENSIONS
        except ImportError:
            try:
                # Then try relative imports
                from utils.file import get_file_text, is_ignored_file
                from config import TEXT_EXTENSIONS, DOCUMENT_EXTENSIONS
            except ImportError:
                # Last resort - direct imports using file path
                sys.path.insert(0, str(Path(__file__).resolve().parent))
                from herd_ai.utils.file import get_file_text, is_ignored_file
                from herd_ai.config import TEXT_EXTENSIONS, DOCUMENT_EXTENSIONS
except Exception as e:
    print(f"Error importing modules in citations.py: {e}")
    print("Make sure you're running from the project directory or the package is installed.")
    # Fallback definitions
    TEXT_EXTENSIONS = {'.txt', '.md', '.rst', '.tex', '.json', '.yaml', '.yml', '.toml', '.xml', '.env', '.properties', '.conf', '.ini', '.sql', '.graphql', '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd'}
    DOCUMENT_EXTENSIONS = {'.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls', '.odt', '.ods', '.odp'}
    def get_file_text(path):
        try:
            return Path(path).read_text(encoding='utf-8', errors='ignore')
        except:
            return ""
    def is_ignored_file(path):
        return Path(path).name.startswith('.') or Path(path).name.startswith('|_')

console = Console()
logger = logging.getLogger(__name__)

CITATION_FORMATS = {
    'txt': 'Plain Text',
    'md': 'Markdown',
    'bib': 'BibTeX',
    'csv': 'CSV',
    'apa': 'APA',
    'mla': 'MLA',
    'chicago': 'Chicago',
    'ieee': 'IEEE',
    'vancouver': 'Vancouver'
}
SUPPORTED_EXTENSIONS = TEXT_EXTENSIONS.union(DOCUMENT_EXTENSIONS)
SUPPORTED_STYLES = ['apa', 'mla', 'chicago', 'ieee', 'vancouver']

# =============================================================================
# Modular citation extraction for each style
# =============================================================================
def extract_citations_from_text(text: str, styles: Optional[List[str]] = None) -> List[Dict[str, str]]:
    """
    Extract citations from text content for the requested styles.
    Args:
        text: The text content to analyze
        styles: List of citation styles to extract (default: ['apa'])
    Returns:
        List of dictionaries containing citation information
    """
    if styles is None:
        styles = ['apa']
        
    citations = []
    # APA
    if 'apa' in styles:
        apa_in_text = re.findall(r'\(([A-Za-z]+(?:[ ,&]+[A-Za-z]+)*,? \d{4}[a-z]?(?:, p\. \d+)?)+\)', text)
        for citation in apa_in_text:
            parts = citation.split(',')
            if len(parts) >= 2:
                authors = parts[0].strip()
                year_match = re.search(r'(\d{4})', parts[1])
                year = year_match.group(1) if year_match else ""
                citations.append({
                    "type": "in-text",
                    "style": "apa",
                    "authors": authors,
                    "year": year,
                    "raw": citation
                })
    # MLA
    if 'mla' in styles:
        mla_in_text = re.findall(r'\([A-Za-z\-]+(?:\s+(?:and|&)\s+[A-Za-z\-]+)*\s+\d+(?:-\d+)?\)', text)
        for citation in mla_in_text:
            citations.append({
                "type": "in-text",
                "style": "mla",
                "raw": citation
            })
    # Chicago
    if 'chicago' in styles:
        chicago_in_text = re.findall(r'\([A-Za-z\-]+\s+\d{4},\s*\d+(?:-\d+)?\)', text)
        for citation in chicago_in_text:
            citations.append({
                "type": "in-text",
                "style": "chicago",
                "raw": citation
            })
    # IEEE/Vancouver
    if 'ieee' in styles or 'vancouver' in styles:
        ieee_in_text = re.findall(r'\[\d+\]', text)
        for citation in ieee_in_text:
            citations.append({
                "type": "in-text",
                "style": "ieee",
                "raw": citation
            })
    # Reference entries (APA-like)
    if 'apa' in styles or 'mla' in styles or 'chicago' in styles:
        reference_entries = re.findall(r'([A-Za-z]+, [A-Z]\. [A-Z]\.(?:, & [A-Za-z]+, [A-Z]\. [A-Z]\.)*) \((\d{4})\)\. (.*?)\. (.*?)(?: |$)', text)
        for entry in reference_entries:
            if len(entry) >= 4:
                authors, year, title, source = entry[0], entry[1], entry[2], entry[3]
                citations.append({
                    "type": "reference",
                    "style": "apa",
                    "authors": authors,
                    "year": year,
                    "title": title,
                    "source": source,
                    "raw": " ".join(entry)
                })
    # DOIs
    doi_pattern = r'\b(10\.\d{4,}(?:\.\d+)*\/(?:(?!["\'\s])[-_;()/:a-zA-Z0-9])+)'
    dois = re.findall(doi_pattern, text)
    for doi in dois:
        citations.append({
            "type": "doi",
            "style": "doi",
            "doi": doi,
            "raw": doi
        })
    return citations

# =============================================================================
# DOI enrichment (unchanged)
# =============================================================================
def extract_citations_from_doi(doi: str, log_callback: Optional[Any] = None, provider: str = None) -> Optional[Dict[str, str]]:
    """
    Extract citation information from a DOI using CrossRef.
    Args:
        doi: Digital Object Identifier
        log_callback: Optional callback for logging progress/errors
        provider: AI provider to use (ollama, xai, gemini)
    Returns:
        Dictionary containing citation information, or None if extraction failed
    """
    try:
        import requests
        url = f"https://api.crossref.org/works/{doi}"
        if log_callback:
            log_callback(f"[dim]Fetching metadata for DOI: {doi}[/dim]")
            if provider:
                log_callback(f"[dim]Using provider: {provider}[/dim]")
        response = requests.get(url, headers={"Accept": "application/json"}, timeout=10)
        if response.status_code == 200:
            data = response.json()
            message = data.get("message", {})
            title = message.get("title", [])
            title = title[0] if title and isinstance(title, list) else ""
            authors = []
            for author in message.get("author", []):
                given = author.get("given", "")
                family = author.get("family", "")
                if given and family:
                    authors.append(f"{family}, {given[0]}.")
            date_parts = message.get("published", {}).get("date-parts", [[]])
            year = str(date_parts[0][0]) if date_parts and date_parts[0] else ""
            container = message.get("container-title", [])
            container = container[0] if container and isinstance(container, list) else ""
            volume = message.get("volume", "")
            issue = message.get("issue", "")
            page = message.get("page", "")
            url_val = message.get("URL", "")
            author_string = ", ".join(authors)
            if author_string:
                author_string += "."
            citation = {
                "type": "doi",
                "authors": author_string,
                "year": year,
                "title": title,
                "source": container,
                "volume": volume,
                "issue": issue,
                "pages": page,
                "doi": doi,
                "url": url_val,
                "raw": f"{author_string} ({year}). {title}. {container}, {volume}({issue}), {page}. {doi}"
            }
            if log_callback:
                log_callback(f"[green]DOI metadata fetched for {doi}[/green]")
            return citation
        else:
            if log_callback:
                log_callback(f"[yellow]DOI lookup failed for {doi}: HTTP {response.status_code}[/yellow]")
    except Exception as e:
        msg = f"[red]Error extracting citation from DOI {doi}: {e}[/red]"
        logger.error(msg)
        if log_callback:
            log_callback(msg)
    return None

# =============================================================================
# Deduplication utility
# =============================================================================
def dedupe_citations(citations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Deduplicate citations by their 'raw' field or DOI.
    """
    seen = set()
    deduped = []
    for c in citations:
        key = c.get('doi') or c.get('raw')
        if key and key not in seen:
            deduped.append(c)
            seen.add(key)
    return deduped

# =============================================================================
# Save master JSON
# =============================================================================
def save_citations_json(citations: List[Dict[str, Any]], directory: Path) -> Path:
    meta_dir = directory / ".herd/citations"
    meta_dir.mkdir(exist_ok=True, parents=True)
    citations_file = meta_dir / "citations.json"
    with open(citations_file, 'w', encoding='utf-8') as f:
        json.dump(citations, f, indent=2, ensure_ascii=False)
    return citations_file

# =============================================================================
# Output generation for each format and style
# =============================================================================
def generate_output(citations: List[Dict[str, Any]], directory: Path, formats: List[str], style: str) -> Dict[str, Path]:
    """
    Generate output files in requested formats and citation style.
    """
    outputs = {}
    meta_dir = directory / ".herd/citations"
    meta_dir.mkdir(exist_ok=True, parents=True)
    # Filter citations by style for output
    filtered = [c for c in citations if c.get('style') == style or c.get('type') == 'doi']
    # Markdown
    if 'md' in formats:
        md_path = meta_dir / f"CITATIONS.{style}.md"
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(generate_markdown_citation_list(filtered, directory, style))
        outputs['md'] = md_path
    # BibTeX
    if 'bib' in formats:
        bib_path = meta_dir / f"CITATIONS.{style}.bib"
        with open(bib_path, 'w', encoding='utf-8') as f:
            f.write(generate_bibtex_citations(filtered))
        outputs['bib'] = bib_path
    # Plain text
    if 'txt' in formats:
        txt_path = meta_dir / f"CITATIONS.{style}.txt"
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write(generate_plain_text_citations(filtered))
        outputs['txt'] = txt_path
    # CSV
    if 'csv' in formats:
        csv_path = meta_dir / f"CITATIONS.{style}.csv"
        with open(csv_path, 'w', encoding='utf-8') as f:
            f.write(generate_csv_citations(filtered))
        outputs['csv'] = csv_path
    # MLA, Chicago, IEEE, Vancouver (as .txt)
    if 'mla' in formats and style == 'mla':
        mla_path = meta_dir / f"CITATIONS.mla.txt"
        with open(mla_path, 'w', encoding='utf-8') as f:
            f.write(generate_mla_citations(filtered))
        outputs['mla'] = mla_path
    if 'chicago' in formats and style == 'chicago':
        chicago_path = meta_dir / f"CITATIONS.chicago.txt"
        with open(chicago_path, 'w', encoding='utf-8') as f:
            f.write(generate_chicago_citations(filtered))
        outputs['chicago'] = chicago_path
    if 'ieee' in formats and style == 'ieee':
        ieee_path = meta_dir / f"CITATIONS.ieee.txt"
        with open(ieee_path, 'w', encoding='utf-8') as f:
            f.write(generate_ieee_citations(filtered))
        outputs['ieee'] = ieee_path
    # TODO: Add Vancouver output if needed
    return outputs

# =============================================================================
# Output formatters (unchanged except for style filtering)
# =============================================================================
def generate_markdown_citation_list(citations: List[Dict[str, Any]], directory: Path, style: str) -> str:
    """
    Generate a markdown-formatted citation list for the directory and style.
    """
    markdown = f"# Citations from {directory.name} ({style.upper()})\n\n"
    markdown += f"*Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')}*\n\n"
    if not citations:
        markdown += "No citations found.\n"
        return markdown
    markdown += "## References\n\n"
    for ref in citations:
        authors = ref.get("authors", "")
        year = ref.get("year", "")
        title = ref.get("title", "")
        source = ref.get("source", "")
        volume = ref.get("volume", "")
        issue = ref.get("issue", "")
        pages = ref.get("pages", "")
        doi = ref.get("doi", "")
        url = ref.get("url", "")
        citation = f"{authors} ({year}). *{title}*. "
        if source:
            citation += f"**{source}**"
            if volume:
                citation += f", {volume}"
                if issue:
                    citation += f"({issue})"
            if pages:
                citation += f", {pages}"
            citation += "."
        if doi:
            doi_url = f"https://doi.org/{doi}"
            citation += f" [{doi}]({doi_url})"
        elif url:
            citation += f" [Link]({url})"
        markdown += f"- {citation}\n\n"
    return markdown

def generate_bibtex_citations(citations: List[Dict[str, Any]]) -> str:
    db = BibDatabase()
    db.entries = []
    for ref in citations:
        author_key = ref.get('authors', '').split(',')[0].strip() if ref.get('authors') else "Unknown"
        year_key = ref.get('year', '')
        entry = {
            'ENTRYTYPE': 'article',
            'ID': f"{author_key}_{year_key}",
            'title': ref.get("title", ""),
            'author': ref.get("authors", ""),
            'year': ref.get("year", ""),
            'journal': ref.get("source", ""),
            'volume': ref.get("volume", ""),
            'number': ref.get("issue", ""),
            'pages': ref.get("pages", ""),
            'doi': ref.get("doi", "")
        }
        entry = {k: v for k, v in entry.items() if v}
        db.entries.append(entry)
    writer = BibTexWriter()
    writer.indent = '    '
    return writer.write(db)

def generate_plain_text_citations(citations: List[Dict[str, Any]]) -> str:
    formatted_citations = []
    for ref in citations:
        authors = ref.get("authors", "")
        year = ref.get("year", "")
        title = ref.get("title", "")
        source = ref.get("source", "")
        volume = ref.get("volume", "")
        issue = ref.get("issue", "")
        pages = ref.get("pages", "")
        doi = ref.get("doi", "")
        citation = f"{authors} ({year}). {title}. {source}"
        if volume:
            citation += f", {volume}"
            if issue:
                citation += f"({issue})"
        if pages:
            citation += f", {pages}"
        if doi:
            citation += f". https://doi.org/{doi}"
        citation += "."
        formatted_citations.append(citation)
    return "\n\n".join(formatted_citations)

def generate_csv_citations(citations: List[Dict[str, Any]]) -> str:
    import io
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        'authors', 'year', 'title', 'source', 'volume', 'issue', 'pages', 'doi', 'url'
    ])
    writer.writeheader()
    for ref in citations:
        writer.writerow({
            'authors': ref.get("authors", ""),
            'year': ref.get("year", ""),
            'title': ref.get("title", ""),
            'source': ref.get("source", ""),
            'volume': ref.get("volume", ""),
            'issue': ref.get("issue", ""),
            'pages': ref.get("pages", ""),
            'doi': ref.get("doi", ""),
            'url': ref.get("url", "")
        })
    return output.getvalue()

def generate_mla_citations(citations: List[Dict[str, Any]]) -> str:
    formatted_citations = []
    for ref in citations:
        authors = ref.get("authors", "")
        title = ref.get("title", "")
        source = ref.get("source", "")
        volume = ref.get("volume", "")
        issue = ref.get("issue", "")
        pages = ref.get("pages", "")
        year = ref.get("year", "")
        citation = f"{authors} \"{title}.\" {source}"
        if volume:
            citation += f", vol. {volume}"
            if issue:
                citation += f", no. {issue}"
        if pages:
            citation += f", pp. {pages}"
        citation += f", {year}."
        formatted_citations.append(citation)
    return "\n\n".join(formatted_citations)

def generate_chicago_citations(citations: List[Dict[str, Any]]) -> str:
    formatted_citations = []
    for ref in citations:
        authors = ref.get("authors", "")
        title = ref.get("title", "")
        source = ref.get("source", "")
        volume = ref.get("volume", "")
        issue = ref.get("issue", "")
        pages = ref.get("pages", "")
        year = ref.get("year", "")
        doi = ref.get("doi", "")
        citation = f"{authors} \"{title}.\" {source}"
        if volume:
            citation += f" {volume}"
            if issue:
                citation += f", no. {issue}"
        if pages:
            citation += f" ({year}): {pages}."
        else:
            citation += f" ({year})."
        if doi:
            citation += f" https://doi.org/{doi}"
        formatted_citations.append(citation)
    return "\n\n".join(formatted_citations)

def generate_ieee_citations(citations: List[Dict[str, Any]]) -> str:
    formatted_citations = []
    for i, ref in enumerate(citations, 1):
        authors = ref.get("authors", "")
        title = ref.get("title", "")
        source = ref.get("source", "")
        volume = ref.get("volume", "")
        issue = ref.get("issue", "")
        pages = ref.get("pages", "")
        year = ref.get("year", "")
        doi = ref.get("doi", "")
        citation = f"[{i}] {authors}, \"{title},\" {source}"
        if volume:
            citation += f", vol. {volume}"
            if issue:
                citation += f", no. {issue}"
        if pages:
            citation += f", pp. {pages}"
        citation += f", {year}."
        if doi:
            citation += f" doi: {doi}"
        formatted_citations.append(citation)
    return "\n\n".join(formatted_citations)

# =============================================================================
# Main processing function
# =============================================================================
def process_directory(directory: Path, recursive: bool = True, styles: List[str] = None, outputs: List[str] = None, log_callback: Optional[Any] = None, provider: str = None) -> Dict[str, Any]:
    """
    Process a directory for citations, dedupe, enrich DOIs, and output in requested formats/styles.
    
    Args:
        directory: Directory to process 
        recursive: Whether to process subdirectories recursively
        styles: Citation styles to extract (default: ['apa'])
        outputs: Output file formats (default: ['md'])
        log_callback: Optional callback for logging progress
        provider: AI provider to use for DOI enrichment
        
    Returns:
        Dictionary with paths to generated output files
    """
    try:
        # Ensure directory is a Path object
        if isinstance(directory, str):
            directory = Path(directory)
            
        # Set up default log callback if none provided
        if log_callback is None:
            def log_callback(msg: str):
                console.print(msg)
                
        # Set default styles and outputs if not provided
        if not styles:
            styles = ['apa']
        if not outputs:
            outputs = ['md']
            
        # Check if directory exists
        if not directory.exists():
            log_callback(f"[red]Directory not found: {directory}[/red]")
            return {"error": f"Directory not found: {directory}", "success": False}
            
        # Find relevant files
        files = [p for p in (directory.rglob("*") if recursive else directory.glob("*")) 
                if p.is_file() and not is_ignored_file(p) and p.suffix.lower() in SUPPORTED_EXTENSIONS]
                
        # Log the number of files found
        log_callback(f"[cyan]Found {len(files)} files to process for citations[/cyan]")
        
        if not files:
            log_callback(f"[yellow]No supported files found in {directory}[/yellow]")
            return {"files_processed": 0, "citations_found": 0, "success": True}
            
        # Process each file for citations
        all_citations = []
        processed_files = 0
        
        for file in files:
            try:
                text = get_file_text(file)
                if not text or not text.strip():
                    continue
                    
                citations = extract_citations_from_text(text, styles)
                processed_files += 1
                
                # Enrich DOIs if found
                for c in citations:
                    if c.get("type") == "doi" and "doi" in c:
                        enriched = extract_citations_from_doi(c["doi"], log_callback=log_callback, provider=provider)
                        if enriched:
                            c.update(enriched)
                            
                all_citations.extend(citations)
                
                # Log progress periodically
                if processed_files % 10 == 0:
                    log_callback(f"[dim]Processed {processed_files}/{len(files)} files, found {len(all_citations)} citations so far...[/dim]")
                    
            except Exception as e:
                log_callback(f"[red]Error processing {file}: {e}[/red]")
                
        # Deduplicate citations
        deduped = dedupe_citations(all_citations)
        log_callback(f"[green]Deduplicating {len(all_citations)} citations to {len(deduped)} unique citations[/green]")
        
        # Save the master citations JSON
        json_path = save_citations_json(deduped, directory)
        log_callback(f"[green]Saved master citations JSON to {json_path}[/green]")
        
        # Generate all requested output formats for each style
        output_files = {}
        for style in styles:
            style_outputs = generate_output(deduped, directory, outputs, style)
            output_files[style] = style_outputs
            for fmt, path in style_outputs.items():
                log_callback(f"[green]Generated {fmt.upper()} citations in {style.upper()} style: {path}[/green]")
                
        # Create summary of results
        result = {
            "files_processed": processed_files,
            "citations_found": len(all_citations),
            "unique_citations": len(deduped),
            "outputs": output_files,
            "json_path": str(json_path),
            "success": True
        }
        
        # Final success message
        log_callback(f"[green]Successfully processed {processed_files} files and found {len(deduped)} unique citations.[/green]")
        log_callback(f"[green]Outputs: {', '.join([f'{s}:{list(o.keys())}' for s, o in output_files.items()])}\n[/green]")
        
        return result
        
    except Exception as e:
        # Catch any exceptions and return error info
        error_msg = f"Error processing citations: {str(e)}"
        if log_callback:
            log_callback(f"[red]{error_msg}[/red]")
        return {"error": error_msg, "success": False}

# =============================================================================
# Process a single file or directory
# =============================================================================
def process_file_or_directory(path: Union[str, Path], recursive: bool = True, styles: List[str] = None, outputs: List[str] = None, log_callback: Optional[Any] = None, provider: str = None) -> Dict[str, Any]:
    """
    Process a file or directory for citations.
    
    Args:
        path: File or directory path to process
        recursive: Whether to process subdirectories recursively
        styles: Citation styles to extract (default: ['apa'])
        outputs: Output file formats (default: ['md'])
        log_callback: Optional callback for logging progress
        provider: AI provider to use (ollama, xai, gemini)
        
    Returns:
        Dictionary with paths to generated output files
    """
    path = Path(path)
    
    if not path.exists():
        if log_callback:
            log_callback(f"[red]Path not found: {path}[/red]")
        return {}
    
    if path.is_file():
        # For a single file, create a temporary directory with just this file
        import tempfile
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir) / path.name
            try:
                with open(path, 'rb') as src, open(temp_path, 'wb') as dst:
                    dst.write(src.read())
                result = process_directory(Path(temp_dir), False, styles, outputs, log_callback, provider)
                if log_callback:
                    log_callback(f"[green]Processed file: {path.name}[/green]")
                return result
            except Exception as e:
                if log_callback:
                    log_callback(f"[red]Error processing file {path}: {e}[/red]")
                return {}
    else:
        # For a directory, process it normally
        return process_directory(path, recursive, styles, outputs, log_callback, provider)

# =============================================================================
# CLI Entrypoint
# =============================================================================
def main():
    parser = argparse.ArgumentParser(description="Citation extraction and management tool.")
    parser.add_argument("directory", type=str, help="Directory to process")
    parser.add_argument("--recursive", action="store_true", help="Process subdirectories recursively")
    parser.add_argument("--styles", nargs="*", default=["apa"], choices=SUPPORTED_STYLES, help="Citation styles to extract (default: apa)")
    parser.add_argument("--outputs", nargs="*", default=["md"], choices=list(CITATION_FORMATS.keys()), help="Output file formats (default: md)")
    args = parser.parse_args()
    process_directory(Path(args.directory), args.recursive, args.styles, args.outputs)

if __name__ == "__main__":
    main()

# =============================================================================
# Accessibility and Documentation Notes
# =============================================================================
# - All output files are UTF-8 encoded and screen-reader friendly.
# - Markdown and plain text outputs use semantic formatting.
# - CSV output uses clear headers for import into reference managers.
# - BibTeX output is valid for BibTeX-compatible tools.
# - All errors are logged and surfaced to the user.
# - CLI help text is comprehensive.
# - See README for usage examples and accessibility notes.