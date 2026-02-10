#!/usr/bin/env tsx
/**
 * Import Sabre properties from a CSV flat file into D1.
 *
 * Usage:
 *   npx tsx scripts/import-properties.ts --file=./sabre-properties.csv [--local]
 *
 * Expected CSV columns (header row required):
 *   gds_property_id, property_chain, property_name, street_address,
 *   city_address, state_province, country_address, zip_postal_code,
 *   primary_airport, latitude, longitude
 *
 * For very large files (100k+ rows), it's faster to convert to SQL and use:
 *   wrangler d1 execute phut-db --file=./seed.sql [--local]
 *
 * This script generates that SQL file.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const args = process.argv.slice(2);
const fileArg = args.find((a) => a.startsWith('--file='));
const isLocal = args.includes('--local');

if (!fileArg) {
  console.error('Usage: npx tsx scripts/import-properties.ts --file=./sabre-properties.csv [--local]');
  process.exit(1);
}

const filePath = resolve(fileArg.split('=')[1]);
console.log(`Reading: ${filePath}`);

const raw = readFileSync(filePath, 'utf-8');
const lines = raw.split('\n').filter((l) => l.trim());

// Parse header
const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
console.log(`Columns: ${header.join(', ')}`);

// Map column indices
const colMap: Record<string, number> = {};
header.forEach((h, i) => (colMap[h] = i));

const requiredCols = ['gds_property_id', 'property_chain', 'property_name'];
for (const col of requiredCols) {
  if (!(col in colMap)) {
    console.error(`Missing required column: ${col}`);
    process.exit(1);
  }
}

// Parse rows
function getVal(row: string[], col: string): string {
  const idx = colMap[col];
  if (idx === undefined) return '';
  return (row[idx] || '').trim().replace(/^"|"$/g, '');
}

function escapeSql(val: string): string {
  if (!val) return 'NULL';
  return `'${val.replace(/'/g, "''")}'`;
}

const dataLines = lines.slice(1);
console.log(`Rows: ${dataLines.length}`);

// Generate SQL file
const BATCH_SIZE = 500;
const sqlLines: string[] = [];

sqlLines.push('-- Auto-generated Sabre property import');
sqlLines.push(`-- ${dataLines.length} rows from ${filePath}`);
sqlLines.push(`-- Generated: ${new Date().toISOString()}`);
sqlLines.push('');

for (let i = 0; i < dataLines.length; i += BATCH_SIZE) {
  const batch = dataLines.slice(i, i + BATCH_SIZE);
  const values = batch
    .map((line) => {
      // Simple CSV parse (handles quoted fields with commas)
      const row: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          row.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
      row.push(current);

      const gdsId = getVal(row, 'gds_property_id');
      const chain = getVal(row, 'property_chain');
      const name = getVal(row, 'property_name');

      if (!gdsId || !chain || !name) return null;

      const lat = getVal(row, 'latitude');
      const lng = getVal(row, 'longitude');

      return `(${escapeSql(gdsId)}, ${escapeSql(chain)}, ${escapeSql(name)}, ${escapeSql(getVal(row, 'street_address'))}, ${escapeSql(getVal(row, 'city_address'))}, ${escapeSql(getVal(row, 'state_province'))}, ${escapeSql(getVal(row, 'country_address'))}, ${escapeSql(getVal(row, 'zip_postal_code'))}, ${escapeSql(getVal(row, 'primary_airport'))}, ${lat ? lat : 'NULL'}, ${lng ? lng : 'NULL'})`;
    })
    .filter(Boolean);

  if (values.length > 0) {
    sqlLines.push(`INSERT OR REPLACE INTO sabre_properties (gds_property_id, property_chain, property_name, street_address, city_address, state_province, country_address, zip_postal_code, primary_airport, latitude, longitude) VALUES`);
    sqlLines.push(values.join(',\n') + ';');
    sqlLines.push('');
  }
}

const outputPath = resolve('./migrations/seed_properties.sql');
writeFileSync(outputPath, sqlLines.join('\n'));
console.log(`\nGenerated: ${outputPath}`);
console.log(`Batches: ${Math.ceil(dataLines.length / BATCH_SIZE)}`);
console.log(`\nTo import into D1:`);
if (isLocal) {
  console.log(`  wrangler d1 execute phut-db --local --file=${outputPath}`);
} else {
  console.log(`  wrangler d1 execute phut-db --file=${outputPath}`);
}
console.log(`\nNote: For files > 10MB, split the SQL file and run each chunk separately.`);
