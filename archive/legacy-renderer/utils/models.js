export const MODEL_GROUPS = {
    local: {
        label: 'Local Models (Ollama)',
        dynamic: true,
        models: [
            { value: 'llava:7b', label: 'LLaVA 7B (Default)' }
        ]
    },
    cloud: {
        label: 'Cloud Models',
        dynamic: false,
        models: [
            { value: 'meta-llama/Llama-3.2-11B-Vision-Instruct', label: 'Llama 3.2 11B Vision' },
            { value: 'stabilityai/stable-diffusion-xl-base-1.0', label: 'Stable Diffusion XL' }
        ]
    }
}; 