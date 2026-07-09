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
  // /f is the public file-download link, which intentionally lives outside /api.
  const proxy = Object.fromEntries(
    ['/api', '/f', '/docs', '/openapi.json', '/redoc'].map(
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
    // `vite preview` (serving the production build locally) has its own proxy
    // option — it does NOT fall back to `server.proxy`, so without this the
    // built app has no way to reach the backend at all.
    server: { proxy },
    preview: { proxy },
  }
})
