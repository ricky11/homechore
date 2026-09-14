import { createApp, h } from 'vue'
import { createPinia } from 'pinia'
import { NMessageProvider } from 'naive-ui'
import './style.css'
import App from './App.vue'
import { router } from './router.js'

const app = createApp({
	render: () => h(NMessageProvider, null, { default: () => h(App) }),
})

app.use(createPinia())
app.use(router)
app.mount('#app')
