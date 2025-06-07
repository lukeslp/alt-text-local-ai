// DEPRECATED – archived by Codex 2025-06-07. Safe to delete after 90 days.
export const ProcessingState = {
    name: 'ProcessingState',
    props: {
        status: {
            type: String,
            required: true
        },
        progress: {
            type: Number,
            default: 0
        },
        phase: {
            type: String,
            default: 'idle'  // idle, processing, success, error
        }
    },
    template: `
        <div class="processing-state" :class="phase">
            <div class="processing-content">
                <div class="processing-icon">
                    <!-- Success Icon -->
                    <svg v-if="phase === 'success'" class="icon success" viewBox="0 0 24 24">
                        <path d="M20 6L9 17l-5-5"></path>
                    </svg>
                    <!-- Error Icon -->
                    <svg v-else-if="phase === 'error'" class="icon error" viewBox="0 0 24 24">
                        <path d="M18 6L6 18M6 6l12 12"></path>
                    </svg>
                    <!-- Processing Animation -->
                    <div v-else-if="phase === 'processing'" class="processing-ring">
                        <div></div><div></div><div></div>
                    </div>
                </div>
                <div class="status-text">{{ status }}</div>
                <div v-if="phase === 'processing'" class="progress-track">
                    <div class="progress-fill" :style="{ width: progress + '%' }">
                        <div class="progress-glow"></div>
                    </div>
                </div>
            </div>
        </div>
    `
} 