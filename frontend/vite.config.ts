import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({mode}) => ({
  base: mode = '/insight_aiops/',
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['test.solutions.growtharc.com'],
    port: 3000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
}));
