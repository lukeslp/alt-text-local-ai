export const AltTextEditor = {
    name: 'AltTextEditor',
    template: `
        <div class="alt-text-editor">
            <textarea
                ref="textarea"
                v-model="text"
                class="editor-textarea"
                :placeholder="placeholder"
                @input="autoResize"
                @keydown.ctrl.enter="save"
                @keydown.esc="cancel"
            ></textarea>
            <div class="editor-actions">
                <button class="btn btn-primary" @click="save">Save</button>
                <button class="btn btn-secondary" @click="cancel">Cancel</button>
            </div>
        </div>
    `,
    props: {
        initialText: {
            type: String,
            default: ''
        },
        placeholder: {
            type: String,
            default: 'Enter alt text...'
        }
    },
    data() {
        return {
            text: this.initialText
        }
    },
    mounted() {
        this.autoResize();
        this.$refs.textarea.focus();
    },
    methods: {
        autoResize() {
            const textarea = this.$refs.textarea;
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        },
        save() {
            this.$emit('save', this.text);
        },
        cancel() {
            this.$emit('cancel');
        }
    }
}; 