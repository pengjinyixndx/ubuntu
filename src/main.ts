import { createApp } from 'vue'
import { createPinia } from 'pinia'

// 复古字体（自托管，构建时打包，离线/国内可用）
import '@fontsource/special-elite/400.css'
import '@fontsource/playfair-display/700.css'

// 全局样式
import './styles/tokens.css'
import './styles/base.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
