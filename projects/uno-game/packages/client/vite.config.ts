import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const serverPort = process.env.PORT || 3003;
const target = process.env.VITE_SERVER_URL || `http://localhost:${serverPort}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target,
        ws: true,
        changeOrigin: true
      },
      '/api': {
        target,
        changeOrigin: true
      },
      '/uploads': {
        target,
        changeOrigin: true
      }
    }
  }
});
