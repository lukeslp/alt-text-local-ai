import { ref } from 'vue';
import { useStore } from '../store';

export function useAccessibility() {
  const store = useStore();
  
  const isDark = ref(true);
  const isHighContrast = ref(true);
  const reduceMotion = ref(false);
  const baseFontSize = ref(16);
  const selectedFont = ref('Inter');

  function initializeAccessibility() {
    // Initialize with defaults (dark mode and high contrast)
    isDark.value = true;
    isHighContrast.value = true;
    
    // Apply initial classes
    updateAccessibilityClasses();
    
    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('theme')) {
        isDark.value = e.matches;
        updateAccessibilityClasses();
      }
    });
    
    window.matchMedia('(prefers-contrast: more)').addEventListener('change', e => {
      if (!localStorage.getItem('contrast')) {
        isHighContrast.value = e.matches;
        updateAccessibilityClasses();
      }
    });
    
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => {
      reduceMotion.value = e.matches;
      updateAccessibilityClasses();
    });
  }

  function updateAccessibilityClasses() {
    const html = document.documentElement;
    
    // Remove all theme classes first
    html.classList.remove('light', 'dark', 'high-contrast');
    
    // Add appropriate classes
    html.classList.add(isDark.value ? 'dark' : 'light');
    if (isHighContrast.value) {
      html.classList.add('high-contrast');
    }
    
    // Update motion preferences
    html.classList.toggle('reduce-motion', reduceMotion.value);
    
    // Store preferences
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
    localStorage.setItem('contrast', isHighContrast.value ? 'high' : 'normal');
    
    // Update meta theme color
    updateMetaThemeColor();
  }

  function updateMetaThemeColor() {
    // Get the computed background color
    const bgColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-bg').trim();
    
    // Update or create meta theme-color tag
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.content = bgColor;
  }

  function toggleTheme() {
    isDark.value = !isDark.value;
    updateAccessibilityClasses();
    announceThemeChange();
  }

  function toggleHighContrast() {
    isHighContrast.value = !isHighContrast.value;
    updateAccessibilityClasses();
    announceContrastChange();
  }

  function toggleReduceMotion() {
    reduceMotion.value = !reduceMotion.value;
    updateAccessibilityClasses();
    announceMotionChange();
  }

  function announceThemeChange() {
    const message = `Switched to ${isDark.value ? 'dark' : 'light'} mode`;
    announce(message);
  }

  function announceContrastChange() {
    const message = `${isHighContrast.value ? 'Enabled' : 'Disabled'} high contrast mode`;
    announce(message);
  }

  function announceMotionChange() {
    const message = `${reduceMotion.value ? 'Enabled' : 'Disabled'} reduced motion`;
    announce(message);
  }

  function announce(message) {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.classList.add('sr-only');
    document.body.appendChild(announcer);
    
    // Set the message after a brief delay to ensure it's announced
    setTimeout(() => {
      announcer.textContent = message;
      // Remove after announcement
      setTimeout(() => announcer.remove(), 1000);
    }, 100);
  }

  return {
    isDark,
    isHighContrast,
    reduceMotion,
    baseFontSize,
    selectedFont,
    initializeAccessibility,
    toggleTheme,
    toggleHighContrast,
    toggleReduceMotion,
    announce
  };
} 