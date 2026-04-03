<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
       role="dialog"
       aria-modal="true"
       aria-labelledby="setup-title">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4">
      <!-- Header -->
      <div class="mb-8">
        <h2 id="setup-title" class="text-2xl font-bold text-gray-900 dark:text-white">Ollama Setup</h2>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          Set up a connection to Ollama for alt text generation.
        </p>
      </div>

      <!-- Progress Steps -->
      <nav aria-label="Setup progress" class="mb-8">
        <ol class="flex justify-between">
          <li v-for="(title, index) in stepTitles" :key="index"
              class="flex flex-col items-center flex-1">
            <div class="w-8 h-8 rounded-full flex items-center justify-center"
                 :class="[
                   currentStep > index + 1 ? 'bg-green-500' :
                   currentStep === index + 1 ? 'bg-blue-500' :
                   'bg-gray-300 dark:bg-gray-600'
                 ]"
                 :aria-current="currentStep === index + 1 ? 'step' : undefined">
              <span class="text-white text-sm font-medium">{{ index + 1 }}</span>
            </div>
            <span class="text-sm mt-2 text-center text-gray-700 dark:text-gray-300"
                  :class="currentStep === index + 1 ? 'font-semibold' : ''">
              {{ title }}
            </span>
          </li>
        </ol>
        <div class="relative mt-2">
          <div class="absolute top-0 h-1 bg-gray-200 dark:bg-gray-700 w-full rounded"></div>
          <div class="absolute top-0 h-1 bg-blue-500 rounded transition-all duration-500"
               :style="{ width: `${((currentStep - 1) / (stepTitles.length - 1)) * 100}%` }"
               role="progressbar"
               :aria-valuenow="currentStep"
               :aria-valuemin="1"
               :aria-valuemax="stepTitles.length">
          </div>
        </div>
      </nav>

      <!-- Step Content -->
      <div class="space-y-6" aria-live="polite">
        <!-- Step 1: Connection -->
        <div v-if="currentStep === 1">
          <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Connect to Ollama</h3>
          <div class="space-y-4">
            <!-- Connection mode selector -->
            <div class="flex gap-3">
              <button @click="connectionMode = 'local'"
                      class="flex-1 p-3 rounded-lg border-2 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                      :class="connectionMode === 'local'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'"
                      :aria-pressed="connectionMode === 'local'">
                <p class="font-medium text-gray-900 dark:text-white">Local</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">Ollama running on this machine</p>
              </button>
              <button @click="connectionMode = 'remote'"
                      class="flex-1 p-3 rounded-lg border-2 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                      :class="connectionMode === 'remote'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'"
                      :aria-pressed="connectionMode === 'remote'">
                <p class="font-medium text-gray-900 dark:text-white">Remote</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">Ollama on another server or cloud</p>
              </button>
            </div>

            <!-- Remote URL input -->
            <div v-if="connectionMode === 'remote'" class="space-y-2">
              <label for="remote-url" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ollama API URL
              </label>
              <input id="remote-url"
                     type="url"
                     v-model="remoteUrl"
                     placeholder="https://your-ollama-server.example.com"
                     class="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <!-- Status -->
            <div v-if="checking" class="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" aria-hidden="true"></div>
              <span class="text-sm">Checking connection...</span>
            </div>
            <div v-else-if="ollamaConnected" class="flex items-center gap-2 text-green-600 dark:text-green-400">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span class="text-sm">Connected to Ollama</span>
            </div>
            <div v-else-if="error" class="text-sm text-red-600 dark:text-red-400" role="alert">
              {{ error }}
              <button @click="checkConnection" class="ml-2 underline hover:no-underline">Retry</button>
            </div>

            <button @click="checkConnection"
                    v-if="!checking && !ollamaConnected"
                    class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
              Connect
            </button>
          </div>
        </div>

        <!-- Step 2: Select Model -->
        <div v-if="currentStep === 2">
          <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Select a Vision Model</h3>
          <div class="space-y-4">
            <div v-if="store.modelStatus.isDetecting" class="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" aria-hidden="true"></div>
              <span class="text-sm">Detecting available models...</span>
            </div>

            <div v-else-if="store.visionModels.length > 0">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Found {{ store.visionModels.length }} vision model{{ store.visionModels.length > 1 ? 's' : '' }}:
              </p>
              <ul class="space-y-2" role="listbox" aria-label="Available vision models">
                <li v-for="model in store.visionModels" :key="model.name"
                    role="option"
                    :aria-selected="model.name === store.selectedModel"
                    tabindex="0"
                    @click="store.setModel(model.name)"
                    @keydown.enter.prevent="store.setModel(model.name)"
                    @keydown.space.prevent="store.setModel(model.name)"
                    class="p-3 rounded-lg cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    :class="model.name === store.selectedModel
                      ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-400'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'">
                  <p class="font-medium text-gray-900 dark:text-gray-100 text-sm">{{ model.name }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ model.description }}</p>
                </li>
              </ul>
            </div>

            <div v-else class="space-y-3">
              <p class="text-sm text-yellow-700 dark:text-yellow-400">
                No vision models found. Pull one to get started:
              </p>
              <div class="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                <code class="text-sm text-gray-800 dark:text-gray-200">ollama pull llava</code>
              </div>
              <button @click="pullModel"
                      :disabled="pulling"
                      class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50">
                {{ pulling ? `Pulling llava (${pullProgress}%)...` : 'Pull llava automatically' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Step 3: Ready -->
        <div v-if="currentStep === 3">
          <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Ready to Go</h3>
          <div class="space-y-3">
            <div class="flex items-center gap-2 text-green-600 dark:text-green-400">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span class="text-sm">Connected to {{ store.apiUrl }}</span>
            </div>
            <div class="flex items-center gap-2 text-green-600 dark:text-green-400">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span class="text-sm">Model: {{ store.selectedModel }}</span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-4">
              Drop an image into the app to generate alt text. All processing happens {{ connectionMode === 'local' ? 'on your machine' : 'on the configured server' }}.
            </p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-8 flex justify-between">
        <button @click="skip"
                class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded">
          Skip Setup
        </button>
        <button v-if="currentStep === 3"
                @click="finish"
                class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium">
          Start Using App
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from '../store';
import { useAccessibility } from '../composables/useAccessibility';

const emit = defineEmits(['setup-complete']);

const store = useStore();
const { announce } = useAccessibility();

const currentStep = ref(1);
const connectionMode = ref('local');
const remoteUrl = ref('');
const checking = ref(false);
const ollamaConnected = ref(false);
const error = ref(null);
const pulling = ref(false);
const pullProgress = ref(0);

const stepTitles = ['Connect', 'Select Model', 'Ready'];

async function checkConnection() {
  checking.value = true;
  error.value = null;

  const url = connectionMode.value === 'local'
    ? 'http://localhost:11434'
    : remoteUrl.value.replace(/\/+$/, '');

  if (connectionMode.value === 'remote' && !url) {
    error.value = 'Please enter an Ollama API URL.';
    checking.value = false;
    return;
  }

  try {
    store.setApiUrl(url);
    const result = await store.testConnection();

    if (result.ok) {
      ollamaConnected.value = true;
      announce('Connected to Ollama');
      await store.detectModels();
      currentStep.value = 2;

      // Auto-advance to step 3 if a vision model is already selected
      if (store.visionModels.length > 0 && store.selectedModel) {
        currentStep.value = 3;
      }
    } else {
      error.value = connectionMode.value === 'local'
        ? 'Cannot reach Ollama at localhost:11434. Is Ollama running? Try: ollama serve'
        : `Cannot reach ${url}: ${result.error}`;
    }
  } catch (err) {
    error.value = `Connection failed: ${err.message}`;
  } finally {
    checking.value = false;
  }
}

async function pullModel() {
  if (!window.electron?.pullModel) {
    error.value = 'Model pulling requires the desktop app. Pull manually: ollama pull llava';
    return;
  }

  pulling.value = true;
  pullProgress.value = 0;

  try {
    await window.electron.pullModel('llava', (progress) => {
      pullProgress.value = progress;
    });
    announce('Model downloaded successfully');
    await store.detectModels();
    if (store.visionModels.length > 0) {
      currentStep.value = 3;
    }
  } catch (err) {
    error.value = `Failed to pull model: ${err.message}`;
  } finally {
    pulling.value = false;
  }
}

function skip() {
  localStorage.setItem('setupComplete', 'true');
  emit('setup-complete');
}

function finish() {
  localStorage.setItem('setupComplete', 'true');
  emit('setup-complete');
}

onMounted(() => {
  // Auto-check local connection on mount
  checkConnection();
});
</script>
