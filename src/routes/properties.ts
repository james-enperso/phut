import { Hono } from 'hono';
import { Env } from '../types';

const properties = new Hono<{ Bindings: Env }>();

// Search Sabre properties with filters
properties.get('/search', async (c) => {
  const q = c.req.query('q')?.trim() || '';
  const city = c.req.query('city')?.trim() || '';
  const country = c.req.query('country')?.trim() || '';
  const chain = c.req.query('chain')?.trim() || '';
  const airport = c.req.query('airport')?.trim() || '';
  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = 50;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (q) {
    conditions.push('property_name LIKE ?');
    params.push(`%${q}%`);
  }
  if (city) {
    conditions.push('city_address LIKE ?');
    params.push(`%${city}%`);
  }
  if (country) {
    conditions.push('country_address = ?');
    params.push(country.toUpperCase());
  }
  if (chain) {
    conditions.push('property_chain = ?');
    params.push(chain.toUpperCase());
  }
  if (airport) {
    conditions.push('primary_airport = ?');
    params.push(airport.toUpperCase());
  }

  if (conditions.length === 0) {
    return c.json({ error: 'At least one search filter is required' }, 400);
  }

  const where = conditions.join(' AND ');

  // Count total results
  const countResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total FROM sabre_properties WHERE ${where}`
  )
    .bind(...params)
    .first<{ total: number }>();

  // Fetch page
  const results = await c.env.DB.prepare(
    `SELECT * FROM sabre_properties WHERE ${where} ORDER BY property_name LIMIT ? OFFSET ?`
  )
    .bind(...params, limit, offset)
    .all();

  return c.json({
    data: results.results,
    total: countResult?.total || 0,
    page,
    pages: Math.ceil((countResult?.total || 0) / limit),
  });
});

// Get single property
properties.get('/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT * FROM sabre_properties WHERE id = ?')
    .bind(id)
    .first();

  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

// List chain codes
properties.get('/chains/list', async (c) => {
  const results = await c.env.DB.prepare(
    'SELECT * FROM chain_codes ORDER BY name'
  ).all();
  return c.json(results.results);
});

export default properties;
