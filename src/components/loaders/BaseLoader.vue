<!-- Base loader component with progress bar -->
<template>
  <Transition name="fade">
    <div v-if="loading" class="loader-bar" role="progressbar" aria-valuetext="Loading..."></div>
  </Transition>
</template>

<script setup>
defineProps({
  loading: {
    type: Boolean,
    default: false
  }
})
</script> 