<template>
  <div v-if="showWizard" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-2xl w-full mx-4 shadow-xl">
      <div class="space-y-6">
        <!-- Header -->
        <div class="text-center">
          <h2 class="text-2xl font-bold mb-2">Setup Wizard</h2>
          <p class="text-gray-600 dark:text-gray-400">Let's get everything ready for you</p>
        </div>

        <!-- Progress Bar -->
        <div class="relative pt-1">
          <div class="flex mb-2 items-center justify-between">
            <div class="text-sm font-semibold">
              {{ currentStep }}/3: {{ stepTitles[currentStep - 1] }}
            </div>
            <div class="text-sm font-semibold">
              {{ Math.round((currentStep / 3) * 100) }}%
            </div>
          </div>
          <div class="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
            <div
              :style="{ width: \`\${(currentStep / 3) * 100}%\` }"
              class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
            ></div>
          </div>
        </div>

        <!-- Step Content -->
        <div class="space-y-6">
          <!-- Step 1: Check/Install Ollama -->
          <div v-if="currentStep === 1">
            <h3 class="text-lg font-semibold mb-4">Installing Ollama</h3>
            <div class="space-y-4">
              <div v-if="!ollamaInstalled" class="flex items-center space-x-4">
                <div class="flex-grow">
                  <div class="animate-pulse h-2 bg-blue-200 rounded"></div>
                </div>
                <span class="text-sm text-gray-600">Downloading Ollama...</span>
              </div>
              <div v-else class="flex items-center space-x-2 text-green-500">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>Ollama installed successfully</span>
              </div>
            </div>
          </div>

          <!-- Step 2: Pull Model -->
          <div v-if="currentStep === 2">
            <h3 class="text-lg font-semibold mb-4">Downloading AI Model</h3>
            <div class="space-y-4">
              <div v-if="!modelPulled" class="space-y-2">
                <div class="flex items-center space-x-4">
                  <div class="flex-grow">
                    <div class="h-2 bg-blue-500 rounded" :style="{ width: \`\${downloadProgress}%\` }"></div>
                  </div>
                  <span class="text-sm text-gray-600">{{ downloadProgress }}%</span>
                </div>
                <p class="text-sm text-gray-600">Downloading LLaVA-Phi3 model...</p>
              </div>
              <div v-else class="flex items-center space-x-2 text-green-500">
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
              <div v-if="!serverStarted" class="flex items-center space-x-4">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span class="text-sm text-gray-600">Starting Ollama server...</span>
              </div>
              <div v-else class="flex items-center space-x-2 text-green-500">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>Server started successfully</span>
              </div>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <strong class="font-bold">Error:</strong>
            <span class="block sm:inline"> {{ error }}</span>
            <button @click="retryCurrentStep" class="mt-2 text-sm underline">Retry</button>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-4">
          <button
            v-if="!isComplete"
            @click="cancel"
            class="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
          >
            Cancel
          </button>
          <button
            v-if="isComplete"
            @click="finish"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'SetupWizard',
  setup(props, { emit }) {
    const showWizard = ref(true)
    const currentStep = ref(1)
    const ollamaInstalled = ref(false)
    const modelPulled = ref(false)
    const serverStarted = ref(false)
    const downloadProgress = ref(0)
    const error = ref(null)

    const stepTitles = [
      'Installing Ollama',
      'Downloading Model',
      'Starting Server'
    ]

    const isComplete = computed(() => {
      return currentStep.value === 3 && serverStarted.value
    })

    // Methods to communicate with main process
    const startOllamaInstall = async () => {
      try {
        error.value = null
        const result = await window.electron.installOllama()
        ollamaInstalled.value = true
        currentStep.value = 2
        startModelPull()
      } catch (err) {
        error.value = err.message
      }
    }

    const startModelPull = async () => {
      try {
        error.value = null
        await window.electron.pullModel('llava-phi3', (progress) => {
          downloadProgress.value = progress
        })
        modelPulled.value = true
        currentStep.value = 3
        startServer()
      } catch (err) {
        error.value = err.message
      }
    }

    const startServer = async () => {
      try {
        error.value = null
        await window.electron.startOllamaServer()
        serverStarted.value = true
      } catch (err) {
        error.value = err.message
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
      showWizard.value = false
      emit('setup-complete')
    }

    // Start the process
    startOllamaInstall()

    return {
      showWizard,
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
      finish
    }
  }
}
</script> 