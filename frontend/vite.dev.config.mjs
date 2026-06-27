const backendTarget = process.env.VITE_DEV_BACKEND || 'http://localhost:10000';

export default {
  root: 'frontend',
  cacheDir: '../node_modules/.vite-dhanlabh',
  css: {
    postcss: './frontend/postcss.config.js'
  },
  optimizeDeps: {
    noDiscovery: true,
    include: []
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        secure: false
      },
      '/ws': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  }
};
