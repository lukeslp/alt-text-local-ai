<template>
  <div class="loading-indicator" :class="type">
    <!-- Progress Bar -->
    <div v-if="type === 'progress'" class="progress-bar">
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
      </div>
      <span v-if="showText" class="progress-text">{{ text || `${progress}%` }}</span>
    </div>

    <!-- Spinner -->
    <div v-else-if="type === 'spinner'" 
         class="spinner"
         :style="{ width: `${size}px`, height: `${size}px` }">
      <svg viewBox="0 0 24 24" :width="size" :height="size">
        <circle cx="12" cy="12" r="10" 
                stroke="currentColor" 
                fill="none" 
                stroke-width="2.5"
                stroke-linecap="round">
        </circle>
      </svg>
    </div>

    <!-- Skeleton -->
    <div v-else-if="type === 'skeleton'"
         class="skeleton"
         :style="{ 
           width: width || '100%',
           height: height || '1rem',
           borderRadius: radius || '0.25rem'
         }">
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoadingIndicator',
  props: {
    type: {
      type: String,
      default: 'spinner',
      validator: value => ['spinner', 'progress', 'skeleton'].includes(value)
    },
    progress: {
      type: Number,
      default: 0
    },
    text: {
      type: String,
      default: ''
    },
    showText: {
      type: Boolean,
      default: true
    },
    size: {
      type: Number,
      default: 24
    },
    width: {
      type: String,
      default: null
    },
    height: {
      type: String,
      default: null
    },
    radius: {
      type: String,
      default: null
    },
    label: {
      type: String,
      default: 'Loading...'
    }
  }
}
</script>

<style>
.loading-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-primary);
}

.progress-bar {
  width: 100%;
}

.progress-track {
  width: 100%;
  height: 4px;
  background: var(--color-surface-dark);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-accent);
  transition: width 0.3s ease;
}

.progress-text {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  text-align: center;
}

.spinner circle {
  animation: spin 1s linear infinite;
  transform-origin: center;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-surface-dark) 25%,
    var(--color-surface) 50%,
    var(--color-surface-dark) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}
</style> 