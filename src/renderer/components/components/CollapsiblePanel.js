export const CollapsiblePanel = {
    name: 'CollapsiblePanel',
    template: `
        <div class="collapsible-panel" :class="{ 'is-collapsed': isCollapsed }">
            <div class="panel-header" @click="toggle">
                <slot name="header"></slot>
                <span class="collapse-icon">{{ isCollapsed ? '▼' : '▲' }}</span>
            </div>
            <transition name="collapse">
                <div v-show="!isCollapsed" class="panel-content">
                    <slot></slot>
                </div>
            </transition>
        </div>
    `,
    data() {
        return {
            isCollapsed: false
        }
    },
    methods: {
        toggle() {
            this.isCollapsed = !this.isCollapsed;
            this.$emit('toggle', this.isCollapsed);
        }
    }
}; 