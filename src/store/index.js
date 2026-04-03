import { defineStore } from 'pinia';
import { ref, computed, onMounted } from 'vue';
import { logger } from '../utils/logger';

export const useStore = defineStore('main', () => {
  // State
  const results = ref([]);
  const feedMessages = ref([]);
  const nextId = ref(1);
  const selectedModel = ref(localStorage.getItem('selectedModel') || '');
  const availableModels = ref([]);
  const apiUrl = ref(localStorage.getItem('ollamaApiUrl') || 'http://localhost:11434');
  const connectionStatus = ref('unknown'); // 'unknown' | 'connected' | 'disconnected'
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

  // Vision capability cache (per session)
  const visionCapabilityCache = new Map();

  // Getters
  const nextResultId = computed(() => nextId.value++);
  const isDarkMode = computed(() => theme.value === 'dark');
  const visionModels = computed(() =>
    availableModels.value.filter(m => m.capabilities.includes('vision'))
  );

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

  // Connection Management
  async function setApiUrl(url) {
    const cleaned = url.replace(/\/+$/, ''); // strip trailing slashes
    apiUrl.value = cleaned;
    localStorage.setItem('ollamaApiUrl', cleaned);
    visionCapabilityCache.clear();
    connectionStatus.value = 'unknown';
    try {
      await detectModels();
    } catch {
      // detectModels already handles error messaging
    }
  }

  async function testConnection() {
    try {
      const response = await fetch(`${apiUrl.value}/api/tags`, {
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        connectionStatus.value = 'connected';
        return { ok: true };
      }
      connectionStatus.value = 'disconnected';
      return { ok: false, error: `HTTP ${response.status}` };
    } catch (error) {
      connectionStatus.value = 'disconnected';
      return { ok: false, error: error.message };
    }
  }

  // Vision capability detection via /api/show
  async function checkVisionCapability(modelName) {
    if (visionCapabilityCache.has(modelName)) {
      return visionCapabilityCache.get(modelName);
    }

    try {
      const response = await fetch(`${apiUrl.value}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
      });

      if (!response.ok) {
        // Fall back to name-based detection
        const result = isKnownVisionModel(modelName);
        visionCapabilityCache.set(modelName, result);
        return result;
      }

      const data = await response.json();
      // Vision models have projector_info in their metadata
      const hasProjector = data.projector_info !== undefined;
      // Some models declare it in their template
      const templateMentionsImages = data.template?.includes('image') || false;
      const isVision = hasProjector || templateMentionsImages;

      visionCapabilityCache.set(modelName, isVision);
      return isVision;
    } catch {
      // Fall back to name-based detection
      const result = isKnownVisionModel(modelName);
      visionCapabilityCache.set(modelName, result);
      return result;
    }
  }

  // Fallback name-based vision detection
  function isKnownVisionModel(modelName) {
    const name = modelName.toLowerCase();
    const visionPatterns = ['llava', 'bakllava', 'moondream', 'minicpm-v', 'llava-llama3'];
    return visionPatterns.some(p => name.includes(p));
  }

  // Model Management
  async function detectModels() {
    modelStatus.value.isDetecting = true;
    modelStatus.value.error = null;

    try {
      const response = await fetch(`${apiUrl.value}/api/tags`);
      if (!response.ok) {
        throw new Error('Failed to fetch models from Ollama');
      }

      connectionStatus.value = 'connected';
      const data = await response.json();
      const models = data.models || [];

      // Check vision capabilities for all models (in parallel, with fallback)
      const visionResults = await Promise.all(
        models.map(m => checkVisionCapability(m.name))
      );

      // Enhance model data with actual capabilities
      availableModels.value = models.map((model, i) => ({
        ...model,
        capabilities: visionResults[i] ? ['text', 'vision'] : ['text'],
        description: generateModelDescription(model.name, visionResults[i]),
        generation: determineModelGeneration(model.name),
        version: determineModelVersion(model.name),
        context_length: model.details?.parameter_size ? parseContextFromDetails(model) : determineContextLength(model.name)
      }));

      // Auto-select a vision model if current selection is invalid
      const currentModelExists = availableModels.value.some(m => m.name === selectedModel.value);

      if (!currentModelExists) {
        const firstVisionModel = availableModels.value.find(m => m.capabilities.includes('vision'));

        if (firstVisionModel) {
          selectedModel.value = firstVisionModel.name;
          localStorage.setItem('selectedModel', firstVisionModel.name);
        } else if (availableModels.value.length > 0) {
          selectedModel.value = availableModels.value[0].name;
          addFeedMessage('No vision-capable models found. Install a vision model (e.g., ollama pull llava).', 'warning');
        }
      }

      modelStatus.value.lastCheck = new Date();
      return availableModels.value;
    } catch (error) {
      connectionStatus.value = 'disconnected';
      modelStatus.value.error = error.message;
      addFeedMessage(`Failed to detect models: ${error.message}`, 'error');
      throw error;
    } finally {
      modelStatus.value.isDetecting = false;
    }
  }

  // Helper functions for model metadata
  function generateModelDescription(modelName, isVision) {
    const name = modelName.toLowerCase();
    if (isVision) {
      if (name.includes('llava-phi3')) return 'LLaVA-Phi3 vision-language model';
      if (name.includes('llava-llama3')) return 'LLaVA-Llama3 vision-language model';
      if (name.includes('llava')) return 'LLaVA vision-language model';
      if (name.includes('bakllava')) return 'BakLLaVA vision-language model';
      if (name.includes('moondream')) return 'Moondream vision-language model';
      if (name.includes('minicpm-v')) return 'MiniCPM-V vision-language model';
      return 'Vision-language model';
    }
    return 'Text-only model';
  }

  function determineModelGeneration(modelName) {
    const name = modelName.toLowerCase();
    if (name.includes('phi3') || name.includes('phi-3')) return 'phi3';
    if (name.includes('llama3') || name.includes('llama-3')) return 'llama3';
    if (name.includes('llava')) return 'llava';
    if (name.includes('bakllava')) return 'bakllava';
    if (name.includes('moondream')) return 'moondream';
    if (name.includes('minicpm')) return 'minicpm';
    return 'other';
  }

  function determineModelVersion(modelName) {
    const parts = modelName.split(':');
    return parts.length > 1 ? parts[1] : 'latest';
  }

  function determineContextLength(modelName) {
    const name = modelName.toLowerCase();
    if (name.includes('phi3')) return 2048;
    if (name.includes('llava')) return 4096;
    return 2048;
  }

  function parseContextFromDetails(model) {
    // Use model details if available from Ollama API
    if (model.details?.parameter_size) {
      const size = model.details.parameter_size.toLowerCase();
      if (size.includes('7b')) return 4096;
      if (size.includes('13b')) return 4096;
      if (size.includes('34b')) return 8192;
    }
    return determineContextLength(model.name);
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
      const modelExists = availableModels.value.some(m => m.name === modelName);
      if (!modelExists) {
        throw new Error(`Model ${modelName} not found`);
      }

      selectedModel.value = modelName;
      localStorage.setItem('selectedModel', modelName);

      // Load the model in the background
      await fetch(`${apiUrl.value}/api/generate`, {
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

  // Generate alt text with streaming support
  async function generateAltText(base64Image, onToken) {
    const useStreaming = typeof onToken === 'function';

    try {
      const response = await fetch(`${apiUrl.value}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel.value,
          prompt: customPrompt.value || 'Describe this image in detail, suitable for use as alt text.',
          images: [base64Image.split(',')[1]],
          stream: useStreaming,
          options: modelParams.value
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || `API error: ${response.status}`);
      }

      if (useStreaming) {
        // Parse NDJSON streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(Boolean);

          for (const line of lines) {
            try {
              const json = JSON.parse(line);
              if (json.response) {
                fullResponse += json.response;
                onToken(fullResponse);
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }

        return {
          response: fullResponse,
          modelUsed: selectedModel.value
        };
      } else {
        const data = await response.json();
        return {
          response: data.response,
          modelUsed: selectedModel.value
        };
      }
    } catch (error) {
      logger.error('Failed to generate alt text:', error);
      throw error;
    }
  }

  function updateFontSettings() {
    const html = document.documentElement;
    html.style.setProperty('--font-primary', selectedFont.value);
    html.style.setProperty('--base-font-size', `${baseFontSize.value}px`);
    document.body.style.setProperty('font-family', selectedFont.value, 'important');
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

  // Initialize
  onMounted(async () => {
    updateFontSettings();
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
    connectionStatus,
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
    visionModels,
    // Actions
    addResult,
    updateResult,
    removeResult,
    addFeedMessage,
    setApiUrl,
    testConnection,
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
