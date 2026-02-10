import { Hono } from 'hono';
import { Env } from '../types';

const entries = new Hono<{ Bindings: Env }>();

// Helper: verify project ownership
async function verifyProject(db: D1Database, projectId: string, userSub: string) {
  return db
    .prepare('SELECT id FROM phut_projects WHERE id = ? AND owner_sub = ?')
    .bind(projectId, userSub)
    .first();
}

// List all entries in project
entries.get('/', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  const project = await verifyProject(c.env.DB, projectId, user.sub);
  if (!project) return c.json({ error: 'Project not found' }, 404);

  const results = await c.env.DB.prepare(
    'SELECT * FROM phut_entries WHERE project_id = ? ORDER BY sort_order, id'
  )
    .bind(projectId)
    .all();

  return c.json(results.results);
});

// Add entry (from Sabre property or manual)
entries.post('/', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  const project = await verifyProject(c.env.DB, projectId, user.sub);
  if (!project) return c.json({ error: 'Project not found' }, 404);

  const body = await c.req.json();

  // Get next sort order
  const maxSort = await c.env.DB.prepare(
    'SELECT MAX(sort_order) as max_sort FROM phut_entries WHERE project_id = ?'
  )
    .bind(projectId)
    .first<{ max_sort: number | null }>();

  const sortOrder = (maxSort?.max_sort ?? -1) + 1;

  const result = await c.env.DB.prepare(`
    INSERT INTO phut_entries (
      project_id, property_name, is_gds_flag, property_chain, gds_property_id,
      street_address, city_address, state_province, country_address, zip_postal_code,
      primary_airport, supplier_property_id, channel_code, rate_periods,
      property_tier, property_note, green_property,
      custom_tag1, custom_tag2, custom_tag3, custom_tag4, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      projectId,
      body.property_name || '',
      body.is_gds_flag || 'Y',
      body.property_chain || null,
      body.gds_property_id || null,
      body.street_address || null,
      body.city_address || null,
      body.state_province || null,
      body.country_address || null,
      body.zip_postal_code || null,
      body.primary_airport || null,
      body.supplier_property_id || null,
      body.channel_code || null,
      JSON.stringify(body.rate_periods || []),
      body.property_tier || null,
      body.property_note || null,
      body.green_property || 'N',
      body.custom_tag1 || 'N',
      body.custom_tag2 || 'N',
      body.custom_tag3 || 'N',
      body.custom_tag4 || 'N',
      sortOrder
    )
    .run();

  // Update project timestamp
  await c.env.DB.prepare(
    "UPDATE phut_projects SET updated_at = datetime('now') WHERE id = ?"
  )
    .bind(projectId)
    .run();

  return c.json({ id: result.meta.last_row_id }, 201);
});

// Bulk add entries from Sabre property IDs
entries.post('/bulk', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  const project = await verifyProject(c.env.DB, projectId, user.sub);
  if (!project) return c.json({ error: 'Project not found' }, 404);

  const body = await c.req.json<{ property_ids: number[] }>();
  if (!body.property_ids?.length) {
    return c.json({ error: 'property_ids array required' }, 400);
  }

  // Fetch all properties
  const placeholders = body.property_ids.map(() => '?').join(',');
  const props = await c.env.DB.prepare(
    `SELECT * FROM sabre_properties WHERE id IN (${placeholders})`
  )
    .bind(...body.property_ids)
    .all();

  // Get current max sort
  const maxSort = await c.env.DB.prepare(
    'SELECT MAX(sort_order) as max_sort FROM phut_entries WHERE project_id = ?'
  )
    .bind(projectId)
    .first<{ max_sort: number | null }>();

  let sortOrder = (maxSort?.max_sort ?? -1) + 1;

  // Insert each as an entry
  const stmts = props.results.map((p: any) => {
    const stmt = c.env.DB.prepare(`
      INSERT INTO phut_entries (
        project_id, property_name, is_gds_flag, property_chain, gds_property_id,
        street_address, city_address, state_province, country_address, zip_postal_code,
        primary_airport, rate_periods, sort_order
      ) VALUES (?, ?, 'Y', ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?)
    `).bind(
      projectId,
      p.property_name,
      p.property_chain,
      p.gds_property_id,
      p.street_address,
      p.city_address,
      p.state_province,
      p.country_address,
      p.zip_postal_code,
      p.primary_airport,
      sortOrder++
    );
    return stmt;
  });

  // Batch execute (D1 supports batch)
  await c.env.DB.batch(stmts);

  await c.env.DB.prepare(
    "UPDATE phut_projects SET updated_at = datetime('now') WHERE id = ?"
  )
    .bind(projectId)
    .run();

  return c.json({ added: props.results.length }, 201);
});

// Update entry
entries.put('/:entryId', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');
  const entryId = c.req.param('entryId');

  const project = await verifyProject(c.env.DB, projectId, user.sub);
  if (!project) return c.json({ error: 'Project not found' }, 404);

  const body = await c.req.json();

  // Build dynamic SET clause from provided fields
  const allowedFields = [
    'property_name', 'is_gds_flag', 'property_chain', 'gds_property_id',
    'street_address', 'city_address', 'state_province', 'country_address',
    'zip_postal_code', 'primary_airport', 'supplier_property_id', 'channel_code',
    'property_tier', 'property_note', 'green_property',
    'custom_tag1', 'custom_tag2', 'custom_tag3', 'custom_tag4', 'sort_order',
  ];

  const setClauses: string[] = [];
  const values: any[] = [];

  for (const field of allowedFields) {
    if (field in body) {
      setClauses.push(`${field} = ?`);
      values.push(body[field]);
    }
  }

  // Handle rate_periods specially (serialize to JSON)
  if ('rate_periods' in body) {
    setClauses.push('rate_periods = ?');
    values.push(JSON.stringify(body.rate_periods));
  }

  if (setClauses.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  values.push(entryId, projectId);
  await c.env.DB.prepare(
    `UPDATE phut_entries SET ${setClauses.join(', ')} WHERE id = ? AND project_id = ?`
  )
    .bind(...values)
    .run();

  await c.env.DB.prepare(
    "UPDATE phut_projects SET updated_at = datetime('now') WHERE id = ?"
  )
    .bind(projectId)
    .run();

  return c.json({ ok: true });
});

// Delete entry
entries.delete('/:entryId', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');
  const entryId = c.req.param('entryId');

  const project = await verifyProject(c.env.DB, projectId, user.sub);
  if (!project) return c.json({ error: 'Project not found' }, 404);

  await c.env.DB.prepare(
    'DELETE FROM phut_entries WHERE id = ? AND project_id = ?'
  )
    .bind(entryId, projectId)
    .run();

  await c.env.DB.prepare(
    "UPDATE phut_projects SET updated_at = datetime('now') WHERE id = ?"
  )
    .bind(projectId)
    .run();

  return c.json({ ok: true });
});

// Reorder entries
entries.patch('/reorder', async (c) => {
  const user = c.get('user');
  const projectId = c.req.param('projectId');

  const project = await verifyProject(c.env.DB, projectId, user.sub);
  if (!project) return c.json({ error: 'Project not found' }, 404);

  const body = await c.req.json<{ order: number[] }>(); // array of entry IDs in order

  const stmts = body.order.map((entryId, index) =>
    c.env.DB.prepare(
      'UPDATE phut_entries SET sort_order = ? WHERE id = ? AND project_id = ?'
    ).bind(index, entryId, projectId)
  );

  await c.env.DB.batch(stmts);
  return c.json({ ok: true });
});

export default entries;
