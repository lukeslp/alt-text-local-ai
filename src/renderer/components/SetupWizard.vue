<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4">
      <!-- Header -->
      <div class="mb-8">
        <h2 class="text-2xl font-bold">Ollama Setup Wizard</h2>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          Let's get everything set up for you to start generating alt text.
        </p>
      </div>

      <!-- Progress Steps -->
      <div class="mb-8">
        <div class="flex justify-between">
          <div v-for="(title, index) in stepTitles" :key="index"
               class="flex flex-col items-center flex-1">
            <div class="w-8 h-8 rounded-full flex items-center justify-center"
                 :class="[
                   currentStep > index + 1 ? 'bg-green-500' : 
                   currentStep === index + 1 ? 'bg-blue-500' : 
                   'bg-gray-300 dark:bg-gray-600'
                 ]">
              <span class="text-white">{{ index + 1 }}</span>
            </div>
            <span class="text-sm mt-2 text-center" 
                  :class="currentStep === index + 1 ? 'font-medium' : ''">
              {{ title }}
            </span>
          </div>
        </div>
        <div class="relative mt-2">
          <div class="absolute top-0 h-1 bg-gray-200 dark:bg-gray-700 w-full"></div>
          <div class="absolute top-0 h-1 bg-blue-500 transition-all duration-500"
               :style="{ width: `${((currentStep - 1) / (stepTitles.length - 1)) * 100}%` }">
          </div>
        </div>
      </div>

      <!-- Step Content -->
      <div class="space-y-6">
        <!-- Step 1: Check/Install Ollama -->
        <div v-if="currentStep === 1">
          <h3 class="text-lg font-semibold mb-4">Installing Ollama</h3>
          <div class="space-y-4">
            <div v-if="!ollamaInstalled && !error" class="flex items-center space-x-4">
              <div class="flex-grow">
                <div class="animate-pulse h-2 bg-blue-200 rounded"></div>
              </div>
              <span class="text-sm text-gray-600">Checking Ollama installation...</span>
            </div>
            <div v-else-if="ollamaInstalled" class="flex items-center space-x-2 text-green-500">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Ollama installed successfully</span>
            </div>
            <div v-else-if="error && error.includes('install manually')" class="space-y-4">
              <div class="p-4 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                <h4 class="font-medium mb-2">Manual Installation Required</h4>
                <p class="text-sm mb-4">Please follow these steps:</p>
                <ol class="list-decimal list-inside space-y-2 text-sm">
                  <li>Visit <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" 
                             class="text-blue-600 dark:text-blue-400 hover:underline">ollama.ai</a></li>
                  <li>Download and install Ollama for your system</li>
                  <li>After installation, click "Check Again" below</li>
                </ol>
                <div class="mt-4 flex space-x-4">
                  <a href="https://ollama.ai" 
                     target="_blank"
                     rel="noopener noreferrer"
                     class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Download Ollama
                  </a>
                  <button @click="retryCurrentStep"
                          class="px-4 py-2 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-300 dark:hover:bg-blue-700">
                    Check Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Pull Model -->
        <div v-if="currentStep === 2">
          <h3 class="text-lg font-semibold mb-4">Downloading AI Model</h3>
          <div class="space-y-4">
            <div v-if="!modelPulled && !error" class="space-y-2">
              <div class="flex items-center space-x-4">
                <div class="flex-grow">
                  <div class="h-2 bg-blue-500 rounded" :style="{ width: `${downloadProgress}%` }"></div>
                </div>
                <span class="text-sm text-gray-600">{{ downloadProgress.toFixed(1) }}%</span>
              </div>
              <p class="text-sm text-gray-600">
                Downloading LLaVA-Phi3 model (this may take a while)...
                <br>
                <span class="text-xs text-gray-500">Model size is approximately 4GB</span>
              </p>
            </div>
            <div v-else-if="modelPulled" class="flex items-center space-x-2 text-green-500">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Model downloaded successfully</span>
            </div>
          </div>
        </div>

        <!-- Step 3: Start Server -->
        <div v-if="currentStep === 3">
          <h3 class="text-lg font-semibold mb-4">Starting Ollama Server</h3>
          <div class="space-y-4">
            <div v-if="!serverStarted && !error" class="flex items-center space-x-4">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span class="text-sm text-gray-600">Starting Ollama server...</span>
            </div>
            <div v-else-if="serverStarted" class="flex items-center space-x-2 text-green-500">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Server started successfully</span>
            </div>
          </div>
        </div>

        <!-- Error State (except for manual installation guidance) -->
        <div v-if="error && !error.includes('install manually')" 
             class="mt-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded">
          <div class="flex items-start space-x-2">
            <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h4 class="font-medium">Error</h4>
              <p class="text-sm mt-1">{{ error }}</p>
              <div class="mt-2 flex space-x-2">
                <button @click="retryCurrentStep" 
                        class="px-3 py-1 bg-red-200 dark:bg-red-800 rounded hover:bg-red-300 dark:hover:bg-red-700">
                  Retry
                </button>
                <button @click="openTerminal" 
                        class="px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded hover:bg-gray-300 dark:hover:bg-gray-700">
                  Open Terminal
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-8 flex justify-between">
        <button @click="cancel" 
                class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
          Cancel
        </button>
        <button v-if="isComplete"
                @click="finish"
                class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          Start Using App
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'

export default {
  name: 'SetupWizard',
  emits: ['setup-complete'],
  
  setup(props, { emit }) {
    const currentStep = ref(1)
    const ollamaInstalled = ref(false)
    const modelPulled = ref(false)
    const serverStarted = ref(false)
    const downloadProgress = ref(0)
    const error = ref(null)

    const stepTitles = [
      'Install Ollama',
      'Download Model',
      'Start Server'
    ]

    const isComplete = computed(() => {
      return currentStep.value === 3 && serverStarted.value
    })

    const openTerminal = async () => {
      try {
        await window.electron.openTerminal()
      } catch (err) {
        console.error('Failed to open terminal:', err)
      }
    }

    const startOllamaInstall = async () => {
      try {
        error.value = null
        
        // First check if Ollama is already installed
        const isInstalled = await window.electron.checkOllamaStatus()
        if (isInstalled) {
          ollamaInstalled.value = true
          currentStep.value = 2
          startModelPull()
          return
        }

        // Try automatic installation first
        try {
          await window.electron.installOllama()
          ollamaInstalled.value = true
          currentStep.value = 2
          startModelPull()
        } catch (err) {
          // If automatic installation fails, guide for manual installation
          error.value = 'Automatic installation failed. Please install manually from ollama.ai'
        }
      } catch (err) {
        error.value = `Failed to install Ollama: ${err.message}. Please install manually from ollama.ai`
      }
    }

    const startModelPull = async () => {
      try {
        error.value = null
        downloadProgress.value = 0
        
        // Check if server is running and model exists
        try {
          const response = await fetch('http://localhost:11434/api/tags')
          if (!response.ok) {
            throw new Error('Server not running')
          }
          
          const data = await response.json()
          const hasModel = data.models?.some(m => 
            m.name === 'llava-phi3' || m.name.startsWith('llava-phi3:')
          )
          
          if (hasModel) {
            modelPulled.value = true
            currentStep.value = 3
            startServer()
            return
          }
        } catch (err) {
          // Start the server if it's not running
          await startServer()
        }

        // Pull the model
        await window.electron.pullModel('llava-phi3', (progress) => {
          downloadProgress.value = progress
        })
        
        modelPulled.value = true
        currentStep.value = 3
        startServer()
      } catch (err) {
        error.value = `Failed to download model: ${err.message}. Check your internet connection and try again.`
      }
    }

    const startServer = async () => {
      try {
        error.value = null
        
        // Check if server is already running
        try {
          const response = await fetch('http://localhost:11434/api/tags')
          if (response.ok) {
            serverStarted.value = true
            return
          }
        } catch (err) {
          // Server not running, continue with start
        }

        await window.electron.startOllamaServer()
        
        // Wait for server to be ready
        let attempts = 0
        while (attempts < 10) {
          try {
            const response = await fetch('http://localhost:11434/api/tags')
            if (response.ok) {
              serverStarted.value = true
              return
            }
          } catch (err) {
            // Keep trying
          }
          await new Promise(resolve => setTimeout(resolve, 1000))
          attempts++
        }
        
        throw new Error('Server failed to start after multiple attempts')
      } catch (err) {
        error.value = `Failed to start Ollama server: ${err.message}. Try running 'ollama serve' in terminal.`
      }
    }

    const retryCurrentStep = () => {
      error.value = null
      if (!ollamaInstalled.value) {
        startOllamaInstall()
      } else if (!modelPulled.value) {
        startModelPull()
      } else if (!serverStarted.value) {
        startServer()
      }
    }

    const cancel = () => {
      if (confirm('Are you sure you want to cancel the setup? The application requires Ollama to function.')) {
        window.electron.quit()
      }
    }

    const finish = () => {
      emit('setup-complete')
    }

    onMounted(() => {
      startOllamaInstall()
    })

    return {
      currentStep,
      ollamaInstalled,
      modelPulled,
      serverStarted,
      downloadProgress,
      error,
      stepTitles,
      isComplete,
      retryCurrentStep,
      cancel,
      finish,
      openTerminal
    }
  }
}
</script> 