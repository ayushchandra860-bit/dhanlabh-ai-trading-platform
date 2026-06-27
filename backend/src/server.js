import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import helmet from 'helmet';
import { api } from './routes/api.js';
import { attachWebSocketServer } from './realtime/wsServer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = http.createServer(app);
const port = Number(process.env.PORT || 10000);

app.set('trust proxy', 1);

const hits = new Map();
app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'local';
  const now = Date.now();
  const bucket = hits.get(ip) ?? [];
  const active = bucket.filter((time) => now - time < 60_000);
  active.push(now);
  hits.set(ip, active);
  if (active.length > 240) return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  next();
});

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || true, credentials: false }));
app.use(express.json({ limit: '8mb' }));
app.use('/api', api);
app.use('/api', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

const frontendDist = path.resolve(__dirname, '../../frontend/dist');

function listRouterRoutes(router, prefix = '') {
  return router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) => {
      const routePath = `${prefix}${layer.route.path}`.replace(/\/+/g, '/');
      return Object.keys(layer.route.methods)
        .filter((method) => layer.route.methods[method])
        .map((method) => `${method.toUpperCase()} ${routePath}`);
    });
}

function printRegisteredRoutes() {
  const routes = [
    ...listRouterRoutes(api, '/api'),
    'GET /ws/market',
    'STATIC frontend/dist',
    'GET * SPA fallback'
  ];
  console.log('Registered routes:');
  routes.forEach((route) => console.log(`  ${route}`));
}

app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html') || req.path.startsWith('/assets/')) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
  }
  next();
});
app.use(express.static(frontendDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'), (error) => {
    if (error) res.status(404).json({ error: 'Frontend build not found. Run npm run build first.' });
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || 'Unexpected server error' });
});

const wss = attachWebSocketServer(server);

server.listen(port, () => {
  console.log(`Dhanlabh AI Trading Platform running on port ${port}`);
  printRegisteredRoutes();
});

function shutdown(signal) {
  console.log(`Received ${signal}; shutting down Dhanlabh server`);
  wss.clients.forEach((client) => client.terminate());
  wss.close(() => {});
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2500).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
