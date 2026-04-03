import { useStore } from '../store';

export function useExport() {
  const store = useStore();

  function getCompletedResults() {
    return store.results.filter(r => r.altText && !r.processing);
  }

  function exportAsJSON() {
    const data = getCompletedResults().map(r => ({
      altText: r.altText,
      model: r.modelUsed || store.selectedModel
    }));
    return JSON.stringify(data, null, 2);
  }

  function exportAsCSV() {
    const results = getCompletedResults();
    const header = 'alt_text,model';
    const rows = results.map(r => {
      const text = `"${(r.altText || '').replace(/"/g, '""')}"`;
      const model = r.modelUsed || store.selectedModel;
      return `${text},${model}`;
    });
    return [header, ...rows].join('\n');
  }

  function exportAsHTML() {
    const results = getCompletedResults();
    return results
      .map(r => `<img src="" alt="${(r.altText || '').replace(/"/g, '&quot;')}" />`)
      .join('\n');
  }

  async function copyAllToClipboard() {
    const texts = getCompletedResults().map(r => r.altText).join('\n\n');
    await navigator.clipboard.writeText(texts);
    store.addFeedMessage('All alt text copied to clipboard', 'success');
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadJSON() {
    downloadFile(exportAsJSON(), 'alt-text-export.json', 'application/json');
  }

  function downloadCSV() {
    downloadFile(exportAsCSV(), 'alt-text-export.csv', 'text/csv');
  }

  function downloadHTML() {
    downloadFile(exportAsHTML(), 'alt-text-export.html', 'text/html');
  }

  return {
    exportAsJSON,
    exportAsCSV,
    exportAsHTML,
    copyAllToClipboard,
    downloadJSON,
    downloadCSV,
    downloadHTML,
    getCompletedResults
  };
}
