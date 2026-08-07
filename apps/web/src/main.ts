import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useUiStore } from './stores/ui'
import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/navbar.css'
import './styles/responsive.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// 初始化UI设置（主题、布局、CSS变量）
const ui = useUiStore()
ui.initAll()

app.mount('#app')
