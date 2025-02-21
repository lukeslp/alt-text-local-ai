import { HfInference } from '@huggingface/inference';
import { logger } from './utils/logger.js';
import { MODEL_GROUPS } from './utils/models.js';
import CollapsiblePanel from './components/CollapsiblePanel.vue';
import AltTextEditor from './components/AltTextEditor.vue';
import OpenAI from 'openai';
import { ThemeManager } from './utils/theme.js';
import { TransitionGroup } from 'vue';
import 'floating-vue/dist/style.css';
import FloatingVue from 'floating-vue';

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
    logger.error('Global error:', err);
    if (instance?.$root) {
        instance.$root.addFeedMessage(`An error occurred: ${err.message}`, 'error');
    }
};

export const createApp = () => {
    const app = Vue.createApp({
        data() {
            return {
                apiUrl: 'http://localhost:11434',
                selectedModel: 'llava-phi3',
                showAdvancedModel: false,
                customModel: '',
                customPrompt: '',
                showAdvancedSettings: false,
                feedMessages: [],
                results: [],
                dropzone: null,
                nextId: 1,
                modelStatus: {
                    loading: false,
                    error: null,
                    lastCheck: null
                },
                editingResult: null,
                contrastMode: 'normal',
                selectedFont: 'playfair',
                baseFontSize: 16,
                minFontSize: 12,
                maxFontSize: 24,
                detailedAnalysis: true,
                currentQuadrant: -1,
                marked: null,
                tooltips: {
                    dropzone: 'Drag and drop an image here, click to upload, or paste from clipboard',
                    modelSelect: 'Choose the AI model for image analysis',
                    advancedModel: 'Configure custom model settings',
                    advancedSettings: 'Configure advanced model and prompt settings',
                    customModel: 'Override the default LLaVA-Phi3 model',
                    customPrompt: 'Customize the instructions given to the AI for generating alt text',
                    detailedAnalysis: 'Enable in-depth analysis of image quadrants',
                    themeToggle: 'Switch between light and dark mode',
                    fontSelect: 'Change the display font',
                    fontSize: 'Adjust text size',
                    copyButton: 'Copy alt text to clipboard',
                    regenerate: 'Generate a new description',
                    edit: 'Edit the generated description'
                },
                processingStates: {
                    resize: { status: '', progress: 0, phase: 'idle' },
                    upload: { status: '', progress: 0, phase: 'idle' },
                    generate: { status: '', progress: 0, phase: 'idle' },
                    analyze: { status: '', progress: 0, phase: 'idle' }
                }
            }
        },
        mounted() {
            logger.info('App mounted, initializing components...');
            this.initializeDropzone();
            this.initializeTheme();
            this.initializeFontSettings();
            this.checkModelAvailability();
            
            if (window.marked) {
                this.marked = window.marked;
                this.marked.setOptions({
                    breaks: true,
                    gfm: true,
                    headerIds: false,
                    mangle: false
                });
            } else {
                logger.warn('Marked library not loaded');
            }

            const savedAnalysisMode = localStorage.getItem('detailed-analysis');
            if (savedAnalysisMode !== null) {
                this.detailedAnalysis = savedAnalysisMode === 'true';
            }
        },
        methods: {
            addFeedMessage(text, type = 'info') {
                this.feedMessages.unshift({
                    id: Date.now(),
                    text,
                    type,
                    timestamp: new Date().toLocaleTimeString()
                });
                
                if (this.feedMessages.length > 50) {
                    this.feedMessages.pop();
                }
            },
            async resizeImage(file) {
                return new Promise((resolve, reject) => {
                    try {
                        const reader = new FileReader();
                        
                        reader.onload = (e) => {
                            const img = new Image();
                            
                            img.onload = () => {
                                try {
                                    const canvas = document.createElement('canvas');
                                    const ctx = canvas.getContext('2d');

                                    let width = img.width;
                                    let height = img.height;
                                    const maxSize = 336;

                                    if (width > height && width > maxSize) {
                                        height = (height * maxSize) / width;
                                        width = maxSize;
                                    } else if (height > maxSize) {
                                        width = (width * maxSize) / height;
                                        height = maxSize;
                                    }

                                    canvas.width = width;
                                    canvas.height = height;
                                    
                                    // Fill with white background
                                    ctx.fillStyle = '#FFFFFF';
                                    ctx.fillRect(0, 0, width, height);
                                    
                                    ctx.drawImage(img, 0, 0, width, height);
                                    resolve(canvas.toDataURL('image/jpeg', 0.9));
                                } catch (error) {
                                    reject(new Error(`Failed to process image: ${error.message}`));
                                }
                            };
                            
                            img.onerror = () => {
                                reject(new Error('Failed to load image'));
                            };
                            
                            img.src = e.target.result;
                        };
                        
                        reader.onerror = () => {
                            reject(new Error('Failed to read file'));
                        };
                        
                        reader.readAsDataURL(file);
                    } catch (error) {
                        reject(new Error(`Failed to process file: ${error.message}`));
                    }
                });
            },
            // ... rest of the existing methods ...
        }
    });

    // Configure error handling
    app.config.errorHandler = errorHandler;
    window.addEventListener('unhandledrejection', (event) => {
        errorHandler(event.reason);
    });

    // Initialize FloatingVue for tooltips
    app.use(FloatingVue, {
        themes: {
            'tooltip': {
                delay: {
                    show: 300,
                    hide: 0
                },
                placement: 'top',
                distance: 8
            }
        }
    });

    return app;
}; 