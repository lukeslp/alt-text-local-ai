<template>
  <div class="bg-surface border-color rounded-lg shadow-lg p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
    </div>

    <div class="space-y-6">
      <!-- Model Selection -->
      <ModelSelector />

      <!-- Font Settings -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Typography</h3>

        <!-- Font Family -->
        <div class="space-y-2">
          <label for="font-family-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Font Family
          </label>
          <select id="font-family-select"
                  v-model="store.selectedFont"
                  class="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
            <option value="var(--font-playfair)">Playfair Display (Default)</option>
            <option value="var(--font-opendyslexic)">OpenDyslexic</option>
            <option value="var(--font-atkinson)">Atkinson Hyperlegible</option>
            <option value="var(--font-inter)">Inter</option>
          </select>
        </div>

        <!-- Font Size -->
        <div class="space-y-2">
          <span id="font-size-label" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Font Size
          </span>
          <div class="flex items-center gap-4" role="group" aria-labelledby="font-size-label">
            <button @click="store.decreaseFontSize"
                    class="btn-secondary px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    :aria-label="`Decrease font size, currently ${store.baseFontSize}px`"
                    :disabled="store.baseFontSize <= 12">
              A−
            </button>
            <span class="text-sm text-gray-700 dark:text-gray-300 min-w-[3rem] text-center" aria-live="polite" aria-atomic="true">
              {{ store.baseFontSize }}px
            </span>
            <button @click="store.increaseFontSize"
                    class="btn-secondary px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    :aria-label="`Increase font size, currently ${store.baseFontSize}px`"
                    :disabled="store.baseFontSize >= 24">
              A+
            </button>
          </div>
        </div>
      </div>

      <!-- Accessibility Settings -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Accessibility</h3>

        <!-- Theme Toggle -->
        <div class="flex items-center justify-between">
          <span id="dark-mode-label" class="text-sm font-medium text-gray-700 dark:text-gray-300">Dark Mode</span>
          <button @click="accessibility.toggleTheme"
                  class="relative inline-flex items-center h-6 rounded-full w-11 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  :class="accessibility.isDark ? 'bg-blue-600' : 'bg-gray-200'"
                  role="switch"
                  :aria-checked="String(accessibility.isDark)"
                  aria-labelledby="dark-mode-label">
            <span class="sr-only">{{ accessibility.isDark ? 'Disable dark mode' : 'Enable dark mode' }}</span>
            <span class="inline-block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ease-in-out"
                  :class="accessibility.isDark ? 'translate-x-6' : 'translate-x-1'"></span>
          </button>
        </div>

        <!-- High Contrast Toggle -->
        <div class="flex items-center justify-between">
          <span id="high-contrast-label" class="text-sm font-medium text-gray-700 dark:text-gray-300">High Contrast</span>
          <button @click="accessibility.toggleHighContrast"
                  class="relative inline-flex items-center h-6 rounded-full w-11 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  :class="accessibility.isHighContrast ? 'bg-blue-600' : 'bg-gray-200'"
                  role="switch"
                  :aria-checked="String(accessibility.isHighContrast)"
                  aria-labelledby="high-contrast-label">
            <span class="sr-only">{{ accessibility.isHighContrast ? 'Disable high contrast' : 'Enable high contrast' }}</span>
            <span class="inline-block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ease-in-out"
                  :class="accessibility.isHighContrast ? 'translate-x-6' : 'translate-x-1'"></span>
          </button>
        </div>

        <!-- Reduced Motion Toggle -->
        <div class="flex items-center justify-between">
          <span id="reduce-motion-label" class="text-sm font-medium text-gray-700 dark:text-gray-300">Reduce Motion</span>
          <button @click="accessibility.toggleReduceMotion"
                  class="relative inline-flex items-center h-6 rounded-full w-11 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  :class="accessibility.reduceMotion ? 'bg-blue-600' : 'bg-gray-200'"
                  role="switch"
                  :aria-checked="String(accessibility.reduceMotion)"
                  aria-labelledby="reduce-motion-label">
            <span class="sr-only">{{ accessibility.reduceMotion ? 'Disable reduced motion' : 'Enable reduced motion' }}</span>
            <span class="inline-block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ease-in-out"
                  :class="accessibility.reduceMotion ? 'translate-x-6' : 'translate-x-1'"></span>
          </button>
        </div>
      </div>

      <!-- Status Messages -->
      <div v-if="store.feedMessages.length > 0"
           role="status"
           aria-live="polite"
           aria-label="Recent status messages"
           class="space-y-1">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Recent</h4>
        <div v-for="message in store.feedMessages.slice(0, 5)"
             :key="message.id"
             :class="{
               'text-green-700 dark:text-green-400': message.type === 'success',
               'text-red-700 dark:text-red-400': message.type === 'error',
               'text-yellow-700 dark:text-yellow-400': message.type === 'warning',
               'text-gray-600 dark:text-gray-400': message.type === 'info'
             }"
             class="text-xs leading-snug">
          {{ message.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { watch } from 'vue';
import { useStore } from '../store';
import { useAccessibility } from '../composables/useAccessibility';
import ModelSelector from './ModelSelector.vue';

const store = useStore();
const accessibility = useAccessibility();

// Watch for font changes
watch(() => store.selectedFont, (newFont) => {
  store.setFont(newFont);
  accessibility.announce(`Font changed to ${newFont}`);
});
</script>
