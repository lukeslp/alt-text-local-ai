<!-- Inline pulse loader for buttons and small UI elements -->
<template>
  <Transition name="fade">
    <span 
      v-if="loading" 
      class="pulse-loader" 
      role="status"
      :class="{ 'ml-2': showMargin }"
      aria-label="Loading">
    </span>
  </Transition>
</template>

<script setup>
defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  showMargin: {
    type: Boolean,
    default: true
  }
})
</script>

<style scoped>
.ml-2 {
  margin-left: 0.5rem;
}
</style> 