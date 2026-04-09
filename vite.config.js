import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Work around ESM/CJS interop issue for use-sync-external-store's with-selector entry
      'use-sync-external-store/with-selector.js': path.resolve(
        __dirname,
        'src/shims/useSyncExternalStoreWithSelector.js',
      ),
      'use-sync-external-store/with-selector': path.resolve(
        __dirname,
        'src/shims/useSyncExternalStoreWithSelector.js',
      ),
    },
  },
  server: {
    proxy: {
      // Proxy data requests to the backend. Let the SPA own GET /api when there is no token
      // (e.g. /api or /api?datasetId=… for the API documentation page).
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
        bypass(req) {
          const url = req.url || ''
          const q = url.indexOf('?')
          const pathOnly = q === -1 ? url : url.slice(0, q)
          const query = q === -1 ? '' : url.slice(q + 1)
          if (pathOnly === '/api' || pathOnly === '/api/') {
            const params = new URLSearchParams(query)
            if (!params.has('token')) {
              return '/index.html'
            }
          }
          return undefined
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['fsevents'],
  },
})
