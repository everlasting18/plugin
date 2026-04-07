import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        admin: resolve(__dirname, 'src/admin/index.jsx'),
        frontend: resolve(__dirname, 'src/frontend/index.jsx'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: '[name].[ext]',
        manualChunks: undefined,
      },
    },
  },
  css: {
    modules: {
      // Tạo class name dạng: componentName_className_hash
      generateScopedName: '[name]_[local]_[hash:base64:5]',
    },
  },
});
