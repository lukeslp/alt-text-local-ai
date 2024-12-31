import { HfInference } from '@huggingface/inference';
import { logger } from './utils/logger.js';
import { MODEL_GROUPS } from './utils/models.js';
import CollapsiblePanel from './components/CollapsiblePanel.vue';
import AltTextEditor from './components/AltTextEditor.vue';
import OpenAI from 'openai';
import { ThemeManager } from './utils/theme.js';
import { TransitionGroup } from 'vue';

// Hugging Face client setup
const HF_TOKEN = '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';
const HF_API_URL = 'https://api-inference.huggingface.co/models';

// Initialize Hugging Face client
let hfClient;
try {
    // Try ESM import first
    hfClient = new HfInference(HF_TOKEN);
} catch (error) {
    // Fall back to global UMD version
    if (window.HfInference) {
        hfClient = new window.HfInference(HF_TOKEN);
    } else {
        console.error('Failed to load Hugging Face Inference client:', error);
        throw new Error('Hugging Face Inference client not available');
    }
}

// Global error handler
const errorHandler = (err, instance, info) => {
    logger.error('Global error:', { error: err, info });
    if (instance?.$root?.$data) {
        instance.$root.addFeedMessage(`An error occurred: ${err.message}`, 'error');
    }
};

export const createApp = () => {
    const app = Vue.createApp({
        // ... rest of the app code ...
    });

    // Add global error handler
    app.config.errorHandler = errorHandler;

    return app;
}; 