<template>
  <section aria-labelledby="results-title" class="results-section">
    <h2 id="results-title" class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Results</h2>
    <TransitionGroup name="results" tag="div" class="space-y-4">
      <div v-for="result in store.results" :key="result.id" class="result-item bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700">
        <div class="flex gap-4">
          <!-- Image Preview -->
          <div class="w-32 h-32 relative">
            <img :src="result.image" 
                 :alt="result.altText || 'Processing image'"
                 class="w-full h-full object-cover rounded">
            <div v-if="result.processing" 
                 class="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
              <div class="text-white text-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                <div class="mt-2">Processing...</div>
              </div>
            </div>
          </div>
          
          <!-- Alt Text Content -->
          <div class="flex-1">
            <div v-if="result.error" class="text-red-500 dark:text-red-400">
              {{ result.error }}
            </div>
            <div v-else-if="!result.processing" class="space-y-4">
              <p class="text-gray-700 dark:text-gray-300">{{ result.altText }}</p>
              <div class="flex gap-2">
                <button @click="copyAltText(result.altText)"
                        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800">
                  Copy
                </button>
                <button @click="startEditing(result)"
                        class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800">
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </section>
</template>

<script setup>
import { TransitionGroup } from 'vue';
import { useStore } from '../store';
import { useAccessibility } from '../composables/useAccessibility';

const store = useStore();
const { announce } = useAccessibility();

async function copyAltText(text) {
  try {
    await navigator.clipboard.writeText(text);
    store.addFeedMessage('Alt text copied to clipboard', 'success');
    announce('Alt text copied to clipboard');
  } catch (err) {
    console.error('Error copying to clipboard:', err);
    store.addFeedMessage('Failed to copy alt text', 'error');
    announce('Failed to copy alt text');
  }
}

function startEditing(result) {
  // TODO: Implement edit functionality
  console.log('Start editing:', result);
}
</script>

<style scoped>
.results-move,
.results-enter-active,
.results-leave-active {
  transition: all 0.5s ease;
}

.results-enter-from,
.results-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.results-leave-active {
  position: absolute;
}
</style> 