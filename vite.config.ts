import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // `vercel dev` serves /api on port 3000; forward to it when running plain `vite`
      '/api': 'http://localhost:3000',
    },
  },
})
