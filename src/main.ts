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
import { startAuthWarmup } from './lib/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// 页面回到前台时预热登录态，避免空闲后第一次操作被 token 续期卡住
startAuthWarmup()
