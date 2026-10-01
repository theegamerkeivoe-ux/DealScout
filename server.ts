import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Serve static assets from public (favicons, icons, manifest)
app.use(express.static(path.resolve(process.cwd(), 'public')));

// Owner email from environment variable or fallback to authorized account
const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'theegamerkeivoe@gmail.com').trim().toLowerCase();
const ADMIN_PASSCODE = (process.env.ADMIN_PASSCODE || 'KeivoeAdmin2026!').trim();

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/config', (req, res) => {
  res.json({
    appName: 'Deal Scout',
    version: '1.0.0',
  });
});

app.post('/api/auth/check-owner', (req, res) => {
  const { email } = req.body || {};
  const normalized = (email || '').trim().toLowerCase();
  const isOwner = Boolean(normalized && normalized === OWNER_EMAIL);
  res.json({ isOwner });
});

app.post('/api/auth/verify-admin-passcode', (req, res) => {
  const { email, passcode } = req.body || {};
  const normalized = (email || '').trim().toLowerCase();
  const inputPasscode = (passcode || '').trim();

  if (!normalized || normalized !== OWNER_EMAIL) {
    return res.status(403).json({ success: false, message: 'Access denied: Email is not authorized as the store administrator.' });
  }

  if (!inputPasscode || inputPasscode !== ADMIN_PASSCODE) {
    return res.status(401).json({ success: false, message: 'Incorrect admin security passcode.' });
  }

  return res.json({
    success: true,
    isOwner: true,
    email: OWNER_EMAIL,
    displayName: 'Administrator (Keivoe)',
  });
});

// Direct redirect endpoint for affiliate links (clean URL for YouTube descriptions: e.g. /go/:id)
app.get('/go/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Read directly or let frontend handle the redirection
    res.redirect(`/deals/${id}?redirect=1`);
  } catch (error) {
    res.redirect('/');
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    
    // Explicit fallback for client-side routing on mobile devices
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        if (vite) {
          vite.ssrFixStacktrace(e as Error);
        }
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Deal Scout server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
