import { PhutEntry, RatePeriod } from '../types';

// Column order must match the PHUT template exactly
const STATIC_HEADERS_BEFORE_RATES = [
  'property_name',
  'is_property_in_the_gds_flag',
  'supplier_property_id',
  'channel_code',
  'property_chain',
  'gds_property_id',
  'primary_airport',
];

const STATIC_HEADERS_AFTER_RATES = [
  'street_address',
  'city_address',
  'state/province_address',
  'country_address',
  'zip/postal_code_address',
  'property_tier',
  'green_property',
  'property_note',
  'custom_tag1',
  'custom_tag2',
  'custom_tag3',
  'custom_tag4',
];

export function buildCsv(entries: PhutEntry[]): string {
  if (entries.length === 0) return '';

  // Determine max rate periods across all entries
  let maxRates = 0;
  const parsedRates: RatePeriod[][] = entries.map((e) => {
    const periods: RatePeriod[] = JSON.parse(e.rate_periods || '[]');
    if (periods.length > maxRates) maxRates = periods.length;
    return periods;
  });

  // Ensure at least 1 rate group in headers
  if (maxRates === 0) maxRates = 1;

  // Build header row
  const headers: string[] = [...STATIC_HEADERS_BEFORE_RATES];
  for (let i = 1; i <= maxRates; i++) {
    headers.push(`rate${i}`, `begin_date${i}`, `end_date${i}`, `currency${i}`);
  }
  headers.push(...STATIC_HEADERS_AFTER_RATES);

  // Build data rows
  const rows = entries.map((entry, idx) => {
    const rates = parsedRates[idx];
    const values: string[] = [];

    // Before-rates fields
    values.push(
      csvEscape(entry.property_name || ''),
      csvEscape(entry.is_gds_flag || 'Y'),
      csvEscape(entry.supplier_property_id || ''),
      csvEscape(entry.channel_code || ''),
      csvEscape(entry.property_chain || ''),
      csvEscape(entry.gds_property_id || ''),
      csvEscape(entry.primary_airport || ''),
    );

    // Rate period columns
    for (let i = 0; i < maxRates; i++) {
      if (i < rates.length) {
        const rp = rates[i];
        values.push(
          rp.rate?.toString() || '',
          csvEscape(rp.begin_date || ''),
          csvEscape(rp.end_date || ''),
          csvEscape(rp.currency || ''),
        );
      } else {
        values.push('', '', '', '');
      }
    }

    // After-rates fields
    values.push(
      csvEscape(entry.street_address || ''),
      csvEscape(entry.city_address || ''),
      csvEscape(entry.state_province || ''),
      csvEscape(entry.country_address || ''),
      csvEscape(entry.zip_postal_code || ''),
      csvEscape(entry.property_tier || ''),
      csvEscape(entry.green_property || ''),
      csvEscape(entry.property_note || ''),
      csvEscape(entry.custom_tag1 || ''),
      csvEscape(entry.custom_tag2 || ''),
      csvEscape(entry.custom_tag3 || ''),
      csvEscape(entry.custom_tag4 || ''),
    );

    return values.join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

function csvEscape(value: string): string {
  if (!value) return '';
  // Quote if contains comma, newline, or double quote
  if (value.includes(',') || value.includes('\n') || value.includes('\r') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
