export const ProcessingState = {
    name: 'ProcessingState',
    template: `
        <div class="processing-state" :class="stateClass">
            <div class="state-icon">
                <span v-if="phase === 'idle'" class="icon">⏸</span>
                <span v-else-if="phase === 'processing'" class="icon spinning">⚙️</span>
                <span v-else-if="phase === 'complete'" class="icon">✅</span>
                <span v-else-if="phase === 'error'" class="icon">❌</span>
            </div>
            <div class="state-content">
                <div class="state-header">
                    <span class="state-label">{{ label }}</span>
                    <span v-if="showProgress" class="state-progress">{{ progress }}%</span>
                </div>
                <div v-if="status" class="state-status">{{ status }}</div>
                <div v-if="phase === 'processing'" class="progress-bar">
                    <div class="progress-track">
                        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
                    </div>
                </div>
            </div>
        </div>
    `,
    props: {
        label: {
            type: String,
            required: true
        },
        status: {
            type: String,
            default: ''
        },
        progress: {
            type: Number,
            default: 0
        },
        phase: {
            type: String,
            default: 'idle',
            validator: value => ['idle', 'processing', 'complete', 'error'].includes(value)
        }
    },
    computed: {
        stateClass() {
            return {
                'is-idle': this.phase === 'idle',
                'is-processing': this.phase === 'processing',
                'is-complete': this.phase === 'complete',
                'is-error': this.phase === 'error'
            }
        },
        showProgress() {
            return this.phase === 'processing' && this.progress > 0
        }
    }
}; 