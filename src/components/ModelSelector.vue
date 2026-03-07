<template>
  <div class="model-selector">
    <!-- Model Selection Interface -->
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
        Model Selection
      </label>

      <!-- Current Model Display -->
      <div class="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
        <h4 class="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Current Model
        </h4>
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="text-sm font-bold text-gray-900 dark:text-gray-200 truncate">
              {{ store.selectedModel }}
            </p>
            <p class="text-xs text-gray-600 dark:text-gray-400">
              {{ getCurrentModelDescription }}
            </p>
          </div>
          <button @click="showModelBrowser = !showModelBrowser"
                  :aria-expanded="showModelBrowser"
                  aria-controls="model-browser"
                  class="flex-shrink-0 px-3 py-1 text-sm rounded-md transition-colors bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {{ showModelBrowser ? 'Hide' : 'Browse' }}
          </button>
        </div>
      </div>

      <!-- Model Browser -->
      <div v-if="showModelBrowser" id="model-browser" class="model-browser">
        <!-- Controls -->
        <div class="mb-4 space-y-3">
          <!-- Sort Controls -->
          <div class="flex items-center gap-2 flex-wrap">
            <label for="sort-by-select" class="text-sm text-gray-600 dark:text-gray-400">
              Sort by:
            </label>
            <select id="sort-by-select"
                    v-model="sortBy"
                    class="text-sm px-2 py-1 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="name">Name</option>
              <option value="context_length">Context Length</option>
              <option value="capabilities">Capabilities</option>
            </select>
            <button @click="sortReverse = !sortReverse"
                    :aria-label="sortReverse ? 'Sort ascending' : 'Sort descending'"
                    :aria-pressed="sortReverse"
                    class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <span class="transform inline-block transition-transform duration-200" :class="{ 'rotate-180': sortReverse }" aria-hidden="true">↑</span>
            </button>
          </div>

          <!-- Filter Controls -->
          <div class="flex items-center gap-2 flex-wrap">
            <label for="generation-filter" class="text-sm text-gray-600 dark:text-gray-400">
              Filter:
            </label>
            <select id="generation-filter"
                    v-model="generationFilter"
                    aria-label="Filter by generation"
                    class="text-sm px-2 py-1 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Generations</option>
              <option value="phi3">Phi3</option>
              <option value="llava">LLaVA</option>
              <option value="bakllava">BakLLaVA</option>
            </select>
            <select v-model="capabilityFilter"
                    aria-label="Filter by capability"
                    class="text-sm px-2 py-1 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Capabilities</option>
              <option value="text">Text</option>
              <option value="vision">Vision</option>
            </select>
          </div>
        </div>

        <!-- Model List -->
        <ul class="space-y-2 max-h-60 overflow-y-auto" role="listbox" :aria-label="`Available models, ${displayedModels.length} shown`">
          <li v-for="model in displayedModels"
              :key="model.name"
              role="option"
              :aria-selected="model.name === store.selectedModel"
              tabindex="0"
              class="p-3 rounded-lg cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="[
                model.name === store.selectedModel
                  ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-400 dark:ring-blue-500'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
              ]"
              @click="selectModel(model.name)"
              @keydown.enter.prevent="selectModel(model.name)"
              @keydown.space.prevent="selectModel(model.name)">
            <div class="flex justify-between items-start gap-2">
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">
                  {{ model.name }}
                </p>
                <p class="text-xs text-gray-600 dark:text-gray-400">
                  {{ model.description }}
                </p>
              </div>
              <div class="flex gap-1 flex-shrink-0">
                <span v-for="cap in model.capabilities"
                      :key="cap"
                      class="px-1.5 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                  {{ cap }}
                </span>
              </div>
            </div>
          </li>
        </ul>

        <!-- Empty model list state -->
        <p v-if="displayedModels.length === 0"
           class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No models match the current filters.
        </p>

        <!-- Pagination -->
        <div class="mt-4 flex justify-between items-center">
          <button @click="prevPage"
                  :disabled="currentPage === 1"
                  class="px-3 py-1 text-sm rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Previous page of models">
            Previous
          </button>
          <span class="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
            Page {{ currentPage }} of {{ totalPages }}
          </span>
          <button @click="nextPage"
                  :disabled="currentPage >= totalPages"
                  class="px-3 py-1 text-sm rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Next page of models">
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useStore } from '../store';

const store = useStore();

// Local state
const showModelBrowser = ref(false);
const sortBy = ref('name');
const sortReverse = ref(false);
const generationFilter = ref('');
const capabilityFilter = ref('');
const currentPage = ref(1);
const pageSize = ref(5);

// Computed properties
const filteredModels = computed(() => {
  let models = [...store.availableModels];

  if (generationFilter.value) {
    models = store.filterModelsByGeneration(models, generationFilter.value);
  }

  if (capabilityFilter.value) {
    models = store.filterModelsByCapability(models, capabilityFilter.value);
  }

  return store.sortModels(models, sortBy.value, sortReverse.value);
});

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredModels.value.length / pageSize.value));
});

const displayedModels = computed(() => {
  return store.getPagedModels(filteredModels.value, currentPage.value, pageSize.value);
});

const getCurrentModelDescription = computed(() => {
  const model = store.availableModels.find(m => m.name === store.selectedModel);
  return model?.description || 'Loading model information…';
});

// Methods
function selectModel(modelName) {
  store.setModel(modelName);
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
}

// Watch for filter changes to reset pagination
watch([generationFilter, capabilityFilter], () => {
  currentPage.value = 1;
});

// Initialize
onMounted(async () => {
  try {
    await store.detectModels();
  } catch (error) {
    console.error('Failed to detect models:', error);
  }
});
</script>

<style scoped>
.model-browser {
  @apply rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 mt-2;
}
</style>
