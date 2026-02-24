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
      // Proxy requests starting with /api to your local server
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  optimizeDeps: {
    exclude: ['fsevents'],
  },
})
