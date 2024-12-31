<template>
  <div class="bg-gray-100 dark:bg-gray-900 min-h-screen">
    <!-- Skip to main content link -->
    <a href="#main-content" 
       class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-500 text-white p-4 z-50">
      Skip to main content
    </a>

    <div class="container mx-auto px-4 py-8">
      <AppHeader />

      <main id="main-content" class="grid grid-cols-1 lg:grid-cols-3 gap-8" role="main">
        <!-- Primary Content -->
        <div class="lg:col-span-2 space-y-6">
          <ImageUploader />
          <ResultsList />
        </div>

        <!-- Settings Panel -->
        <div class="lg:col-span-1">
          <SettingsPanel />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
import { TransitionGroup } from 'vue';
import { useStore } from './store';
import AppHeader from './components/AppHeader.vue';
import ImageUploader from './components/ImageUploader.vue';
import ResultsList from './components/ResultsList.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import { useAccessibility } from './composables/useAccessibility';

const store = useStore();
const { initializeAccessibility } = useAccessibility();

onMounted(() => {
  initializeAccessibility();
  window.addEventListener('keydown', handleKeyboardShortcuts);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyboardShortcuts);
});

function handleKeyboardShortcuts(event) {
  // Ctrl/Cmd + / to toggle settings
  if ((event.ctrlKey || event.metaKey) && event.key === '/') {
    event.preventDefault();
    store.toggleSettings();
  }
  // Ctrl/Cmd + . to toggle status feed
  if ((event.ctrlKey || event.metaKey) && event.key === '.') {
    event.preventDefault();
    store.toggleStatusFeed();
  }
}
</script>

<style>
@import './styles/main.css';
</style> 