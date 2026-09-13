// frontend/vite.config.js
// Purpose: Vite config for the responsive browser website
// Iteration: 2

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
})
