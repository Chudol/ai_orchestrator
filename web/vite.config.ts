import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __BUILD_HASH__: JSON.stringify(Date.now().toString(36)),
  },
  build: {
    outDir: 'dist',
  },
})
