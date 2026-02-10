import { Hono } from 'hono';
import { Env, PhutEntry } from '../types';
import { buildCsv } from '../lib/csv-builder';
import { validateEntry } from '../lib/validator';

const exportRoutes = new Hono<{ Bindings: Env }>();

// Verify project ownership helper
async function verifyProject(db: D1Database, projectId: string, userSub: string) {
  return db
    .prepare('SELECT id, name FROM phut_projects WHERE id = ? AND owner_sub = ?')
    .bind(projectId, userSub)
    .first<{ id: string; name: string }>();
}

// Download PHUT CSV
exportRoutes.get('/csv', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  const project = await verifyProject(c.env.DB, projectId, user.sub);
  if (!project) return c.json({ error: 'Not found' }, 404);

  const results = await c.env.DB.prepare(
    'SELECT * FROM phut_entries WHERE project_id = ? ORDER BY sort_order, id'
  )
    .bind(projectId)
    .all();

  const csv = buildCsv(results.results as PhutEntry[]);

  // Sanitize project name for filename
  const filename = project.name.replace(/[^a-zA-Z0-9_-]/g, '_') + '.csv';

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});

// Preview CSV (returns JSON with headers + first 10 rows)
exportRoutes.get('/preview', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  const project = await verifyProject(c.env.DB, projectId, user.sub);
  if (!project) return c.json({ error: 'Not found' }, 404);

  const results = await c.env.DB.prepare(
    'SELECT * FROM phut_entries WHERE project_id = ? ORDER BY sort_order, id LIMIT 10'
  )
    .bind(projectId)
    .all();

  const csv = buildCsv(results.results as PhutEntry[]);
  const lines = csv.split('\r\n');

  return c.json({
    headers: lines[0]?.split(',') || [],
    rows: lines.slice(1).map((line) => line.split(',')),
    total_entries: results.results.length,
  });
});

// Validate all entries
exportRoutes.post('/validate', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  const project = await verifyProject(c.env.DB, projectId, user.sub);
  if (!project) return c.json({ error: 'Not found' }, 404);

  const results = await c.env.DB.prepare(
    'SELECT * FROM phut_entries WHERE project_id = ? ORDER BY sort_order, id'
  )
    .bind(projectId)
    .all();

  const validations = (results.results as PhutEntry[]).map(validateEntry);
  const allValid = validations.every((v) => v.valid);

  return c.json({
    valid: allValid,
    total: validations.length,
    errors: validations.filter((v) => !v.valid).length,
    warnings: validations.filter((v) => v.warnings.length > 0).length,
    entries: validations,
  });
});

export default exportRoutes;
