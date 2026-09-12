import { createApp, h } from 'vue'
import { NMessageProvider } from 'naive-ui'
import './style.css'
import App from './App.vue'

createApp({
	render: () => h(NMessageProvider, null, { default: () => h(App) }),
}).mount('#app')
