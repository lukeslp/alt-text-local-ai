import { logger } from './logger.js';
import { MODEL_GROUPS } from './models.js';
import { ThemeManager } from './theme.js';
import 'floating-vue/dist/style.css';
import FloatingVue from 'floating-vue';

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
                availableModels: [],
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
            
            // Initialize marked from global scope
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
            async checkModelAvailability() {
                try {
                    this.modelStatus.loading = true;
                    const endpoint = `${this.apiUrl}/api/tags`;
                    logger.debug('Sending GET request to endpoint', { endpoint });
                    const response = await fetch(endpoint);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    this.availableModels = data.models;
                    
                    // Check if LLaVA-Phi3 is available
                    const isLLaVAAvailable = data.models.some(m => 
                        m.name === 'llava-phi3' || m.name.startsWith('llava-phi3:')
                    );

                    if (!isLLaVAAvailable) {
                        this.addFeedMessage(
                            'LLaVA-Phi3 not detected. Please run: ollama pull llava-phi3',
                            'warning'
                        );
                    }

                    // If using custom model, check its availability
                    if (this.showAdvancedModel && this.customModel) {
                        const isCustomModelAvailable = data.models.some(m => 
                            m.name === this.customModel || m.name.startsWith(`${this.customModel}:`)
                        );

                        if (!isCustomModelAvailable) {
                            this.addFeedMessage(
                                `Model ${this.customModel} not detected. Please run: ollama pull ${this.customModel}`,
                                'warning'
                            );
                        }
                    }

                    this.modelStatus.error = null;
                    this.modelStatus.lastCheck = new Date();
                    logger.info('Ollama connection successful');
                    return true;
                } catch (error) {
                    this.modelStatus.error = error.message;
                    logger.error('Failed to connect to Ollama:', error);
                    this.addFeedMessage('Failed to connect to Ollama. Please ensure it is running.', 'error');
                    return false;
                } finally {
                    this.modelStatus.loading = false;
                }
            },
            async generateAltText(base64Image, context = '') {
                logger.debug('Generating alt text');
                
                const base64Data = base64Image.split(',')[1];
                try {
                    const defaultPrompt = `You're an Alt Text Specialist, dedicated to creating precise and accessible alt text for images on the web for people with visual impairments, especially art and memes. Your primary goal is to ensure visually impaired individuals can engage with imagery by providing concise, accurate descriptions.\n\nPlease describe this image in a clear, natural way. Focus on essential visual elements and any visible text. Avoid prepending with phrases like 'an image of' or 'a photo of'.\n\n${context}`;
                    
                    const prompt = this.customPrompt ? `${this.customPrompt}\n\n${context}` : defaultPrompt;

                    const endpoint = `${this.apiUrl}/api/generate`;
                    const payload = {
                        model: this.customModel || 'llava-phi3',
                        prompt: prompt,
                        images: [base64Data],
                        stream: false
                    };
                    logger.debug('Sending POST request to endpoint with payload', { endpoint, payload });
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => null);
                        throw new Error(errorData?.error || `API error: ${response.status} ${response.statusText}`);
                    }

                    const data = await response.json();
                    return { 
                        response: data.response,
                        modelUsed: this.customModel || 'llava-phi3'
                    };
                } catch (error) {
                    logger.error('Ollama API error:', error);
                    throw new Error(`Ollama API error: ${error.message}`);
                }
            },
            async analyzeImageInDetail(base64Image) {
                try {
                    // Step 1: Initial overall analysis with default/custom prompt
                    this.currentQuadrant = -1;
                    this.processingStates.analyze.status = 'Analyzing full image...';
                    this.processingStates.analyze.progress = 20;
                    
                    const defaultPrompt = this.customPrompt || `You're an Alt Text Specialist, dedicated to creating precise and accessible alt text for images on the web for people with visual impairments, especially art and memes. Your primary goal is to ensure visually impaired individuals can engage with imagery by providing concise, accurate descriptions.`;
                    
                    const overallResult = await this.generateAltText(
                        base64Image, 
                        `${defaultPrompt}\n\nProvide a high-level overview of the entire image, focusing on the main subject and overall composition.`
                    );
                    
                    // Step 2: Split and analyze quadrants
                    this.processingStates.analyze.status = 'Analyzing image sections...';
                    this.processingStates.analyze.progress = 30;
                    const quadrants = await this.splitImageIntoQuadrants(base64Image);
                    
                    const quadrantDescriptions = [];
                    const quadrantLabels = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
                    
                    for (let i = 0; i < quadrants.length; i++) {
                        this.currentQuadrant = i;
                        this.processingStates.analyze.status = `Analyzing ${quadrantLabels[i]} section...`;
                        this.processingStates.analyze.progress = 30 + ((i + 1) * 15);
                        
                        const quadResult = await this.generateAltText(
                            quadrants[i],
                            `Based on this context: "${overallResult.response}"\n\nNow, focus on describing the specific details visible in the ${quadrantLabels[i]} section of the image. What additional details or elements do you notice in this specific area?`
                        );
                        
                        quadrantDescriptions.push(quadResult.response);
                    }
                    
                    // Step 3: Generate final comprehensive description
                    this.currentQuadrant = -2;
                    this.processingStates.analyze.status = 'Generating final description...';
                    this.processingStates.analyze.progress = 90;
                    
                    const combinedDescription = await this.generateAltText(
                        base64Image,
                        `${defaultPrompt}\n\nBased on these detailed observations:\n\nOverall context: ${overallResult.response}\n\nDetailed sections:\n${
                            quadrantDescriptions.map((desc, i) => `${quadrantLabels[i]}: ${desc}`).join('\n')
                        }\n\nPlease provide a single, comprehensive description that combines these observations into clear, cohesive alt text. Focus on creating a natural flow that maintains proper context between the different sections while staying concise and informative.`
                    );
                    
                    this.processingStates.analyze.progress = 100;
                    this.processingStates.analyze.status = 'Analysis complete';
                    this.currentQuadrant = -3;
                    
                    return {
                        response: combinedDescription.response,
                        modelUsed: combinedDescription.modelUsed,
                        analysis: {
                            overall: overallResult.response,
                            quadrants: quadrantDescriptions
                        }
                    };
                } catch (error) {
                    // Reset states on error
                    this.currentQuadrant = -3;
                    this.processingStates.analyze.status = 'Analysis failed';
                    this.processingStates.analyze.progress = 0;
                    throw error;
                }
            },
            async splitImageIntoQuadrants(base64Image) {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        const quadrants = [];
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        const quadrantWidth = Math.floor(img.width / 2);
                        const quadrantHeight = Math.floor(img.height / 2);
                        
                        // Create separate canvases for each quadrant
                        for (let row = 0; row < 2; row++) {
                            for (let col = 0; col < 2; col++) {
                                const quadrantCanvas = document.createElement('canvas');
                                const quadrantCtx = quadrantCanvas.getContext('2d');
                                
                                quadrantCanvas.width = quadrantWidth;
                                quadrantCanvas.height = quadrantHeight;
                                
                                // Draw the specific quadrant
                                quadrantCtx.drawImage(
                                    img,
                                    col * quadrantWidth,
                                    row * quadrantHeight,
                                    quadrantWidth,
                                    quadrantHeight,
                                    0,
                                    0,
                                    quadrantWidth,
                                    quadrantHeight
                                );
                                
                                quadrants.push(quadrantCanvas.toDataURL('image/jpeg', 0.9));
                            }
                        }
                        
                        resolve(quadrants);
                    };
                    img.src = base64Image;
                });
            },
            initializeDropzone() {
                if (this.dropzone) {
                    this.dropzone.destroy();
                }

                this.dropzone = new Dropzone("#imageUpload", {
                    url: "#",
                    autoProcessQueue: false,
                    acceptedFiles: "image/*",
                    addRemoveLinks: true,
                    maxFiles: 1,
                    maxFilesize: 5,
                    dictDefaultMessage: "Drop images here, click to upload, or paste from clipboard",
                    init: function() {
                        this.on("addedfile", file => {
                            if (this.files.length > 1) {
                                this.removeFile(this.files[0]);
                            }
                        });
                    }
                });
                
                this.dropzone.on("addedfile", this.processImage);
                
                this.dropzone.on("error", (file, errorMessage) => {
                    logger.error('Dropzone error:', errorMessage);
                    this.addFeedMessage(errorMessage, 'error');
                    this.dropzone.removeFile(file);
                });

                // Add clipboard paste support
                document.addEventListener('paste', (event) => {
                    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
                    
                    for (const item of items) {
                        if (item.type.indexOf('image') === 0) {
                            event.preventDefault();
                            const file = item.getAsFile();
                            
                            // Add the file to dropzone
                            this.dropzone.addFile(file);
                            
                            // Add feedback message
                            this.addFeedMessage('Image pasted from clipboard', 'success');
                            break;
                        }
                    }
                });
            },
            async processImage(file) {
                const result = {
                    id: this.nextId++,
                    file,
                    image: null,
                    altText: null,
                    error: null,
                    processing: true,
                    analysis: null
                };
                
                this.results.unshift(result);

                try {
                    // Resize image
                    this.processingStates.resize.status = 'Resizing image...';
                    this.processingStates.resize.progress = 50;
                    const resizedImage = await this.resizeImage(file);
                    this.processingStates.resize.progress = 100;
                    
                    // Store resized image
                    result.image = resizedImage;
                    
                    // Generate alt text
                    this.processingStates.generate.status = 'Generating description...';
                    this.processingStates.generate.progress = 50;
                    
                    let altTextResult;
                    if (this.detailedAnalysis) {
                        altTextResult = await this.analyzeImageInDetail(resizedImage);
                        result.analysis = altTextResult.analysis;
                    } else {
                        altTextResult = await this.generateAltText(resizedImage);
                    }
                    
                    result.altText = altTextResult.response;
                    result.modelUsed = altTextResult.modelUsed;
                    result.processing = false;
                    this.processingStates.generate.progress = 100;

                    // Success
                    this.addFeedMessage('Alt text generated successfully', 'success');

                } catch (error) {
                    logger.error('Processing error:', error);
                    result.error = error.message;
                    result.processing = false;
                    this.addFeedMessage(error.message, 'error');
                } finally {
                    // Reset processing states
                    Object.keys(this.processingStates).forEach(key => {
                        this.processingStates[key].progress = 0;
                        this.processingStates[key].status = '';
                        this.processingStates[key].phase = 'idle';
                    });
                }
            },
            async resizeImage(file) {
                return new Promise((resolve, reject) => {
                    try {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const img = new Image();
                            img.onload = () => {
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
                                ctx.drawImage(img, 0, 0, width, height);

                                resolve(canvas.toDataURL('image/jpeg', 0.9));
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
                        reject(error);
                    }
                });
            },
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
            async copyAltText(text) {
                try {
                    await navigator.clipboard.writeText(text);
                    this.addFeedMessage('Alt text copied to clipboard', 'success');
                } catch (err) {
                    logger.error('Error copying to clipboard:', err);
                    this.addFeedMessage('Failed to copy alt text', 'error');
                }
            },
            initializeTheme() {
                const savedMode = localStorage.getItem('contrast-mode');
                if (savedMode) {
                    this.contrastMode = savedMode;
                } else {
                    // Default to light/dark based on system preference
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    this.contrastMode = prefersDark ? 'dark' : 'normal';
                }
                this.applyTheme(this.contrastMode);
            },
            toggleTheme() {
                this.contrastMode = this.contrastMode === 'dark' ? 'normal' : 'dark';
                this.applyTheme(this.contrastMode);
            },
            applyTheme(mode) {
                // Remove dark class
                document.documentElement.classList.remove('dark');
                
                // Apply dark theme if selected
                if (mode === 'dark') {
                    document.documentElement.classList.add('dark');
                }
                
                // Store preference
                localStorage.setItem('contrast-mode', mode);
            },
            toggleDetailedAnalysis() {
                this.detailedAnalysis = !this.detailedAnalysis;
                localStorage.setItem('detailed-analysis', this.detailedAnalysis.toString());
            },
            initializeFontSettings() {
                // Get saved font preference or use default
                const savedFont = localStorage.getItem('preferred-font');
                this.selectedFont = savedFont || 'playfair';
                
                // Get saved font size or use default
                const savedSize = localStorage.getItem('font-size');
                if (savedSize) {
                    this.baseFontSize = parseInt(savedSize);
                }
                
                // Initial application of settings
                this.applyFontSettings();
            },
            updateFontSettings() {
                this.applyFontSettings();
                
                // Store preferences
                localStorage.setItem('preferred-font', this.selectedFont);
                localStorage.setItem('font-size', this.baseFontSize.toString());
            },
            applyFontSettings() {
                // Update font family
                document.body.setAttribute('data-font', this.selectedFont);
                
                // Update font size using CSS custom property
                document.documentElement.style.setProperty('--base-font-size', `${this.baseFontSize}px`);
            },
            increaseFontSize() {
                if (this.baseFontSize < this.maxFontSize) {
                    this.baseFontSize += 2;
                    this.updateFontSettings();
                }
            },
            decreaseFontSize() {
                if (this.baseFontSize > this.minFontSize) {
                    this.baseFontSize -= 2;
                    this.updateFontSettings();
                }
            },
            formatSize(size) {
                if (!size || isNaN(size)) return '';
                const units = ['B', 'KB', 'MB', 'GB', 'TB'];
                let i = 0;
                let val = size;
                while (val >= 1024 && i < units.length - 1) {
                    val /= 1024;
                    i++;
                }
                return val.toFixed(2) + ' ' + units[i];
            }
        },
        watch: {
            selectedFont: {
                handler(newFont) {
                    this.updateFontSettings();
                },
                immediate: true
            },
            contrastMode: {
                handler(newMode) {
                    this.applyTheme(newMode);
                },
                immediate: true
            }
        }
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

    app.config.globalProperties.formatSize = function(size) {
        if (!size || isNaN(size)) return '';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let i = 0;
        let val = size;
        while (val >= 1024 && i < units.length - 1) {
            val /= 1024;
            i++;
        }
        return val.toFixed(2) + ' ' + units[i];
    };

    return app;
}; 