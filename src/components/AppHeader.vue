<template>
  <header class="mb-8" role="banner">
    <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-2">Alt Text Generator</h1>
    <p class="text-gray-600 dark:text-gray-300">Generate accessible alt text for your images using AI</p>
    
    <!-- Theme and Accessibility Controls -->
    <div class="mt-4 flex gap-4 items-center">
      <button @click="accessibility.toggleTheme" 
              class="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
              :aria-label="accessibility.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
              role="switch"
              :aria-checked="accessibility.isDark">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path v-if="accessibility.isDark" 
                stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"/>
          <path v-else 
                stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
        </svg>
        <span class="text-sm">{{ accessibility.isDark ? 'Light Mode' : 'Dark Mode' }}</span>
      </button>
      
      <button @click="accessibility.toggleHighContrast"
              class="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
              role="switch"
              :aria-checked="accessibility.isHighContrast">
        <span class="text-sm">High Contrast</span>
      </button>
      
      <button @click="accessibility.toggleReduceMotion"
              class="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
              role="switch"
              :aria-checked="accessibility.reduceMotion">
        <span class="text-sm">Reduce Motion</span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { useAccessibility } from '../composables/useAccessibility';

const accessibility = useAccessibility();
</script> 