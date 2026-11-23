import { defineConfig } from 'vite';

// host: true lets GitHub Codespaces forward the port to your browser
export default defineConfig({
  server: { host: true, port: 5173, strictPort: true, allowedHosts: true },
  build: {
    target: 'es2019',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: { manualChunks: { firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'] } },
    },
  },
});
