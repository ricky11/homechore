import { createApp, h } from 'vue'
import { createPinia } from 'pinia'
import { NMessageProvider } from 'naive-ui'
import './style.css'
import App from './App.vue'

const app = createApp({
	render: () => h(NMessageProvider, null, { default: () => h(App) }),
})

app.use(createPinia())
app.mount('#app')
