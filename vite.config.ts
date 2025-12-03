import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // 프론트에서 /api/** 로 부르면 → http://localhost:3000/** 로 전달
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});