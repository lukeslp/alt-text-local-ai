import { defineStore } from 'pinia';
import { ref, computed, onMounted } from 'vue';
import { HF_TOKEN, HF_API_URL } from '../config/constants';
import OpenAI from 'openai';
import { logger } from '../utils/logger';

/**
 * Pinia store managing image results and model selection.
 * @type {import('pinia').Store}
 */
export const useStore = defineStore('main', () => {
  // State
  const results = ref([]);
  const feedMessages = ref([]);
  const nextId = ref(1);
  const selectedModel = ref('llava-phi3');
  const availableModels = ref([]);
  const apiUrl = ref('http://localhost:11434');
  const modelStatus = ref({
    loading: false,
    error: null,
    lastCheck: null,
    isDetecting: false
  });
  const modelParams = ref({
    temperature: 0.7,
    num_ctx: 4096,
    top_p: 0.8
  });
  const customPrompt = ref('');
  const detailedAnalysis = ref(true);
  const theme = ref(
    localStorage.theme === 'dark' || 
    (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ? 'dark'
      : 'light'
  );

  // Font settings
  const selectedFont = ref(localStorage.getItem('font-family') || 'playfair');
  const baseFontSize = ref(parseInt(localStorage.getItem('base-font-size')) || 16);
  const showSettings = ref(false);
  const showStatusFeed = ref(false);

  // Getters
  const nextResultId = computed(() => nextId.value++);
  const isDarkMode = computed(() => theme.value === 'dark');

  // Actions
  function addResult(result) {
    results.value.unshift(result);
  }

  function updateResult(result) {
    const index = results.value.findIndex(r => r.id === result.id);
    if (index !== -1) {
      results.value[index] = result;
    }
  }

  function removeResult(resultId) {
    results.value = results.value.filter(r => r.id !== resultId);
  }

  function addFeedMessage(message, type = 'info') {
    feedMessages.value.unshift({
      id: Date.now(),
      text: message,
      type,
      timestamp: new Date().toLocaleTimeString()
    });

    if (feedMessages.value.length > 50) {
      feedMessages.value.pop();
    }
  }

  // Model Management
  async function detectModels() {
    modelStatus.value.isDetecting = true;
    modelStatus.value.error = null;

    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) {
        throw new Error('Failed to fetch models from Ollama');
      }

      const data = await response.json();
      const models = data.models || [];

      // Enhance model data with additional information
      availableModels.value = models.map(model => ({
        ...model,
        capabilities: determineModelCapabilities(model.name),
        description: generateModelDescription(model.name),
        generation: determineModelGeneration(model.name),
        version: determineModelVersion(model.name),
        context_length: determineContextLength(model.name)
      }));

      // Check if current model exists in available models
      const currentModelExists = availableModels.value.some(m => m.name === selectedModel.value);
      
      if (!currentModelExists) {
        const visionModels = ['llava', 'llava-phi3', 'bakllava'];
        const firstAvailableVisionModel = availableModels.value.find(m => 
          visionModels.some(vm => m.name.toLowerCase().includes(vm))
        );
        
        if (firstAvailableVisionModel) {
          selectedModel.value = firstAvailableVisionModel.name;
        } else if (availableModels.value.length > 0) {
          selectedModel.value = availableModels.value[0].name;
          addFeedMessage('No vision-capable models found. Please install llava, llava-phi3, or bakllava.', 'warning');
        }
      }

      modelStatus.value.lastCheck = new Date();
      return availableModels.value;
    } catch (error) {
      modelStatus.value.error = error.message;
      addFeedMessage(`Failed to detect models: ${error.message}`, 'error');
      throw error;
    } finally {
      modelStatus.value.isDetecting = false;
    }
  }

  // Helper functions for model metadata
  function determineModelCapabilities(modelName) {
    const capabilities = ['text'];
    const name = modelName.toLowerCase();
    
    if (name.includes('llava') || name.includes('bakllava')) {
      capabilities.push('vision');
    }
    
    return capabilities;
  }

  function generateModelDescription(modelName) {
    const name = modelName.toLowerCase();
    let description = 'Ollama model';
    
    if (name.includes('llava-phi3')) {
      description = 'LLaVA-Phi3 vision-language model';
    } else if (name.includes('llava')) {
      description = 'LLaVA vision-language model';
    } else if (name.includes('bakllava')) {
      description = 'BakLLaVA vision-language model';
    }
    
    return description;
  }

  function determineModelGeneration(modelName) {
    const name = modelName.toLowerCase();
    if (name.includes('phi3')) return 'phi3';
    if (name.includes('llava')) return 'llava';
    if (name.includes('bakllava')) return 'bakllava';
    return 'other';
  }

  function determineModelVersion(modelName) {
    const parts = modelName.split(':');
    return parts.length > 1 ? parts[1] : 'latest';
  }

  function determineContextLength(modelName) {
    // Default context lengths - these could be made more accurate
    const name = modelName.toLowerCase();
    if (name.includes('phi3')) return 2048;
    if (name.includes('llava')) return 4096;
    return 2048;
  }

  // Model filtering and sorting functions
  function filterModelsByGeneration(models, generation) {
    if (!generation) return models;
    return models.filter(m => m.generation === generation);
  }

  function filterModelsByCapability(models, capability) {
    if (!capability) return models;
    return models.filter(m => m.capabilities.includes(capability));
  }

  function sortModels(models, sortBy = 'name', reverse = false) {
    const sorted = [...models].sort((a, b) => {
      switch (sortBy) {
        case 'context_length':
          return a.context_length - b.context_length;
        case 'capabilities':
          return b.capabilities.length - a.capabilities.length;
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return reverse ? sorted.reverse() : sorted;
  }

  function getPagedModels(models, page = 1, pageSize = 5) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return models.slice(start, end);
  }

  async function setModel(modelName) {
    try {
      // Validate model exists
      const modelExists = availableModels.value.some(m => m.name === modelName);
      if (!modelExists) {
        throw new Error(`Model ${modelName} not found`);
      }

      selectedModel.value = modelName;
      
      // Load the model in the background
      await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: '' // Empty prompt just loads the model
        })
      });

      addFeedMessage(`Switched to model: ${modelName}`, 'success');
    } catch (error) {
      addFeedMessage(`Failed to set model: ${error.message}`, 'error');
      throw error;
    }
  }

  // Modified generateAltText to use simplified parameters
  async function generateAltText(base64Image) {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel.value,
          prompt: customPrompt.value || 'Describe this image in detail, suitable for use as alt text.',
          images: [base64Image.split(',')[1]],
          stream: false,
          options: modelParams.value
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        response: data.response,
        modelUsed: selectedModel.value
      };
    } catch (error) {
      logger.error('Failed to generate alt text:', error);
      throw error;
    }
  }

  function updateFontSettings() {
    const html = document.documentElement;
    
    // Apply font family globally
    html.style.setProperty('--font-primary', selectedFont.value);
    
    // Apply font size globally
    html.style.setProperty('--base-font-size', `${baseFontSize.value}px`);
    
    // Force font inheritance throughout the app
    document.body.style.setProperty('font-family', selectedFont.value, 'important');
    
    // Save settings
    localStorage.setItem('font-family', selectedFont.value);
    localStorage.setItem('base-font-size', baseFontSize.value.toString());
  }

  function setFont(newFont) {
    selectedFont.value = newFont;
    localStorage.setItem('font-family', newFont);
    document.documentElement.setAttribute('data-font', newFont);
    updateFontSettings();
  }

  function setFontSize(newSize) {
    baseFontSize.value = newSize;
    localStorage.setItem('base-font-size', newSize.toString());
    document.documentElement.style.setProperty('--base-font-size', `${newSize}px`);
    updateFontSettings();
  }

  function increaseFontSize() {
    if (baseFontSize.value < 24) {
      setFontSize(baseFontSize.value + 2);
    }
  }

  function decreaseFontSize() {
    if (baseFontSize.value > 12) {
      setFontSize(baseFontSize.value - 2);
    }
  }

  function toggleSettings() {
    showSettings.value = !showSettings.value;
  }

  function toggleStatusFeed() {
    showStatusFeed.value = !showStatusFeed.value;
  }

  function setTheme(newTheme) {
    theme.value = newTheme;
    localStorage.theme = newTheme;
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  }

  // Initialize font settings
  onMounted(() => {
    updateFontSettings();
  });

  // Initialize
  onMounted(async () => {
    try {
      await detectModels();
    } catch (error) {
      logger.error('Failed to initialize models:', error);
    }
  });

  return {
    // State
    results,
    feedMessages,
    selectedModel,
    apiUrl,
    modelStatus,
    modelParams,
    customPrompt,
    detailedAnalysis,
    theme,
    selectedFont,
    baseFontSize,
    showSettings,
    showStatusFeed,
    availableModels,
    // Getters
    nextResultId,
    isDarkMode,
    // Actions
    addResult,
    updateResult,
    removeResult,
    addFeedMessage,
    detectModels,
    setModel,
    generateAltText,
    setFont,
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
    toggleSettings,
    toggleStatusFeed,
    setTheme,
    updateFontSettings,
    // Model management functions
    filterModelsByGeneration,
    filterModelsByCapability,
    sortModels,
    getPagedModels
  };
}); 