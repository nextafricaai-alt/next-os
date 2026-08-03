import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080,
    host: '127.0.0.1',
    fs: {
      allow: ['../../../..']
    }
  },
  resolve: {
    alias: {
      'react/jsx-runtime': '/Users/chariscreationslimited/Desktop/PATRICK/NEXT OS/next-os-repo/web/prototypes/schools/peak-primary/node_modules/react/jsx-runtime',
      'react': '/Users/chariscreationslimited/Desktop/PATRICK/NEXT OS/next-os-repo/web/prototypes/schools/peak-primary/node_modules/react'
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: './index-vite.html'
      }
    }
  }
});
