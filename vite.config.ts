import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path, { resolve } from 'path';
import type { Plugin } from 'vite';

/**
 * Removes the `crossorigin` attribute from all script and link tags in the
 * generated HTML. Essential for Electron's file:// protocol.
 */
function removeCrossOrigin(): Plugin {
  return {
    name: 'remove-crossorigin',
    transformIndexHtml(html: string) {
      return html
        .replace(/<script([^>]*?) crossorigin([^>]*)>/g, '<script$1$2>')
        .replace(/<link([^>]*?) crossorigin([^>]*?)>/g, '<link$1$2>');
    },
  };
}

export default defineConfig({
  plugins: [react(), removeCrossOrigin()],
  root: resolve(__dirname, 'frontend'),
  publicDir: resolve(__dirname, 'public'),
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist/frontend'),
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom']
        }
      }
    }
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  },
  server: {
    port: 3000,
  },
  define: {
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:8000/api'),
    'process.env.npm_package_version': JSON.stringify(process.env.npm_package_version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend/src'),
      '@shared': resolve(__dirname, 'shared')
    }
  }
});