/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../media/webview',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        webview: resolve(__dirname, 'index.html'),
      },
      output: {
        entryFileNames: 'webview.js',
        chunkFileNames: '[name].js',
        assetFileNames: 'assets/[name].[ext]',
        format: 'iife',
        globals: {
          'vscode': 'acquireVsCodeApi'
        }
      },
      external: ['vscode']
    },
    // Ensure compatibility with VSCode webview environment
    target: 'es2020',
    minify: false, // Keep readable for debugging
    sourcemap: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': '"development"'
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts']
  }
})