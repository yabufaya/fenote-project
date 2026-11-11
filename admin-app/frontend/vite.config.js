import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'

// One repo-root .env.local serves both SPAs and both APIs.
const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  envDir: repoRoot,
  plugins: [react()],
  server: {
    port: 5174,
    host: '0.0.0.0',
    strictPort: true,
    // Arena/E2B preview proxies the dev server under https://{port}-{sandbox}.e2b.app.
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    }
  }
})
