<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <!-- Setup Wizard -->
    <SetupWizard
      v-if="showSetupWizard"
      @setup-complete="onSetupComplete"
    />

    <!-- Main App Content -->
    <div v-else>
      <!-- Status Bar -->
      <div v-if="modelStatus.error || modelStatus.loading" 
           class="bg-yellow-100 dark:bg-yellow-900 p-4 fixed top-0 left-0 right-0 z-50">
        <div class="container mx-auto flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span v-if="modelStatus.loading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></span>
            <span class="text-yellow-800 dark:text-yellow-200">
              {{ modelStatus.error || 'Checking Ollama status...' }}
            </span>
          </div>
          <div class="flex items-center space-x-4">
            <a v-if="modelStatus.error && modelStatus.error.includes('install manually')"
               href="https://ollama.ai"
               target="_blank"
               rel="noopener noreferrer"
               class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Download Ollama
            </a>
            <button @click="showSetupWizard = true"
                    class="px-4 py-2 bg-yellow-200 dark:bg-yellow-800 rounded hover:bg-yellow-300 dark:hover:bg-yellow-700">
              Run Setup
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <main class="container mx-auto px-4 py-8">
        <div>
          <div class="container mx-auto px-4 py-8">
            <div class="min-h-full bg-background-light dark:bg-background-dark text-primary-light dark:text-primary-dark font-open-sans">
              <div class="max-w-7xl mx-auto p-5">
                <h1 class="text-4xl font-playfair font-bold mb-8">Alt Text Generator</h1>
                
                <div class="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-12rem)]">
                  <!-- Left Column: Controls -->
                  <div class="lg:w-1/3 space-y-6">
                    <!-- Model Selection -->
                    <CollapsiblePanel title="Model Selection" :initially-open="true">
                      <div class="space-y-4 p-6">
                        <ModelSelector />
                      </div>
                    </CollapsiblePanel>

                    <!-- Dropzone Upload Area -->
                    <CollapsiblePanel title="Upload Images" :initially-open="true">
                      <div class="p-6">
                        <form ref="dropzone" class="dropzone" id="imageUpload">
                          <div class="dz-message" data-dz-message>
                            <span>Drop images here or click to upload</span>
                          </div>
                        </form>
                      </div>
                    </CollapsiblePanel>

                    <!-- Status Feed -->
                    <CollapsiblePanel title="Status Feed" :initially-open="true">
                      <template #header-actions>
                        <button @click.stop="clearFeed" 
                                class="px-3 py-1 text-sm rounded-lg border-2 border-border-light dark:border-border-dark
                                       hover:bg-surface-light dark:hover:bg-surface-dark transition-colors duration-300">
                          Clear
                        </button>
                      </template>
                      <div class="p-6">
                        <div class="space-y-2 max-h-40 overflow-y-auto rounded-xl bg-surface-light/50 dark:bg-surface-dark/50 p-4">
                          <TransitionGroup name="feed" tag="div">
                            <div v-for="message in feedMessages" 
                                 :key="message.id"
                                 :class="[
                                    'text-sm transition-all duration-300',
                                    {
                                      'text-red-600 dark:text-red-400': message.type === 'error',
                                      'text-green-600 dark:text-green-400': message.type === 'success',
                                      'text-attention': message.type === 'warning',
                                      'text-primary-light/70 dark:text-primary-dark/70': message.type === 'info'
                                    }
                                 ]">
                              {{ message.timestamp }} - {{ message.text }}
                            </div>
                          </TransitionGroup>
                        </div>
                      </div>
                    </CollapsiblePanel>
                  </div>

                  <!-- Right Column: Results -->
                  <div class="lg:w-2/3">
                    <CollapsiblePanel title="Results" :initially-open="true">
                      <div class="p-6">
                        <TransitionGroup 
                          name="results" 
                          tag="div" 
                          class="space-y-4">
                          <div v-for="result in results" 
                               :key="result.id"
                               class="grid-item"
                               :data-index="result.id">
                            <div class="grid-item-content">
                              <div class="grid-item-inner">
                                <img :src="result.image" class="w-full rounded-lg mb-4" :alt="result.altText">
                                <div v-if="result.processing" class="animate-pulse text-sm text-primary-light/70 dark:text-primary-dark/70">
                                  Generating alt text...
                                </div>
                                <template v-else>
                                  <p class="text-sm mb-2">{{ result.altText }}</p>
                                  <button @click="copyAltText(result.altText)"
                                          class="text-xs px-2 py-1 bg-accent text-white rounded hover:bg-opacity-80 transition-colors">
                                    Copy Alt Text
                                  </button>
                                </template>
                              </div>
                            </div>
                          </div>
                        </TransitionGroup>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Theme Toggle -->
              <button @click="toggleTheme" 
                      class="fixed bottom-5 right-5 p-3 rounded-full bg-surface-light dark:bg-surface-dark 
                             border-2 border-border-light dark:border-border-dark
                             hover:scale-110 transition-transform duration-300
                             shadow-lg">
                <svg class="w-6 h-6 dark:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                </svg>
                <svg class="w-6 h-6 hidden dark:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { TransitionGroup } from 'vue'
import Dropzone from 'dropzone'
import rough from 'roughjs'
import CollapsiblePanel from './components/CollapsiblePanel.vue'
import SetupWizard from './components/SetupWizard.vue'
import OllamaManager from './components/OllamaManager.vue'
import ModelSelector from './components/ModelSelector.vue'

export default {
  name: 'App',
  components: {
    CollapsiblePanel,
    TransitionGroup,
    SetupWizard,
    OllamaManager,
    ModelSelector
  },
  setup() {
    const apiUrl = ref('http://localhost:11434')
    const selectedModel = ref('llava-phi3')
    const feedMessages = ref([])
    const results = ref([])
    const dropzone = ref(null)
    const nextId = ref(1)
    const showSetup = ref(true)
    const showSetupWizard = ref(false)
    const modelStatus = ref({
      loading: false,
      error: null,
      lastCheck: null
    })

    const initializeDropzone = () => {
      Dropzone.autoDiscover = false
      dropzone.value = new Dropzone("#imageUpload", {
        acceptedFiles: "image/*",
        parallelUploads: 10,
        autoProcessQueue: false,
        addRemoveLinks: true,
        maxFiles: 10,
        maxFilesize: 5,
        init: () => {
          dropzone.value.on("addedfile", processImage)
          dropzone.value.on("success", (file) => dropzone.value.removeFile(file))
          dropzone.value.on("error", (file) => dropzone.value.removeFile(file))
        }
      })
    }

    const processImage = async (file) => {
      const resultId = nextId.value++
      const result = {
        id: resultId,
        image: await resizeAndConvertToBase64(file),
        processing: true
      }
      
      results.value.unshift(result)
      addFeedMessage(`Processing image: ${file.name}`, 'info')

      try {
        const response = await generateAltText(result.image)
        result.altText = cleanDescription(response.response)
        result.processing = false
        addFeedMessage(`Completed processing: ${file.name}`, 'success')
      } catch (err) {
        addFeedMessage(`Error processing ${file.name}: ${err.message}`, 'error')
        results.value = results.value.filter(r => r.id !== resultId)
      }

      dropzone.value.removeFile(file)
    }

    const generateAltText = async (base64Image) => {
      const base64Data = base64Image.split(',')[1]
      const response = await fetch(`${apiUrl.value}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel.value,
          prompt: "Write a concise description for this image suitable for use as alt text for social media. Include key visual elements, actions, and context, but keep it natural and engaging. Avoid starting with phrases like 'an image of' or 'a photo of'.",
          images: [base64Data],
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 75
          }
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      return response.json()
    }

    const cleanDescription = (description) => {
      description = description.trim()
      const prefixes = ['an image of ', 'a photo of ', 'this image shows ', 'the image shows ']
      for (const prefix of prefixes) {
        if (description.toLowerCase().startsWith(prefix)) {
          description = description.slice(prefix.length)
        }
      }
      return description.charAt(0).toUpperCase() + description.slice(1)
    }

    const addFeedMessage = (text, type = 'info') => {
      feedMessages.value.unshift({
        id: Date.now(),
        text,
        type,
        timestamp: new Date().toLocaleTimeString()
      })
    }

    const clearFeed = () => {
      feedMessages.value = []
      addFeedMessage('Feed cleared')
    }

    const copyAltText = async (text) => {
      await navigator.clipboard.writeText(text)
      addFeedMessage('Alt text copied to clipboard', 'success')
    }

    const toggleTheme = () => {
      const isDark = document.documentElement.classList.toggle('dark')
      localStorage.theme = isDark ? 'dark' : 'light'
    }

    const initializeTheme = () => {
      if (localStorage.theme === 'dark' || 
          (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    const resizeAndConvertToBase64 = (file) => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const maxSize = 512
          let width = img.width
          let height = img.height
          
          if (width > height && width > maxSize) {
            height = Math.round((height * maxSize) / width)
            width = maxSize
          } else if (height > maxSize) {
            width = Math.round((width * maxSize) / height)
            height = maxSize
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, width, height)
          ctx.drawImage(img, 0, 0, width, height)
          
          resolve(canvas.toDataURL('image/jpeg', 0.8))
        }
        img.onerror = reject
        
        const reader = new FileReader()
        reader.onload = (e) => img.src = e.target.result
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    }

    const checkOllamaSetup = async () => {
      modelStatus.value.loading = true
      modelStatus.value.error = null

      try {
        // Check if Ollama is installed
        const isInstalled = await window.electron.checkOllamaStatus()
        if (!isInstalled) {
          modelStatus.value.error = 'Ollama is not installed. Please install manually from ollama.ai or click "Run Setup" to install.'
          showSetupWizard.value = true
          return
        }

        // Check if server is running and model is available
        let serverRunning = false
        try {
          const response = await fetch('http://localhost:11434/api/tags')
          if (!response.ok) {
            throw new Error('Server responded with error')
          }
          serverRunning = true
          
          const data = await response.json()
          const hasModel = data.models?.some(m => 
            m.name === 'llava-phi3' || m.name.startsWith('llava-phi3:')
          )
          
          if (!hasModel) {
            modelStatus.value.error = 'LLaVA-Phi3 model is not installed. Click "Run Setup" to download.'
            showSetupWizard.value = true
            return
          }
        } catch (err) {
          // Only show server error if Ollama is installed but server isn't running
          if (serverRunning) {
            modelStatus.value.error = 'Error communicating with Ollama server.'
          } else {
            modelStatus.value.error = 'Ollama server is not running. Click "Run Setup" to start.'
          }
          showSetupWizard.value = true
          return
        }

        // Everything is good
        modelStatus.value.lastCheck = new Date()
        modelStatus.value.error = null
      } catch (err) {
        modelStatus.value.error = `Error checking Ollama setup: ${err.message}`
        showSetupWizard.value = true
      } finally {
        modelStatus.value.loading = false
      }
    }

    const onSetupComplete = async () => {
      showSetupWizard.value = false
      // Add a small delay to let the server fully start
      await new Promise(resolve => setTimeout(resolve, 1000))
      await checkOllamaSetup()
    }

    onMounted(() => {
      initializeDropzone()
      initializeTheme()
      checkOllamaSetup()
    })

    return {
      apiUrl,
      selectedModel,
      feedMessages,
      results,
      clearFeed,
      copyAltText,
      toggleTheme,
      showSetup,
      onSetupComplete,
      showSetupWizard,
      modelStatus
    }
  }
}
</script>

<style>
[v-cloak] { display: none; }
.dropzone {
  @apply border-2 border-dashed border-border-light dark:border-border-dark rounded-xl 
         bg-surface-light dark:bg-surface-dark cursor-pointer
         hover:border-accent transition-all duration-300;
  min-height: 120px !important;
  height: auto !important;
}
.dropzone .dz-message {
  @apply text-xl font-playfair font-bold text-primary-light dark:text-primary-dark;
  margin: 1em 0 !important;
}
.dropzone .dz-preview {
  @apply relative inline-block m-2;
}
.dropzone .dz-preview .dz-image {
  @apply rounded-lg overflow-hidden;
}
.grid-item {
  @apply w-full p-4;
  margin-bottom: 1rem;
}
.grid-item-content {
  @apply bg-surface-light dark:bg-surface-dark rounded-xl p-4;
  position: relative;
  overflow: hidden;
}
.grid-item-inner {
  position: relative;
  z-index: 1;
}
.section-content {
  @apply transition-all duration-300 ease-in-out overflow-hidden;
}
.section-content.collapsed {
  @apply h-0 overflow-hidden;
}
</style> 