<template>
  <div class="bg-gray-100 dark:bg-gray-900 min-h-screen">
    <!-- Setup Wizard -->
    <SetupWizard v-if="showSetup" @setup-complete="handleSetupComplete" />

    <!-- Skip to main content link -->
    <a href="#main-content"
       class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white p-4 z-50 rounded focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600">
      Skip to main content
    </a>

    <div class="container mx-auto px-4 py-8">
      <header class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Alt Text Generator</h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">Generate accessible alt text for your images using a local language model</p>
      </header>

      <main id="main-content" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Primary Content -->
        <div class="lg:col-span-2 space-y-6">
          <ImageUploader @image-processed="handleImageProcessed" />
          <ResultsList />
        </div>

        <!-- Settings Panel -->
        <div class="lg:col-span-1">
          <SettingsPanel />
        </div>
      </main>

      <!-- Social Badges -->
      <nav aria-label="Social links" class="badges-row">
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
      </nav>
    </div>

    <!-- Status Feed — toasts -->
    <div
      v-if="feedMessages.length > 0"
      aria-live="polite"
      aria-atomic="false"
      class="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] space-y-2 z-50"
    >
      <TransitionGroup name="fade">
        <div
          v-for="message in feedMessages"
          :key="message.id"
          :role="message.type === 'error' || message.type === 'warning' ? 'alert' : 'status'"
          class="p-4 rounded-lg shadow-lg text-white text-sm"
          :class="{
            'bg-blue-600': message.type === 'info',
            'bg-green-600': message.type === 'success',
            'bg-red-600': message.type === 'error',
            'bg-yellow-600': message.type === 'warning'
          }"
        >
          {{ message.text }}
        </div>
      </TransitionGroup>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading"
         role="dialog"
         aria-modal="true"
         aria-label="Loading"
         class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
        <div class="flex items-center justify-center mb-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" aria-hidden="true"></div>
        </div>
        <p class="text-center text-gray-600 dark:text-gray-400" aria-live="polite">{{ loadingMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, TransitionGroup } from 'vue';
import { useStore } from './store';
import ImageUploader from './components/ImageUploader.vue';
import ResultsList from './components/ResultsList.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import SetupWizard from './components/SetupWizard.vue';

const store = useStore();
const loading = ref(false);
const loadingMessage = ref('');
const showSetup = ref(!localStorage.getItem('setupComplete'));

// Computed properties from store
const feedMessages = computed(() => store.feedMessages);

// Handle processed images
function handleImageProcessed(result) {
  if (result.error) {
    store.addFeedMessage(result.error, 'error');
  }
}

function handleSetupComplete() {
  showSetup.value = false;
}

// Initialize theme and font settings
onMounted(() => {
  document.documentElement.classList.toggle('dark', store.isDarkMode);
  document.documentElement.setAttribute('data-font', store.selectedFont);
  document.documentElement.style.setProperty('--base-font-size', `${store.baseFontSize}px`);
});
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(1rem);
}

/* Base font size */
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

/* Social Badges */
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
  border-radius: 8px;
}

.badge-link:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 3px;
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
