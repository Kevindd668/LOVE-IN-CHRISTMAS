import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    sourcemap: false,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  },
  server: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true
  }
});
