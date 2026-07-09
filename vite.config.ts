import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Where the backend runs during local development.
  const target = env.VITE_DEV_API_TARGET ?? 'http://localhost:8000'

  // Backend route prefixes proxied to the API in dev to avoid CORS.
  // /docs, /openapi.json and /redoc are FastAPI's own routes (Swagger/ReDoc) —
  // without proxying them, Vite falls back to index.html and the SPA's
  // catch-all route redirects them to "/" before they ever reach the backend.
  const proxy = Object.fromEntries(
    ['/api', '/auth', '/admin', '/f', '/health', '/docs', '/openapi.json', '/redoc'].map(
      (path) => [path, { target, changeOrigin: true }],
    ),
  )

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: { proxy },
  }
})
