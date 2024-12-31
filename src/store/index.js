import { defineStore } from 'pinia';
import { ref, computed, onMounted } from 'vue';
import { HF_TOKEN, HF_API_URL } from '../config/constants';
import OpenAI from 'openai';

export const useStore = defineStore('main', () => {
  // State
  const results = ref([]);
  const feedMessages = ref([]);
  const nextId = ref(1);
  const selectedModel = ref('llava-phi3');
  const selectedProvider = ref('local');
  const apiUrl = ref('http://localhost:11434');
  const modelStatus = ref({
    loading: false,
    error: null,
    lastCheck: null
  });

  // Font settings
  const selectedFont = ref(localStorage.getItem('font-family') || 'Inter');
  const baseFontSize = ref(parseInt(localStorage.getItem('font-size')) || 16);
  const showSettings = ref(false);
  const showStatusFeed = ref(false);

  // Getters
  const nextResultId = computed(() => nextId.value++);

  // Actions
  function addResult(result) {
    results.value = [result, ...results.value];
  }

  function updateResult(result) {
    const index = results.value.findIndex(r => r.id === result.id);
    if (index !== -1) {
      results.value[index] = result;
      results.value = [...results.value];
    }
  }

  function removeResult(resultId) {
    results.value = results.value.filter(r => r.id !== resultId);
  }

  function addFeedMessage(text, type = 'info') {
    feedMessages.value.unshift({
      id: Date.now(),
      text,
      type,
      timestamp: new Date().toLocaleTimeString()
    });

    if (feedMessages.value.length > 50) {
      feedMessages.value.pop();
    }
  }

  async function generateAltText(base64Image) {
    if (selectedProvider.value === 'huggingface') {
      return generateHuggingFaceAltText(base64Image);
    } else {
      return generateOllamaAltText(base64Image);
    }
  }

  async function generateHuggingFaceAltText(base64Image) {
    try {
      const openai = new OpenAI({
        baseURL: "https://sbiswhfbsy74mre5.us-east4.gcp.endpoints.huggingface.cloud/v1/",
        apiKey: HF_TOKEN,
        dangerouslyAllowBrowser: true
      });

      const stream = await openai.chat.completions.create({
        model: "tgi",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: base64Image
                }
              },
              {
                type: "text",
                text: "Describe this image in one sentence, suitable for use as alt text. Be concise and natural."
              }
            ]
          }
        ],
        max_tokens: 150,
        stream: true
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;
      }

      return { response: cleanDescription(fullResponse) };
    } catch (error) {
      console.error('Hugging Face API error:', error);
      if (error.message.includes('too large to be loaded automatically')) {
        throw new Error('This model requires an Inference Endpoint. Please configure an endpoint URL or use a different model.');
      }
      throw new Error(`Hugging Face API error: ${error.message}`);
    }
  }

  async function generateOllamaAltText(base64Image) {
    const base64Data = base64Image.split(',')[1];
    try {
      const response = await fetch(`${apiUrl.value}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel.value,
          prompt: "Write a concise description for this image suitable for use as alt text for social media. Include key visual elements, actions, and context, but keep it natural and engaging. Avoid starting with phrases like 'an image of' or 'a photo of'.",
          images: [base64Data],
          stream: false,
          options: {
            temperature: 0.3
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Ollama API error:', error);
      throw new Error(`Ollama API error: ${error.message}`);
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
    localStorage.setItem('font-size', baseFontSize.value.toString());
  }

  function setFont(font) {
    selectedFont.value = font;
    updateFontSettings();
  }

  function setFontSize(size) {
    if (size >= 12 && size <= 24) {
      baseFontSize.value = size;
      updateFontSettings();
    }
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

  // Initialize font settings
  onMounted(() => {
    updateFontSettings();
  });

  return {
    // State
    results,
    feedMessages,
    selectedModel,
    selectedProvider,
    apiUrl,
    modelStatus,
    selectedFont,
    baseFontSize,
    showSettings,
    showStatusFeed,
    // Getters
    nextResultId,
    // Actions
    addResult,
    updateResult,
    removeResult,
    addFeedMessage,
    generateAltText,
    setFont,
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
    toggleSettings,
    toggleStatusFeed,
    updateFontSettings
  };
}); 