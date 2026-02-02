import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

// 定义API基础URL，用于部署到Render时的配置
app.config.globalProperties.$apiBase = process.env.VUE_APP_API_BASE_URL || ''

app.use(router).mount('#app')