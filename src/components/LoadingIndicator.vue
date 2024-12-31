<template>
  <div 
    v-if="loading" 
    class="loading-indicator"
    role="status"
    :aria-label="label">
    
    <!-- Circular Loader -->
    <div v-if="type === 'spinner'" class="loading-circle"></div>
    
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