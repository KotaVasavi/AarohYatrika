import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // This is the all-important proxy setup
    proxy: {
      '/api': {
        target: 'http://localhost:5001', // Your backend server
        changeOrigin: true,
      },
    },
  },
})