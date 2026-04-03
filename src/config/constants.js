export const HF_TOKEN = import.meta.env.VITE_HF_TOKEN || '';
export const HF_API_URL = 'https://api-inference.huggingface.co/models';

// Known vision models for fallback detection when /api/show is unavailable
export const KNOWN_VISION_MODELS = [
  'llava',
  'llava-phi3',
  'llava-llama3',
  'bakllava',
  'moondream',
  'minicpm-v'
];

// Default Ollama connection
export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
