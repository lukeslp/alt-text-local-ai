<template>
  <div class="bg-surface border-color rounded-lg shadow-lg p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold">Settings</h2>
    </div>
    
    <div class="space-y-6">
      <!-- Font Settings -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold">Typography</h3>
        
        <!-- Font Family -->
        <div class="space-y-2">
          <label class="block text-sm font-medium">Font Family</label>
          <select v-model="store.selectedFont"
                  class="w-full px-3 py-2 bg-surface border-color rounded-md shadow-sm focus:border-primary focus:ring-primary">
            <option value="var(--font-playfair)">Playfair Display (Default)</option>
            <option value="var(--font-opendyslexic)">OpenDyslexic</option>
            <option value="var(--font-atkinson)">Atkinson Hyperlegible</option>
            <option value="var(--font-inter)">Inter</option>
          </select>
        </div>

        <!-- Font Size -->
        <div class="space-y-2">
          <label class="block text-sm font-medium">Font Size</label>
          <div class="flex items-center gap-4">
            <button @click="store.decreaseFontSize"
                    class="btn-secondary"
                    aria-label="Decrease font size">
              A-
            </button>
            <span class="text-sm">{{ store.baseFontSize }}px</span>
            <button @click="store.increaseFontSize"
                    class="btn-secondary"
                    aria-label="Increase font size">
              A+
            </button>
          </div>
        </div>
      </div>

      <!-- Accessibility Settings -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold">Accessibility</h3>
        
        <!-- Theme Toggle -->
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">Dark Mode</span>
          <button @click="accessibility.toggleTheme" 
                  class="relative inline-flex items-center h-6 rounded-full w-11 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  :class="accessibility.isDark ? 'bg-primary' : 'bg-gray-200'"
                  role="switch"
                  :aria-checked="accessibility.isDark">
            <span class="sr-only">Toggle dark mode</span>
            <span class="translate-x-1 inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out"
                  :class="{ 'translate-x-6': accessibility.isDark }"></span>
          </button>
        </div>

        <!-- High Contrast Toggle -->
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">High Contrast</span>
          <button @click="accessibility.toggleHighContrast"
                  class="relative inline-flex items-center h-6 rounded-full w-11 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  :class="accessibility.isHighContrast ? 'bg-primary' : 'bg-gray-200'"
                  role="switch"
                  :aria-checked="accessibility.isHighContrast">
            <span class="sr-only">Toggle high contrast</span>
            <span class="translate-x-1 inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out"
                  :class="{ 'translate-x-6': accessibility.isHighContrast }"></span>
          </button>
        </div>

        <!-- Reduced Motion Toggle -->
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">Reduce Motion</span>
          <button @click="accessibility.toggleReduceMotion"
                  class="relative inline-flex items-center h-6 rounded-full w-11 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  :class="accessibility.reduceMotion ? 'bg-primary' : 'bg-gray-200'"
                  role="switch"
                  :aria-checked="accessibility.reduceMotion">
            <span class="sr-only">Toggle reduced motion</span>
            <span class="translate-x-1 inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out"
                  :class="{ 'translate-x-6': accessibility.reduceMotion }"></span>
          </button>
        </div>
      </div>

      <!-- Status Messages -->
      <div class="space-y-2">
        <div v-for="message in store.feedMessages.slice(0, 5)" 
             :key="message.id"
             :class="{
               'text-green-500': message.type === 'success',
               'text-red-500': message.type === 'error',
               'text-yellow-500': message.type === 'warning',
               'text-secondary': message.type === 'info'
             }"
             class="text-sm">
          {{ message.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useStore } from '../store';
import { useAccessibility } from '../composables/useAccessibility';

const store = useStore();
const accessibility = useAccessibility();

// Watch for font changes
watch(() => store.selectedFont, (newFont) => {
  store.setFont(newFont);
  accessibility.announce(`Font changed to ${newFont}`);
});
</script> 