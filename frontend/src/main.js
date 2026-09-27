// 应用入口：装配 router + pinia，然后挂载。
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './styles/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.mount('#app')
