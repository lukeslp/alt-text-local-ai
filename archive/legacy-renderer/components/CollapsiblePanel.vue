<template>
  <div class="bg-surface-light dark:bg-surface-dark rounded-xl shadow-md">
    <div class="flex items-center justify-between p-6" @click="toggle">
      <h2 class="text-xl font-playfair font-bold">{{ title }}</h2>
      <div class="flex items-center gap-2">
        <slot name="header-actions"></slot>
        <svg class="w-6 h-6 transform transition-transform duration-300"
             :class="{ 'rotate-180': !isOpen }"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
    </div>
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform -translate-y-2 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-300 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform -translate-y-2 opacity-0"
    >
      <div v-show="isOpen" class="section-content">
        <slot></slot>
      </div>
    </Transition>
  </div>
</template>

<script>
import { ref } from 'vue'
import { Transition } from 'vue'

export default {
  name: 'CollapsiblePanel',
  components: {
    Transition
  },
  props: {
    title: {
      type: String,
      required: true
    },
    initiallyOpen: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    const isOpen = ref(props.initiallyOpen)

    const toggle = () => {
      isOpen.value = !isOpen.value
    }

    return {
      isOpen,
      toggle
    }
  }
}
</script> 