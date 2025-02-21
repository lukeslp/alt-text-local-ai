<template>
  <div class="model-selector">
    <!-- Model Selection Interface -->
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2"
             :class="store.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'">
        Model Selection
      </label>

      <!-- Current Model Display -->
      <div class="mb-4 p-3 rounded-lg"
           :class="store.theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'">
        <h4 class="text-sm font-medium mb-1"
            :class="store.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'">
          Current Model
        </h4>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-bold"
               :class="store.theme === 'dark' ? 'text-gray-200' : 'text-gray-900'">
              {{ store.selectedModel }}
            </p>
            <p class="text-xs"
               :class="store.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'">
              {{ getCurrentModelDescription }}
            </p>
          </div>
          <button @click="showModelBrowser = !showModelBrowser"
                  class="px-3 py-1 text-sm rounded-md transition-colors"
                  :class="store.theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'">
            {{ showModelBrowser ? 'Hide' : 'Browse' }}
          </button>
        </div>
      </div>

      <!-- Model Browser -->
      <div v-if="showModelBrowser" class="model-browser">
        <!-- Controls -->
        <div class="mb-4 space-y-3">
          <!-- Sort Controls -->
          <div class="flex items-center space-x-2">
            <label class="text-sm"
                   :class="store.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'">
              Sort by:
            </label>
            <select v-model="sortBy"
                    class="text-sm px-2 py-1 rounded"
                    :class="store.theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-700'">
              <option value="name">Name</option>
              <option value="context_length">Context Length</option>
              <option value="capabilities">Capabilities</option>
            </select>
            <button @click="sortReverse = !sortReverse"
                    class="p-1 rounded"
                    :class="store.theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'">
              <span class="transform inline-block" :class="{ 'rotate-180': sortReverse }">↑</span>
            </button>
          </div>

          <!-- Filter Controls -->
          <div class="flex items-center space-x-2">
            <label class="text-sm"
                   :class="store.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'">
              Filter:
            </label>
            <select v-model="generationFilter"
                    class="text-sm px-2 py-1 rounded"
                    :class="store.theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-700'">
              <option value="">All Generations</option>
              <option value="phi3">Phi3</option>
              <option value="llava">LLaVA</option>
              <option value="bakllava">BakLLaVA</option>
            </select>
            <select v-model="capabilityFilter"
                    class="text-sm px-2 py-1 rounded"
                    :class="store.theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-700'">
              <option value="">All Capabilities</option>
              <option value="text">Text</option>
              <option value="vision">Vision</option>
            </select>
          </div>
        </div>

        <!-- Model List -->
        <div class="space-y-2 max-h-60 overflow-y-auto">
          <div v-for="model in displayedModels"
               :key="model.name"
               class="p-3 rounded-lg cursor-pointer transition-colors"
               :class="[
                 store.theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
                 model.name === store.selectedModel ? 
                   (store.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100') : 
                   (store.theme === 'dark' ? 'bg-gray-800' : 'bg-white')
               ]"
               @click="selectModel(model.name)">
            <div class="flex justify-between items-start">
              <div>
                <p class="text-sm font-medium"
                   :class="store.theme === 'dark' ? 'text-gray-200' : 'text-gray-900'">
                  {{ model.name }}
                </p>
                <p class="text-xs"
                   :class="store.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'">
                  {{ model.description }}
                </p>
              </div>
              <div class="flex space-x-1">
                <span v-for="cap in model.capabilities"
                      :key="cap"
                      class="px-1.5 py-0.5 text-xs rounded"
                      :class="store.theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'">
                  {{ cap }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div class="mt-4 flex justify-between items-center">
          <button @click="prevPage"
                  :disabled="currentPage === 1"
                  class="px-3 py-1 text-sm rounded disabled:opacity-50"
                  :class="store.theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'">
            Previous
          </button>
          <span class="text-sm"
                :class="store.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'">
            Page {{ currentPage }} of {{ totalPages }}
          </span>
          <button @click="nextPage"
                  :disabled="currentPage >= totalPages"
                  class="px-3 py-1 text-sm rounded disabled:opacity-50"
                  :class="store.theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'">
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
  
  // Apply generation filter
  if (generationFilter.value) {
    models = store.filterModelsByGeneration(models, generationFilter.value);
  }
  
  // Apply capability filter
  if (capabilityFilter.value) {
    models = store.filterModelsByCapability(models, capabilityFilter.value);
  }
  
  // Apply sorting
  return store.sortModels(models, sortBy.value, sortReverse.value);
});

const totalPages = computed(() => {
  return Math.ceil(filteredModels.value.length / pageSize.value);
});

const displayedModels = computed(() => {
  return store.getPagedModels(filteredModels.value, currentPage.value, pageSize.value);
});

const getCurrentModelDescription = computed(() => {
  const model = store.availableModels.find(m => m.name === store.selectedModel);
  return model?.description || 'Loading model information...';
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
  @apply rounded-lg border p-4 mt-2;
  border-color: v-bind(store.theme === 'dark' ? '#374151' : '#E5E7EB');
  background-color: v-bind(store.theme === 'dark' ? '#1F2937' : '#FFFFFF');
}
</style> 