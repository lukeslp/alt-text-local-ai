<template>
  <div class="setup-wizard">
    <div v-if="loading" class="loading-state">
      <img src="@/assets/images/color_spinner_transparent.gif" alt="Loading..." class="loading-spinner" />
      <p>{{ loadingMessage }}</p>
    </div>
  </div>
</template>

<style scoped>
.loading-spinner {
  width: 64px;
  height: 64px;
  margin-bottom: 1rem;
}
</style> 