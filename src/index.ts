import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Env } from './types';
import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';
import propertyRoutes from './routes/properties';
import projectRoutes from './routes/projects';
import entryRoutes from './routes/entries';
import exportRoutes from './routes/export';
import adminRoutes from './routes/admin';

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('/api/*', cors({
  origin: (origin) => origin, // Allow same-origin
  credentials: true,
}));

// Health check
app.get('/api/health', (c) => c.json({ ok: true, time: new Date().toISOString() }));

// Auth routes (no auth middleware - these handle login/callback)
app.route('/auth', authRoutes);

// All /api routes require authentication
app.use('/api/*', authMiddleware);

// API routes
app.route('/api/properties', propertyRoutes);
app.route('/api/projects', projectRoutes);

// Nested entry routes under projects
const projectEntries = new Hono<{ Bindings: Env }>();
projectEntries.route('/entries', entryRoutes);
projectEntries.route('/export', exportRoutes);
app.route('/api/projects/:projectId', projectEntries);

// Admin routes
app.route('/api/admin', adminRoutes);

// SPA fallback: serve index.html for non-API routes
// (Cloudflare's `assets` config handles static files, this catches client-side routes)
app.get('*', async (c) => {
  // Let the assets handler try first; if it falls through here,
  // the request is for a client-side route
  return c.html('<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PHUT Builder</title><script>window.location.href="/"</script></head><body></body></html>');
});

export default app;
