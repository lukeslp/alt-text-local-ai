<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
    <h2 class="text-2xl font-bold mb-6">Ollama Management</h2>

    <!-- Status Section -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">Status</h3>
        <div class="flex items-center space-x-2">
          <span class="w-3 h-3 rounded-full" 
                :class="serverStatus.running ? 'bg-green-500' : 'bg-red-500'"></span>
          <span class="text-sm">{{ serverStatus.running ? 'Running' : 'Stopped' }}</span>
        </div>
      </div>
      
      <div class="flex space-x-4">
        <button @click="startServer" 
                :disabled="serverStatus.running"
                class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
          Start Server
        </button>
        <button @click="stopServer"
                :disabled="!serverStatus.running"
                class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed">
          Stop Server
        </button>
        <button @click="checkStatus" 
                class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
          Check Status
        </button>
      </div>
    </div>

    <!-- Model Management Section -->
    <div class="mb-8">
      <h3 class="text-lg font-semibold mb-4">Models</h3>
      
      <!-- Current Model -->
      <div class="mb-4">
        <label class="block text-sm font-medium mb-2">Current Model</label>
        <div class="flex items-center space-x-4">
          <select v-model="selectedModel"
                  class="flex-grow p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600">
            <option value="llava-phi3">LLaVA-Phi3 (Default)</option>
            <option value="llava">LLaVA v1.5</option>
            <option value="bakllava">BakLLaVA</option>
            <option value="cogvlm">CogVLM</option>
            <option value="idefics">IDEFICS</option>
            <option value="custom">Custom Model</option>
          </select>
          <button @click="pullModel" 
                  :disabled="isDownloading"
                  class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
            {{ isDownloading ? 'Downloading...' : 'Pull Model' }}
          </button>
        </div>
      </div>

      <!-- Custom Model Input -->
      <div v-if="selectedModel === 'custom'" class="mb-4">
        <label class="block text-sm font-medium mb-2">Custom Model Name</label>
        <input v-model="customModelName"
               type="text"
               placeholder="Enter model name"
               class="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600">
      </div>

      <!-- Download Progress -->
      <div v-if="isDownloading" class="mb-4">
        <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div class="bg-blue-600 h-2.5 rounded-full" 
               :style="{ width: downloadProgress + '%' }"></div>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Downloading: {{ downloadProgress.toFixed(1) }}%
        </p>
      </div>
    </div>

    <!-- System Information -->
    <div class="mb-8">
      <h3 class="text-lg font-semibold mb-4">System Information</h3>
      <div class="space-y-2 text-sm">
        <p><strong>Installation Path:</strong> {{ systemInfo.installPath || 'Not detected' }}</p>
        <p><strong>Version:</strong> {{ systemInfo.version || 'Unknown' }}</p>
        <p><strong>Platform:</strong> {{ systemInfo.platform }}</p>
      </div>
    </div>

    <!-- Error Messages -->
    <div v-if="error" class="mt-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded">
      {{ error }}
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useStore } from '../store'

export default {
  name: 'OllamaManager',
  setup() {
    const store = useStore()
    const serverStatus = ref({ running: false })
    const selectedModel = ref('llava-phi3')
    const customModelName = ref('')
    const isDownloading = ref(false)
    const downloadProgress = ref(0)
    const error = ref(null)
    const systemInfo = ref({
      installPath: '',
      version: '',
      platform: process.platform
    })

    const startServer = async () => {
      try {
        error.value = null
        await window.electron.startOllamaServer()
        serverStatus.value.running = true
      } catch (err) {
        error.value = err.message
      }
    }

    const checkStatus = async () => {
      try {
        error.value = null
        const isRunning = await window.electron.checkOllamaStatus()
        serverStatus.value.running = isRunning
      } catch (err) {
        error.value = err.message
        serverStatus.value.running = false
      }
    }

    const pullModel = async () => {
      if (isDownloading.value) return

      const modelName = selectedModel.value === 'custom' 
        ? customModelName.value.trim() 
        : selectedModel.value

      if (!modelName) {
        error.value = 'Please enter a model name'
        return
      }

      try {
        error.value = null
        isDownloading.value = true
        downloadProgress.value = 0

        await window.electron.pullModel(modelName, (progress) => {
          downloadProgress.value = progress
        })

        // Update store with new model
        store.selectedModel = modelName
      } catch (err) {
        error.value = err.message
      } finally {
        isDownloading.value = false
      }
    }

    const stopServer = async () => {
      try {
        error.value = null
        await window.electron.stopOllamaServer()
        serverStatus.value.running = false
      } catch (err) {
        error.value = err.message
      }
    }

    const updateSystemInfo = async () => {
      try {
        const [version, installPath] = await Promise.all([
          window.electron.getOllamaVersion().catch(() => null),
          window.electron.getOllamaPath().catch(() => null)
        ])
        
        systemInfo.value = {
          version,
          installPath,
          platform: process.platform
        }
      } catch (err) {
        error.value = err.message
      }
    }

    onMounted(() => {
      checkStatus()
      updateSystemInfo()
      selectedModel.value = store.selectedModel || 'llava-phi3'
    })

    return {
      serverStatus,
      selectedModel,
      customModelName,
      isDownloading,
      downloadProgress,
      error,
      systemInfo,
      startServer,
      checkStatus,
      pullModel,
      stopServer
    }
  }
}
</script>

<style scoped>
.font-size-control {
  @apply flex items-center space-x-4;
}

.font-size-btn {
  @apply px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600;
}

.font-size-value {
  @apply text-sm;
}
</style> 