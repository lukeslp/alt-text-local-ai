export const HF_TOKEN = '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';
export const HF_API_URL = 'https://api-inference.huggingface.co/models';

export const MODEL_GROUPS = {
  local: {
    label: 'Local Models',
    models: [
      { value: 'llava-phi3', label: 'LLaVA-Phi3' },
      { value: 'llava', label: 'LLaVA' },
      { value: 'bakllava', label: 'BakLLaVA' }
    ]
  },
  huggingface: {
    label: 'Hugging Face Models',
    models: [
      { value: 'meta-llama/Llama-3.2-11B-Vision-Instruct', label: 'Llama 3.2 Vision' },
      { value: 'stabilityai/stable-diffusion-xl-base-1.0', label: 'SDXL 1.0' }
    ]
  }
}; 