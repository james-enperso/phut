import { PhutEntry, RatePeriod, ValidationError, EntryValidation } from '../types';

export function validateEntry(entry: PhutEntry): EntryValidation {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const isGds = entry.is_gds_flag === 'Y';
  const isHotelConnect = !!entry.supplier_property_id || !!entry.channel_code;
  const ratePeriods: RatePeriod[] = JSON.parse(entry.rate_periods || '[]');

  // is_gds_flag
  if (!['Y', 'N'].includes(entry.is_gds_flag)) {
    errors.push({ field: 'is_gds_flag', message: 'Must be Y or N' });
  }

  // GDS-required fields
  if (isGds) {
    if (!entry.property_chain || entry.property_chain.length !== 2) {
      errors.push({ field: 'property_chain', message: 'Required for GDS properties (2 characters)' });
    }
    if (!entry.gds_property_id) {
      errors.push({ field: 'gds_property_id', message: 'Required for GDS properties' });
    } else if (entry.gds_property_id.length > 16) {
      errors.push({ field: 'gds_property_id', message: 'Max 16 characters' });
    }
  }

  // Non-GDS required fields
  if (!isGds) {
    if (!entry.property_name) {
      errors.push({ field: 'property_name', message: 'Required for non-GDS properties' });
    }
    if (!entry.street_address) {
      errors.push({ field: 'street_address', message: 'Required for non-GDS properties' });
    }
    if (!entry.city_address) {
      errors.push({ field: 'city_address', message: 'Required for non-GDS properties' });
    }
    if (!entry.country_address) {
      errors.push({ field: 'country_address', message: 'Required for non-GDS properties' });
    }
    if (!entry.primary_airport) {
      errors.push({ field: 'primary_airport', message: 'Required for non-GDS properties' });
    }
    // state_province required for US only
    if (entry.country_address === 'US' && !entry.state_province) {
      errors.push({ field: 'state_province', message: 'Required for US properties' });
    }
  }

  // Hotel Connect fields
  if (isHotelConnect) {
    if (!entry.supplier_property_id || entry.supplier_property_id.length !== 16) {
      errors.push({ field: 'supplier_property_id', message: 'Required for Hotel Connect (16 chars, zero-padded)' });
    }
    if (!entry.channel_code || entry.channel_code.length !== 3) {
      errors.push({ field: 'channel_code', message: 'Required for Hotel Connect (3 chars)' });
    }
  }

  // Field length validations
  if (entry.property_name && entry.property_name.length > 64) {
    errors.push({ field: 'property_name', message: 'Max 64 characters' });
  }
  if (entry.street_address && entry.street_address.length > 64) {
    errors.push({ field: 'street_address', message: 'Max 64 characters' });
  }
  if (entry.city_address && entry.city_address.length > 32) {
    errors.push({ field: 'city_address', message: 'Max 32 characters' });
  }
  if (entry.state_province && entry.state_province.length > 2) {
    errors.push({ field: 'state_province', message: 'Max 2 characters' });
  }
  if (entry.country_address && entry.country_address.length > 2) {
    errors.push({ field: 'country_address', message: 'Max 2 characters' });
  }
  if (entry.primary_airport && entry.primary_airport.length > 3) {
    errors.push({ field: 'primary_airport', message: 'Max 3 characters' });
  }
  if (entry.property_note && entry.property_note.length > 4000) {
    errors.push({ field: 'property_note', message: 'Max 4000 characters' });
  }

  // Rate periods
  if (ratePeriods.length === 0) {
    warnings.push({ field: 'rate_periods', message: 'No rate periods defined — rate fields will be empty in CSV' });
  }

  if (ratePeriods.length > 40) {
    errors.push({ field: 'rate_periods', message: 'Maximum 40 rate periods' });
  }

  ratePeriods.forEach((rp, i) => {
    const prefix = `rate_periods[${i}]`;

    if (typeof rp.rate !== 'number' || rp.rate < 0) {
      errors.push({ field: `${prefix}.rate`, message: 'Rate must be a positive number' });
    }
    if (!rp.currency || rp.currency.length !== 3) {
      errors.push({ field: `${prefix}.currency`, message: 'Currency must be 3 characters' });
    }
    if (!isValidDate(rp.begin_date)) {
      errors.push({ field: `${prefix}.begin_date`, message: 'Invalid date format (mm/dd/yy)' });
    }
    if (!isValidDate(rp.end_date)) {
      errors.push({ field: `${prefix}.end_date`, message: 'Invalid date format (mm/dd/yy)' });
    }
    if (isValidDate(rp.begin_date) && isValidDate(rp.end_date)) {
      if (parseDate(rp.end_date) < parseDate(rp.begin_date)) {
        errors.push({ field: `${prefix}.end_date`, message: 'End date must be on or after begin date' });
      }
    }
  });

  // Optional field validation
  if (entry.property_tier) {
    const validTiers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'D', 'X'];
    if (!validTiers.includes(entry.property_tier.toUpperCase())) {
      errors.push({ field: 'property_tier', message: 'Must be 1-10, D, or X' });
    }
  }

  if (entry.green_property && !['Y', 'N'].includes(entry.green_property.toUpperCase())) {
    errors.push({ field: 'green_property', message: 'Must be Y or N' });
  }

  for (const tag of ['custom_tag1', 'custom_tag2', 'custom_tag3', 'custom_tag4'] as const) {
    const val = entry[tag];
    if (val && !['Y', 'N', ''].includes(val.toUpperCase())) {
      errors.push({ field: tag, message: 'Must be Y or N' });
    }
  }

  return {
    entry_id: entry.id,
    property_name: entry.property_name,
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function isValidDate(d: string): boolean {
  if (!d) return false;
  return /^\d{2}\/\d{2}\/\d{2}$/.test(d);
}

function parseDate(d: string): Date {
  const [mm, dd, yy] = d.split('/');
  const year = parseInt(yy, 10) + 2000;
  return new Date(year, parseInt(mm, 10) - 1, parseInt(dd, 10));
}
