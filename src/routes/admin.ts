import { Hono } from 'hono';
import { Env } from '../types';

const admin = new Hono<{ Bindings: Env }>();

// Bulk import Sabre properties from CSV
// Expects JSON body with array of property objects
// In production, you'd likely use `wrangler d1 execute` for the initial load,
// but this endpoint supports incremental updates.
admin.post('/import-properties', async (c) => {
  const user = c.get('user');

  // Only allow users from the tenant (already enforced by auth middleware)
  // Optionally add admin role check here

  const contentType = c.req.header('content-type') || '';
  let properties: any[];

  if (contentType.includes('application/json')) {
    const body = await c.req.json<{ properties: any[] }>();
    properties = body.properties;
  } else {
    return c.json({ error: 'Content-Type must be application/json' }, 400);
  }

  if (!Array.isArray(properties) || properties.length === 0) {
    return c.json({ error: 'Empty properties array' }, 400);
  }

  // Batch insert in chunks of 100 (D1 batch limit considerations)
  const BATCH_SIZE = 100;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < properties.length; i += BATCH_SIZE) {
    const chunk = properties.slice(i, i + BATCH_SIZE);
    const stmts = chunk
      .filter((p) => p.gds_property_id && p.property_chain && p.property_name)
      .map((p) =>
        c.env.DB.prepare(`
          INSERT OR REPLACE INTO sabre_properties (
            gds_property_id, property_chain, property_name,
            street_address, city_address, state_province,
            country_address, zip_postal_code, primary_airport,
            latitude, longitude
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          p.gds_property_id,
          p.property_chain,
          p.property_name,
          p.street_address || null,
          p.city_address || null,
          p.state_province || null,
          p.country_address || null,
          p.zip_postal_code || null,
          p.primary_airport || null,
          p.latitude ?? null,
          p.longitude ?? null
        )
      );

    skipped += chunk.length - stmts.length;

    if (stmts.length > 0) {
      await c.env.DB.batch(stmts);
      inserted += stmts.length;
    }
  }

  return c.json({
    ok: true,
    inserted,
    skipped,
    total: properties.length,
  });
});

// Get import stats
admin.get('/stats', async (c) => {
  const propCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM sabre_properties'
  ).first<{ count: number }>();

  const chainCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM chain_codes'
  ).first<{ count: number }>();

  const projectCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM phut_projects'
  ).first<{ count: number }>();

  const countryCounts = await c.env.DB.prepare(
    'SELECT country_address, COUNT(*) as count FROM sabre_properties GROUP BY country_address ORDER BY count DESC LIMIT 20'
  ).all();

  return c.json({
    properties: propCount?.count || 0,
    chains: chainCount?.count || 0,
    projects: projectCount?.count || 0,
    top_countries: countryCounts.results,
  });
});

export default admin;
