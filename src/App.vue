<template>
  <div class="bg-gray-100 dark:bg-gray-900 min-h-screen">
    <!-- Skip to main content link -->
    <a href="#main-content" 
       class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-500 text-white p-4 z-50">
      Skip to main content
    </a>

    <div class="container mx-auto px-4 py-8">
      <header class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Alt Text AI</h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">Generate accessible alt text for your images using AI</p>
      </header>

      <main id="main-content" class="grid grid-cols-1 lg:grid-cols-3 gap-8" role="main">
        <!-- Primary Content -->
        <div class="lg:col-span-2 space-y-6">
          <ImageUploader @image-processed="handleImageProcessed" />
          <ResultsList :results="results" />
        </div>

        <!-- Settings Panel -->
        <div class="lg:col-span-1">
          <SettingsPanel />
        </div>
      </main>

      <!-- Social Badges -->
      <div class="badges-row">
        <a href="https://github.com/lukeslp/alt-text-local-ai" target="_blank" rel="noopener noreferrer" class="badge-link">
          <img src="https://actuallyusefulai.com/alt/dev/assets/github.png" alt="View on GitHub" width="48" height="48">
        </a>
        <a href="https://ollama.com/coolhand/impossible_alt" target="_blank" rel="noopener noreferrer" class="badge-link">
          <img src="https://actuallyusefulai.com/alt/dev/assets/ollama.png" alt="View on Ollama" width="48" height="48">
        </a>
        <a href="https://patreon.com/lukeslp" target="_blank" rel="noopener noreferrer" class="badge-link">
          <img src="https://actuallyusefulai.com/alt/dev/assets/patreon.png" alt="Support on Patreon" width="48" height="48">
        </a>
        <a href="https://lukesteuber.substack.com" target="_blank" rel="noopener noreferrer" class="badge-link">
          <img src="https://actuallyusefulai.com/alt/dev/assets/substack.png" alt="Read Luke's Substack" width="48" height="48">
        </a>
        <a href="https://lukesteuber.com" target="_blank" rel="noopener noreferrer" class="badge-link">
          <img src="https://actuallyusefulai.com/alt/dev/assets/frantic.png" alt="Visit Luke Steuber's website" width="48" height="48">
        </a>
      </div>
    </div>

    <!-- Status Feed -->
    <div
      v-if="feedMessages.length > 0"
      class="fixed bottom-4 right-4 w-96 max-w-full space-y-2 z-50"
    >
      <TransitionGroup name="fade">
        <div
          v-for="message in feedMessages"
          :key="message.id"
          class="p-4 rounded-lg shadow-lg"
          :class="{
            'bg-blue-500 text-white': message.type === 'info',
            'bg-green-500 text-white': message.type === 'success',
            'bg-red-500 text-white': message.type === 'error',
            'bg-yellow-500 text-white': message.type === 'warning'
          }"
        >
          {{ message.text }}
        </div>
      </TransitionGroup>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
        <div class="flex items-center justify-center mb-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
        <p class="text-center text-gray-600 dark:text-gray-400">{{ loadingMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { TransitionGroup } from 'vue';
import { useStore } from './store';
import ImageUploader from './components/ImageUploader.vue';
import ResultsList from './components/ResultsList.vue';
import SettingsPanel from './components/SettingsPanel.vue';

const store = useStore();
const loading = ref(false);
const loadingMessage = ref('');

// Computed properties from store
const results = computed(() => store.results);
const feedMessages = computed(() => store.feedMessages);

// Handle processed images
function handleImageProcessed(result) {
  if (result.error) {
    store.addFeedMessage(result.error, 'error');
  }
}

// Initialize theme
onMounted(() => {
  // Apply theme from store
  document.documentElement.classList.toggle('dark', store.isDarkMode);
  
  // Apply font settings
  document.documentElement.setAttribute('data-font', store.selectedFont);
  document.documentElement.style.setProperty('--base-font-size', `${store.baseFontSize}px`);
});
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* Base font sizes */
:root {
  --base-font-size: 16px;
  font-size: var(--base-font-size);
}

/* Font families */
[data-font="playfair"] {
  font-family: "Playfair Display", serif;
}

[data-font="inter"] {
  font-family: "Inter", sans-serif;
}

[data-font="roboto"] {
  font-family: "Roboto", sans-serif;
}

[data-font="opensans"] {
  font-family: "Open Sans", sans-serif;
}

/* Social Badges Component */
.badges-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  margin-top: 2rem;
  flex-wrap: wrap;
}

.badge-link {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease-in-out, opacity 0.2s ease-in-out;
  text-decoration: none;
  opacity: 0.8;
}

.badge-link:hover {
  transform: translateY(-2px);
  opacity: 1;
}

.badge-link img {
  width: 48px;
  height: 48px;
  border-radius: 8px;
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .badges-row {
    gap: 0.75rem;
    padding: 1rem;
  }
  
  .badge-link img {
    width: 40px;
    height: 40px;
  }
}
</style> 