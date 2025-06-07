// DEPRECATED – archived by Codex 2025-06-07. Safe to delete after 90 days.
export const MODEL_GROUPS = {
    local: {
        label: "Local Models",
        models: [
            { value: "llava-phi3", label: "LLaVA Phi3 (Default)" },
            { value: "coolhand/altllama:13b", label: "Altllama 13b" }
        ],
        dynamic: true  // Indicates this group should be populated with available models
    }
}; 