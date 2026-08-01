import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { INITIAL_ENTITIES } from './src/data/mockData';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Allow iframe embedding from any domain (e.g., mamuthub.com, wordpress sites)
  app.use((req, res, next) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Security-Policy', "frame-ancestors *;");
    next();
  });

  app.use(express.json());

  // API endpoint for WordPress JSON sync or external REST fetch
  app.get('/api/entities', (req, res) => {
    res.json({
      success: true,
      count: INITIAL_ENTITIES.length,
      data: INITIAL_ENTITIES,
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
