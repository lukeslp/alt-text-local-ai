<template>
  <div 
    v-if="loading" 
    class="loading-indicator"
    role="status"
    :aria-label="label">
    
    <!-- Spinner -->
    <div v-if="type === 'spinner'" class="spinner">
      <img 
        src="@/assets/images/color_spinner_transparent.gif" 
        :width="size" 
        :height="size" 
        alt=""
        class="spinner-gif" />
    </div>
    
    <!-- Progress Bar -->
    <div v-else-if="type === 'progress'" class="progress" :class="{ indeterminate: !progress }">
      <div 
        class="progress-bar"
        :style="progress ? { width: `${progress}%` } : undefined">
      </div>
    </div>
    
    <!-- Skeleton -->
    <div v-else-if="type === 'skeleton'"
         class="skeleton"
         :style="{
           width: width,
           height: height,
           borderRadius: radius
         }">
    </div>
    
    <!-- Loading Text -->
    <span v-if="showText" class="loading-text">{{ text || 'Loading...' }}</span>
  </div>
</template>

<script setup>
defineProps({
  loading: {
    type: Boolean,
    default: true
  },
  type: {
    type: String,
    default: 'spinner',
    validator: (value) => ['spinner', 'progress', 'skeleton'].includes(value)
  },
  progress: {
    type: Number,
    default: null
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
    default: 48
  },
  width: {
    type: String,
    default: '100%'
  },
  height: {
    type: String,
    default: '1.5rem'
  },
  radius: {
    type: String,
    default: '4px'
  },
  label: {
    type: String,
    default: 'Loading'
  }
})
</script>

<style scoped>
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner-gif {
  display: block;
}

.progress {
  width: 100%;
  height: 4px;
  background: var(--color-surface-dark);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--color-accent);
  transition: width 0.3s ease;
}

.progress.indeterminate .progress-bar {
  width: 50%;
  animation: indeterminate 1.5s infinite ease-in-out;
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

@keyframes indeterminate {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(200%);
  }
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}
</style> 