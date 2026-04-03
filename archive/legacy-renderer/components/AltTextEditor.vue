<template>
  <div class="alt-text-editor">
    <textarea
      v-model="altText"
      class="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
      :placeholder="placeholder"
      :aria-label="ariaLabel"
      @input="handleInput"
    ></textarea>
    <div class="flex justify-between mt-2">
      <span class="text-sm text-gray-500">{{ characterCount }}/1000</span>
      <button
        @click="copyToClipboard"
        class="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        :aria-label="'Copy alt text to clipboard'"
      >
        Copy
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AltTextEditor',
  props: {
    value: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: 'Enter alt text description...'
    },
    ariaLabel: {
      type: String,
      default: 'Alt text editor'
    }
  },
  data() {
    return {
      altText: this.value
    }
  },
  computed: {
    characterCount() {
      return this.altText.length
    }
  },
  methods: {
    handleInput() {
      this.$emit('input', this.altText)
      this.$emit('update:value', this.altText)
    },
    async copyToClipboard() {
      try {
        await navigator.clipboard.writeText(this.altText)
        this.$emit('copied')
      } catch (error) {
        console.error('Failed to copy text:', error)
        this.$emit('error', error)
      }
    }
  },
  watch: {
    value(newValue) {
      this.altText = newValue
    }
  }
}
</script>

<style scoped>
.alt-text-editor {
  width: 100%;
}

textarea {
  min-height: 100px;
  resize: vertical;
}
</style> 