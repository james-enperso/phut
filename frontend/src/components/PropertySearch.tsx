import { useState, useEffect } from 'react';
import { searchProperties, getChains } from '../lib/api';

interface Props {
  onAddProperty: (property: any) => void;
  onBulkAdd: (propertyIds: number[]) => void;
  existingIds: Set<string>;
}

export default function PropertySearch({ onAddProperty, onBulkAdd, existingIds }: Props) {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [chain, setChain] = useState('');
  const [airport, setAirport] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [searching, setSearching] = useState(false);
  const [chains, setChains] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    getChains().then(setChains).catch(() => {});
  }, []);

  const handleSearch = async (p = 1) => {
    const params: Record<string, string> = {};
    if (query) params.q = query;
    if (city) params.city = city;
    if (country) params.country = country;
    if (chain) params.chain = chain;
    if (airport) params.airport = airport;
    params.page = String(p);

    if (Object.keys(params).length <= 1) return; // only page, no filters

    setSearching(true);
    try {
      const res = await searchProperties(params);
      setResults(res.data);
      setTotal(res.total);
      setPage(res.page);
      setPages(res.pages);
      setSelected(new Set());
    } finally {
      setSearching(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAdd = () => {
    if (selected.size === 0) return;
    onBulkAdd(Array.from(selected));
    setSelected(new Set());
  };

  const isAlreadyAdded = (p: any) =>
    existingIds.has(`${p.property_chain}-${p.gds_property_id}`);

  return (
    <div className="card">
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
        Search Sabre Properties
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          type="text"
          placeholder="Property name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input
            type="text"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <input
            type="text"
            placeholder="Country (2-letter)"
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            maxLength={2}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <select value={chain} onChange={(e) => setChain(e.target.value)}>
            <option value="">All chains</option>
            {chains.map((ch) => (
              <option key={ch.code} value={ch.code}>
                {ch.code} – {ch.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Airport (IATA)"
            value={airport}
            onChange={(e) => setAirport(e.target.value.toUpperCase())}
            maxLength={3}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <button className="btn btn-primary" onClick={() => handleSearch()} disabled={searching}>
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {total.toLocaleString()} results · Page {page}/{pages}
            </span>
            {selected.size > 0 && (
              <button className="btn btn-sm btn-primary" onClick={handleBulkAdd}>
                Add {selected.size} selected
              </button>
            )}
          </div>

          <div className="search-results">
            {results.map((p) => {
              const added = isAlreadyAdded(p);
              return (
                <div key={p.id} className="search-result-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      disabled={added}
                    />
                    <div className="prop-info" style={{ flex: 1 }}>
                      <h4>{p.property_name}</h4>
                      <p>
                        {[p.city_address, p.state_province, p.country_address]
                          .filter(Boolean)
                          .join(', ')}{' '}
                        · <span className="mono">{p.property_chain}</span>{' '}
                        <span className="mono">{p.gds_property_id}</span>
                        {p.primary_airport && (
                          <>
                            {' '}· <span className="mono">{p.primary_airport}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="prop-meta">
                    {added ? (
                      <span className="badge badge-success">Added</span>
                    ) : (
                      <button
                        className="btn btn-sm"
                        onClick={() => onAddProperty(p)}
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-sm"
                disabled={page <= 1}
                onClick={() => handleSearch(page - 1)}
              >
                ← Prev
              </button>
              <span>
                {page} / {pages}
              </span>
              <button
                className="btn btn-sm"
                disabled={page >= pages}
                onClick={() => handleSearch(page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {results.length === 0 && total === 0 && !searching && (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Enter search criteria and click Search to find Sabre hotel properties.
        </div>
      )}
    </div>
  );
}
