import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Excalidraw requires process.env polyfill in browser bundles
    'process.env': {},
  },
  server: {
    port: 3000,
    open: true,
  },
});
