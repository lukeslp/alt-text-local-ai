<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">Model Selection</h3>
      <button 
        @click="refreshModels" 
        class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        :class="{ 'animate-spin': store.modelStatus.isDetecting }"
        :disabled="store.modelStatus.isDetecting"
        :aria-busy="store.modelStatus.isDetecting"
        aria-label="Refresh models list"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>

    <div v-if="store.modelStatus.error" class="text-red-600 dark:text-red-400 text-sm mb-2 p-2 bg-red-100 dark:bg-red-900 rounded">
      {{ store.modelStatus.error }}
    </div>

    <div class="space-y-2">
      <label for="model-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Select Vision Model
      </label>
      <div class="relative">
        <select
          id="model-select"
          v-model="selectedModelName"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
          :disabled="store.modelStatus.isDetecting"
          aria-label="Select AI model"
        >
          <option v-for="model in visionModels" :key="model.name" :value="model.name">
            {{ model.name }} ({{ formatSize(model.size) }})
          </option>
        </select>
      </div>

      <div v-if="!hasVisionModel" class="mt-2 text-yellow-600 dark:text-yellow-400 text-sm p-2 bg-yellow-100 dark:bg-yellow-900 rounded">
        Warning: No vision-capable models detected. Please install llava, llava-phi3, or bakllava.
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useStore } from '../store';
import { logger } from '../utils/logger';

const store = useStore();

const selectedModelName = computed({
  get: () => store.selectedModel,
  set: async (value) => {
    try {
      await store.setModel(value);
    } catch (error) {
      logger.error('Failed to set model:', error);
    }
  }
});

const visionModels = computed(() => {
  const visionModelNames = ['llava', 'llava-phi3', 'bakllava'];
  return store.availableModels.filter(model => 
    visionModelNames.some(vm => model.name.toLowerCase().includes(vm))
  );
});

const hasVisionModel = computed(() => visionModels.value.length > 0);

// Format file size
function formatSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Refresh models list
async function refreshModels() {
  try {
    await store.detectModels();
  } catch (error) {
    logger.error('Failed to refresh models:', error);
  }
}

// Initial fetch
onMounted(async () => {
  if (store.availableModels.length === 0) {
    await refreshModels();
  }
});
</script> 