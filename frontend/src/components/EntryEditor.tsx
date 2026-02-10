import { useState, useEffect, useRef } from 'react';

interface RatePeriod {
  rate: number;
  begin_date: string;
  end_date: string;
  currency: string;
}

interface Props {
  entry: any;
  onUpdate: (data: any) => void;
  onDelete: () => void;
}

export default function EntryEditor({ entry, onUpdate, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [rates, setRates] = useState<RatePeriod[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    try {
      setRates(JSON.parse(entry.rate_periods || '[]'));
    } catch {
      setRates([]);
    }
  }, [entry.rate_periods]);

  // Auto-save with debounce
  const debouncedUpdate = (data: any) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onUpdate(data), 600);
  };

  const handleFieldChange = (field: string, value: any) => {
    debouncedUpdate({ [field]: value });
  };

  const handleRateChange = (index: number, field: keyof RatePeriod, value: any) => {
    const updated = [...rates];
    updated[index] = { ...updated[index], [field]: field === 'rate' ? parseFloat(value) || 0 : value };
    setRates(updated);
    debouncedUpdate({ rate_periods: updated });
  };

  const addRate = () => {
    const updated = [...rates, { rate: 0, begin_date: '', end_date: '', currency: 'USD' }];
    setRates(updated);
    onUpdate({ rate_periods: updated });
  };

  const removeRate = (index: number) => {
    const updated = rates.filter((_, i) => i !== index);
    setRates(updated);
    onUpdate({ rate_periods: updated });
  };

  const isGds = entry.is_gds_flag === 'Y';

  return (
    <div className="entry-row">
      <div className="entry-row-header" onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'var(--text-dim)', fontSize: 12, transition: 'transform 0.15s', transform: expanded ? 'rotate(90deg)' : '' }}>
            ▶
          </span>
          <span className="entry-name">{entry.property_name || 'Untitled'}</span>
          {entry.property_chain && (
            <span className="badge badge-info" style={{ fontFamily: 'var(--mono)' }}>
              {entry.property_chain}
            </span>
          )}
        </div>
        <div className="entry-meta">
          {entry.city_address && <span>{entry.city_address}</span>}
          {entry.country_address && <span className="mono">{entry.country_address}</span>}
          <span className="badge badge-info">{rates.length} rate{rates.length !== 1 ? 's' : ''}</span>
          {entry.property_tier && (
            <span className="badge badge-warning">Tier {entry.property_tier}</span>
          )}
          <button
            className="btn btn-sm btn-danger"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Remove ${entry.property_name}?`)) onDelete();
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {expanded && (
        <div className="entry-row-body">
          {/* Identity fields */}
          <div style={{ padding: '12px 0' }}>
            <div className="form-row" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label>Property Name</label>
                <input
                  defaultValue={entry.property_name}
                  onChange={(e) => handleFieldChange('property_name', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>GDS Flag</label>
                <select
                  defaultValue={entry.is_gds_flag}
                  onChange={(e) => handleFieldChange('is_gds_flag', e.target.value)}
                >
                  <option value="Y">Y – GDS Property</option>
                  <option value="N">N – Non-GDS Property</option>
                </select>
              </div>
              <div className="form-group">
                <label>Chain Code</label>
                <input
                  defaultValue={entry.property_chain || ''}
                  maxLength={2}
                  style={{ fontFamily: 'var(--mono)', textTransform: 'uppercase' }}
                  onChange={(e) => handleFieldChange('property_chain', e.target.value.toUpperCase())}
                />
              </div>
              <div className="form-group">
                <label>GDS Property ID</label>
                <input
                  defaultValue={entry.gds_property_id || ''}
                  maxLength={16}
                  style={{ fontFamily: 'var(--mono)' }}
                  onChange={(e) => handleFieldChange('gds_property_id', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label>Street Address</label>
                <input
                  defaultValue={entry.street_address || ''}
                  onChange={(e) => handleFieldChange('street_address', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>City</label>
                <input
                  defaultValue={entry.city_address || ''}
                  onChange={(e) => handleFieldChange('city_address', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>State/Province</label>
                <input
                  defaultValue={entry.state_province || ''}
                  maxLength={2}
                  style={{ textTransform: 'uppercase' }}
                  onChange={(e) => handleFieldChange('state_province', e.target.value.toUpperCase())}
                />
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label>Country</label>
                <input
                  defaultValue={entry.country_address || ''}
                  maxLength={2}
                  style={{ fontFamily: 'var(--mono)', textTransform: 'uppercase' }}
                  onChange={(e) => handleFieldChange('country_address', e.target.value.toUpperCase())}
                />
              </div>
              <div className="form-group">
                <label>Zip/Postal Code</label>
                <input
                  defaultValue={entry.zip_postal_code || ''}
                  maxLength={10}
                  onChange={(e) => handleFieldChange('zip_postal_code', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Primary Airport</label>
                <input
                  defaultValue={entry.primary_airport || ''}
                  maxLength={3}
                  style={{ fontFamily: 'var(--mono)', textTransform: 'uppercase' }}
                  onChange={(e) => handleFieldChange('primary_airport', e.target.value.toUpperCase())}
                />
              </div>
            </div>

            {/* Rate Periods */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  Rate Periods
                </label>
                <button className="btn btn-sm" onClick={addRate}>
                  + Add Rate
                </button>
              </div>

              {rates.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                  No rate periods. Click "Add Rate" to define negotiated rates.
                </div>
              )}

              {rates.map((rp, i) => (
                <div key={i} className="rate-row">
                  <div className="form-group">
                    {i === 0 && <label>Begin Date</label>}
                    <input
                      type="text"
                      placeholder="mm/dd/yy"
                      value={rp.begin_date}
                      onChange={(e) => handleRateChange(i, 'begin_date', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    {i === 0 && <label>End Date</label>}
                    <input
                      type="text"
                      placeholder="mm/dd/yy"
                      value={rp.end_date}
                      onChange={(e) => handleRateChange(i, 'end_date', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    {i === 0 && <label>Rate</label>}
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={rp.rate || ''}
                      onChange={(e) => handleRateChange(i, 'rate', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    {i === 0 && <label>Currency</label>}
                    <input
                      type="text"
                      maxLength={3}
                      placeholder="USD"
                      value={rp.currency}
                      style={{ textTransform: 'uppercase' }}
                      onChange={(e) => handleRateChange(i, 'currency', e.target.value.toUpperCase())}
                    />
                  </div>
                  <div style={{ paddingTop: i === 0 ? 20 : 0 }}>
                    <button className="btn btn-sm btn-danger" onClick={() => removeRate(i)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Optional fields */}
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8, display: 'block' }}>
                Optional Fields
              </label>
              <div className="form-row" style={{ marginBottom: 12 }}>
                <div className="form-group">
                  <label>Property Tier</label>
                  <select
                    defaultValue={entry.property_tier || ''}
                    onChange={(e) => handleFieldChange('property_tier', e.target.value)}
                  >
                    <option value="">None</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={String(n)}>
                        {n} – Promoted
                      </option>
                    ))}
                    <option value="D">D – Demoted</option>
                    <option value="X">X – Excluded</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Green Property</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        defaultChecked={entry.green_property === 'Y'}
                        onChange={(e) =>
                          handleFieldChange('green_property', e.target.checked ? 'Y' : 'N')
                        }
                      />
                      <span className="toggle-slider" />
                    </label>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {entry.green_property === 'Y' ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: 12 }}>
                {['custom_tag1', 'custom_tag2', 'custom_tag3', 'custom_tag4'].map((tag, i) => (
                  <div className="form-group" key={tag}>
                    <label>Custom Tag {i + 1}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          defaultChecked={entry[tag] === 'Y'}
                          onChange={(e) =>
                            handleFieldChange(tag, e.target.checked ? 'Y' : 'N')
                          }
                        />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label>Property Note (shown to travellers, max 4000 chars)</label>
                <textarea
                  rows={3}
                  defaultValue={entry.property_note || ''}
                  maxLength={4000}
                  placeholder="e.g. Free breakfast and Wi-Fi included. Shuttle to office available."
                  onChange={(e) => handleFieldChange('property_note', e.target.value)}
                />
              </div>

              {/* Hotel Connect fields (non-GDS) */}
              {!isGds && (
                <div className="form-row" style={{ marginTop: 12 }}>
                  <div className="form-group">
                    <label>Supplier Property ID (Hotel Connect)</label>
                    <input
                      defaultValue={entry.supplier_property_id || ''}
                      maxLength={16}
                      style={{ fontFamily: 'var(--mono)' }}
                      onChange={(e) => handleFieldChange('supplier_property_id', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Channel Code</label>
                    <input
                      defaultValue={entry.channel_code || ''}
                      maxLength={3}
                      style={{ fontFamily: 'var(--mono)', textTransform: 'uppercase' }}
                      onChange={(e) => handleFieldChange('channel_code', e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
