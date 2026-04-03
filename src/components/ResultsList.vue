<template>
  <section aria-labelledby="results-title" class="results-section">
    <h2 id="results-title" class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Results</h2>

    <!-- Export controls -->
    <div v-if="completedCount > 0" class="flex items-center gap-2 mb-4 flex-wrap">
      <span class="text-sm text-gray-600 dark:text-gray-400">{{ completedCount }} result{{ completedCount > 1 ? 's' : '' }}</span>
      <button @click="exportActions.copyAllToClipboard()"
              class="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
        Copy All
      </button>
      <button @click="exportActions.downloadJSON()"
              class="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400">
        JSON
      </button>
      <button @click="exportActions.downloadCSV()"
              class="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400">
        CSV
      </button>
      <button @click="exportActions.downloadHTML()"
              class="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400">
        HTML
      </button>
    </div>

    <!-- Empty state -->
    <div v-if="store.results.length === 0"
         class="flex flex-col items-center justify-center py-16 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
      <svg class="w-12 h-12 mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
      <p class="text-base font-medium mb-1">No results yet</p>
      <p class="text-sm">Upload or paste an image above to generate alt text.</p>
    </div>

    <TransitionGroup name="results" tag="div" class="space-y-4">
      <div v-for="result in store.results" :key="result.id"
           class="result-item bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700">
        <div class="flex gap-4">
          <!-- Image Preview -->
          <div class="w-32 h-32 flex-shrink-0 relative">
            <img :src="result.image"
                 :alt="result.altText ? `Preview: ${result.altText}` : 'Image being processed'"
                 class="w-full h-full object-cover rounded">
            <!-- Processing overlay — role=status so screen readers announce it once -->
            <div v-if="result.processing"
                 role="status"
                 aria-label="Generating alt text"
                 class="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
              <div class="text-white text-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto" aria-hidden="true"></div>
                <div class="mt-2 text-sm">Processing…</div>
              </div>
            </div>
          </div>

          <!-- Alt Text Content -->
          <div class="flex-1 min-w-0">
            <!-- Error state -->
            <div v-if="result.error"
                 role="alert"
                 class="flex items-start gap-2 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-3">
              <svg class="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              <span>{{ result.error }}</span>
            </div>

            <!-- Streaming state — show text as it arrives -->
            <div v-else-if="result.processing && result.altText" class="space-y-3">
              <p class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed break-words">
                {{ result.altText }}<span class="streaming-cursor" aria-hidden="true">|</span>
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400" role="status">Generating...</p>
            </div>

            <!-- Success / view state -->
            <div v-else-if="!result.processing" class="space-y-3">
              <!-- Inline edit textarea -->
              <div v-if="editingId === result.id">
                <label :for="`edit-${result.id}`" class="sr-only">Edit alt text</label>
                <textarea
                  :id="`edit-${result.id}`"
                  ref="editTextarea"
                  v-model="editDraft"
                  rows="4"
                  class="w-full px-3 py-2 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  aria-describedby="edit-hint"
                  @keydown.escape="cancelEdit"
                  @keydown.ctrl.enter="saveEdit(result)"
                  @keydown.meta.enter="saveEdit(result)"
                ></textarea>
                <div class="mt-1 flex items-center justify-between">
                  <p id="edit-hint" class="text-xs text-gray-500 dark:text-gray-400">
                    Ctrl+Enter to save, Escape to cancel
                  </p>
                  <span class="text-xs text-gray-400 dark:text-gray-500" aria-live="polite">
                    {{ editDraft.length }} chars
                  </span>
                </div>
                <div class="flex gap-2 mt-2">
                  <button @click="saveEdit(result)"
                          class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800">
                    Save
                  </button>
                  <button @click="cancelEdit"
                          class="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800">
                    Cancel
                  </button>
                </div>
              </div>

              <!-- Read-only display -->
              <div v-else>
                <p class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed break-words">{{ result.altText }}</p>
                <div class="flex gap-2 mt-3">
                  <button @click="copyAltText(result.altText)"
                          :aria-label="`Copy alt text for image ${result.id}`"
                          class="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800">
                    Copy
                  </button>
                  <button @click="startEditing(result)"
                          :aria-label="`Edit alt text for image ${result.id}`"
                          class="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </section>
</template>

<script setup>
import { ref, computed, nextTick, TransitionGroup } from 'vue';
import { useStore } from '../store';
import { useAccessibility } from '../composables/useAccessibility';
import { useExport } from '../composables/useExport';

const store = useStore();
const { announce } = useAccessibility();
const exportActions = useExport();

const completedCount = computed(() =>
  store.results.filter(r => r.altText && !r.processing).length
);

// Edit state
const editingId = ref(null);
const editDraft = ref('');
const editTextarea = ref(null);

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

async function startEditing(result) {
  editingId.value = result.id;
  editDraft.value = result.altText || '';
  // Focus the textarea after Vue renders it
  await nextTick();
  editTextarea.value?.focus();
}

function saveEdit(result) {
  const trimmed = editDraft.value.trim();
  if (!trimmed) return;
  store.updateResult({ ...result, altText: trimmed });
  announce('Alt text updated');
  store.addFeedMessage('Alt text updated', 'success');
  editingId.value = null;
  editDraft.value = '';
}

function cancelEdit() {
  editingId.value = null;
  editDraft.value = '';
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

.streaming-cursor {
  animation: blink 1s step-end infinite;
  font-weight: bold;
  color: theme('colors.blue.500');
}

@keyframes blink {
  50% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .streaming-cursor {
    animation: none;
  }
}
</style>
