import { Hono } from 'hono';
import { Env } from '../types';

const projects = new Hono<{ Bindings: Env }>();

// List user's projects
projects.get('/', async (c) => {
  const user = c.get('user');

  const results = await c.env.DB.prepare(`
    SELECT p.*, COUNT(e.id) as entry_count
    FROM phut_projects p
    LEFT JOIN phut_entries e ON e.project_id = p.id
    WHERE p.owner_sub = ?
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `)
    .bind(user.sub)
    .all();

  return c.json(results.results);
});

// Create project
projects.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ name: string }>();

  if (!body.name?.trim()) {
    return c.json({ error: 'Project name is required' }, 400);
  }

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO phut_projects (id, name, owner_sub) VALUES (?, ?, ?)'
  )
    .bind(id, body.name.trim(), user.sub)
    .run();

  return c.json({ id, name: body.name.trim() }, 201);
});

// Get project detail
projects.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const project = await c.env.DB.prepare(
    'SELECT * FROM phut_projects WHERE id = ? AND owner_sub = ?'
  )
    .bind(id, user.sub)
    .first();

  if (!project) return c.json({ error: 'Not found' }, 404);

  const countResult = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM phut_entries WHERE project_id = ?'
  )
    .bind(id)
    .first<{ count: number }>();

  return c.json({ ...project, entry_count: countResult?.count || 0 });
});

// Rename project
projects.put('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json<{ name: string }>();

  const result = await c.env.DB.prepare(
    "UPDATE phut_projects SET name = ?, updated_at = datetime('now') WHERE id = ? AND owner_sub = ?"
  )
    .bind(body.name.trim(), id, user.sub)
    .run();

  if (!result.meta.changes) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true });
});

// Delete project (cascade deletes entries)
projects.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  // Delete entries first (D1 may not support FK cascade)
  await c.env.DB.prepare('DELETE FROM phut_entries WHERE project_id = ?').bind(id).run();
  const result = await c.env.DB.prepare(
    'DELETE FROM phut_projects WHERE id = ? AND owner_sub = ?'
  )
    .bind(id, user.sub)
    .run();

  if (!result.meta.changes) return c.json({ error: 'Not found' }, 404);
  return c.json({ ok: true });
});

export default projects;
