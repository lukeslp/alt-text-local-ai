export const AltTextEditor = {
    template: `
        <div class="alt-text-editor p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <div class="alt-text-display mb-4">
                <p v-if="!isEditing" class="alt-text text-lg text-gray-800 dark:text-gray-200">{{ modelValue }}</p>
                <textarea
                    v-else
                    :value="modelValue"
                    @input="$emit('update:modelValue', $event.target.value)"
                    class="w-full h-32 p-2 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    @keydown.esc="cancelEdit"
                    @keydown.enter.ctrl="saveEdit"
                ></textarea>
            </div>
            <div class="action-buttons flex flex-wrap gap-2 items-center">
                <!-- Copy Button -->
                <button
                    class="btn btn-primary flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                    @click="copyText"
                    :disabled="!modelValue"
                    aria-label="Copy alt text to clipboard"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
                    </svg>
                    Copy
                </button>

                <!-- Edit Button -->
                <button
                    class="btn btn-secondary flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                    @click="toggleEdit"
                    :disabled="!modelValue"
                    :aria-label="isEditing ? 'Save alt text' : 'Edit alt text'"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    {{ isEditing ? 'Save' : 'Edit' }}
                </button>
                
                <!-- TTS Controls -->
                <div class="tts-controls flex items-center gap-2 ml-auto">
                    <!-- Voice Selection -->
                    <select 
                        v-if="voices && voices.length > 0"
                        v-model="localSelectedVoice" 
                        class="tts-voice-select p-2 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        aria-label="Select voice for text-to-speech"
                        @change="handleVoiceChange"
                    >
                        <option v-for="voice in voices" :key="voice.name" :value="voice">
                            {{ voice.name }}
                        </option>
                    </select>
                    
                    <!-- Play/Stop Button -->
                    <button
                        class="btn btn-secondary flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                        @click="toggleTTS"
                        :disabled="!modelValue"
                        :aria-label="isPlaying ? 'Stop text-to-speech' : 'Play text-to-speech'"
                    >
                        <svg 
                            class="w-5 h-5" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                            :class="{ 'animate-pulse': isPlaying }"
                        >
                            <path 
                                v-if="!isPlaying"
                                stroke-linecap="round" 
                                stroke-linejoin="round" 
                                stroke-width="2" 
                                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                            />
                            <path 
                                v-else
                                stroke-linecap="round" 
                                stroke-linejoin="round" 
                                stroke-width="2" 
                                d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                            />
                        </svg>
                        {{ isPlaying ? 'Stop' : 'Listen' }}
                    </button>
                </div>
            </div>

            <!-- TTS Status/Error Message -->
            <div v-if="ttsError" class="mt-2 text-red-500 dark:text-red-400 text-sm">
                {{ ttsError }}
            </div>
        </div>
    `,
    props: {
        modelValue: {
            type: String,
            required: true
        },
        ttsEnabled: {
            type: Boolean,
            default: false
        },
        isPlaying: {
            type: Boolean,
            default: false
        },
        voices: {
            type: Array,
            default: () => []
        },
        selectedVoice: {
            type: Object,
            default: null
        },
        ttsError: {
            type: String,
            default: null
        },
        resultId: {
            type: Number,
            required: true
        }
    },
    data() {
        return {
            isEditing: false,
            localSelectedVoice: this.selectedVoice
        }
    },
    watch: {
        selectedVoice(newVoice) {
            this.localSelectedVoice = newVoice;
        }
    },
    methods: {
        toggleEdit() {
            this.isEditing = !this.isEditing;
            if (!this.isEditing) {
                this.$emit('save');
            }
        },
        cancelEdit() {
            this.isEditing = false;
            this.$emit('cancel');
        },
        saveEdit() {
            this.isEditing = false;
            this.$emit('save');
        },
        copyText() {
            this.$emit('copy');
        },
        toggleTTS() {
            if (this.isPlaying) {
                this.$emit('stop-tts', this.resultId);
            } else {
                this.$emit('play-tts', {
                    resultId: this.resultId,
                    voice: this.localSelectedVoice
                });
            }
        },
        handleVoiceChange() {
            this.$emit('voice-change', {
                resultId: this.resultId,
                voice: this.localSelectedVoice
            });
        }
    }
}; 