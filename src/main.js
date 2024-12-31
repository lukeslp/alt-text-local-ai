import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

// Import CSS files
import '@css/theme.css'
import '@css/components.css'
import '@css/processing-state.css'
import '@css/main.css'

// Create Vue app
const app = createApp(App)

// Use Pinia for state management
app.use(createPinia())

// Mount the app
app.mount('#app') 