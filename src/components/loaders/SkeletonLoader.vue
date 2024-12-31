<!-- Skeleton loader for content placeholders -->
<template>
  <div 
    v-if="loading" 
    class="skeleton-load"
    role="status"
    aria-label="Loading content"
    :style="{
      width: width,
      height: height,
      borderRadius: radius
    }">
  </div>
</template>

<script setup>
defineProps({
  loading: {
    type: Boolean,
    default: false
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
  }
})
</script> 