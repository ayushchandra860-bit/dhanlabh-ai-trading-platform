import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import type { Plugin } from 'vite';

/**
 * Removes the `crossorigin` attribute from all script and link tags in the
 * generated HTML. Vite adds it automatically for ES modules, but Electron's
 * file:// protocol has no CORS server, so the browser silently refuses to
 * load any script/stylesheet that carries the crossorigin flag.
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

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), removeCrossOrigin()],
  // Define the root of the frontend application for Vite
  root: resolve(__dirname, 'frontend'),
  publicDir: resolve(__dirname, 'public'),
  build: {
    // Output directory for the frontend build.
    outDir: resolve(__dirname, 'dist/frontend'),
    emptyOutDir: true,
  },
  // Use relative base path so assets load correctly under Electron's file:// protocol
  base: './',
  server: {
    port: 3000,
  },
  // Define global variables for the frontend, e.g., to access backend URL
  define: {
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:8000/api'),
    'process.env.npm_package_version': JSON.stringify(process.env.npm_package_version),
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'shared'),
    },
  },
});