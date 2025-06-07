<template>
    <div class="loading-indicator" :class="{ 'is-overlay': overlay }">
        <div class="spinner"></div>
        <span v-if="message" class="message">{{ message }}</span>
    </div>
</template>

<script>
export default {
    name: 'LoadingIndicator',
    props: {
        message: {
            type: String,
            default: ''
        },
        overlay: {
            type: Boolean,
            default: false
        }
    }
}
</script>

<style scoped>
.loading-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
}

.loading-indicator.is-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 50;
}

.spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.message {
    color: inherit;
    font-size: 0.875rem;
}
</style> 