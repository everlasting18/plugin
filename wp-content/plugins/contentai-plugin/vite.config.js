import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        '@wordpress/plugins',
        '@wordpress/editor',
        '@wordpress/element',
        '@wordpress/components',
        '@wordpress/data',
        '@wordpress/i18n',
        '@wordpress/blocks',
        '@wordpress/block-editor',
      ],
      input: {
        editor: 'src/editor/index.jsx',
        admin: 'src/admin/index.jsx',
        calendar: 'src/calendar/index.jsx',
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name].[ext]',
        globals: {
          '@wordpress/plugins': 'wp.plugins',
          '@wordpress/editor': 'wp.editor',
          '@wordpress/element': 'wp.element',
          '@wordpress/components': 'wp.components',
          '@wordpress/data': 'wp.data',
          '@wordpress/i18n': 'wp.i18n',
          '@wordpress/blocks': 'wp.blocks',
          '@wordpress/block-editor': 'wp.blockEditor',
        },
      },
    },
  },
  css: {
    modules: {
      generateScopedName: '[name]_[local]_[hash:base64:5]',
    },
  },
});
