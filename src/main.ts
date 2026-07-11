import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import { appConfig } from '@/shared/config'
import { handleGlobalError } from '@/shared/errors'

import App from './App.vue'
import router from './router'

// Importing appConfig validates the environment at startup (fail-fast).
void appConfig

const app = createApp(App)

app.config.errorHandler = handleGlobalError

app.use(createPinia())
app.use(router)

app.mount('#app')
