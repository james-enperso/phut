import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { validateProject, getExportUrl, getProject, listEntries } from '../lib/api';

export default function Export() {
  const { id: projectId } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [validation, setValidation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      getProject(projectId),
      validateProject(projectId),
      listEntries(projectId),
    ])
      .then(([p, v, e]) => {
        setProject(p);
        setValidation(v);
        setEntries(e);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Validating entries...
      </div>
    );
  }

  const chainSummary: Record<string, number> = {};
  const countrySummary: Record<string, number> = {};
  entries.forEach((e) => {
    const chain = e.property_chain || 'N/A';
    const country = e.country_address || 'N/A';
    chainSummary[chain] = (chainSummary[chain] || 0) + 1;
    countrySummary[country] = (countrySummary[country] || 0) + 1;
  });

  return (
    <div className="container" style={{ maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link to={`/project/${projectId}`} className="btn btn-sm btn-ghost">
          ← Back to Builder
        </Link>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Review &amp; Export</h2>
      </div>

      {/* Validation summary */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h2>Validation</h2>
          {validation?.valid ? (
            <span className="badge badge-success">✓ All entries valid</span>
          ) : (
            <span className="badge badge-danger">
              {validation?.errors || 0} entries with errors
            </span>
          )}
        </div>

        {validation?.entries?.filter((v: any) => !v.valid || v.warnings.length > 0)
          .map((v: any) => (
            <div
              key={v.entry_id}
              style={{
                padding: '10px 12px',
                borderBottom: '1px solid var(--border)',
                fontSize: 13,
              }}
            >
              <strong>{v.property_name}</strong>
              {v.errors.map((err: any, i: number) => (
                <div key={i} style={{ color: 'var(--danger)', marginTop: 4 }}>
                  ✗ {err.field}: {err.message}
                </div>
              ))}
              {v.warnings.map((w: any, i: number) => (
                <div key={i} style={{ color: 'var(--warning)', marginTop: 4 }}>
                  ⚠ {w.field}: {w.message}
                </div>
              ))}
            </div>
          ))}

        {validation?.valid && validation?.warnings === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>
            All {validation.total} entries pass validation. Ready to export.
          </p>
        )}
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <h3 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            By Chain
          </h3>
          {Object.entries(chainSummary)
            .sort(([, a], [, b]) => b - a)
            .map(([chain, count]) => (
              <div
                key={chain}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  fontSize: 13,
                }}
              >
                <span className="mono">{chain}</span>
                <span style={{ color: 'var(--text-muted)' }}>{count}</span>
              </div>
            ))}
        </div>
        <div className="card">
          <h3 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            By Country
          </h3>
          {Object.entries(countrySummary)
            .sort(([, a], [, b]) => b - a)
            .map(([country, count]) => (
              <div
                key={country}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  fontSize: 13,
                }}
              >
                <span className="mono">{country}</span>
                <span style={{ color: 'var(--text-muted)' }}>{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Download */}
      <div className="card" style={{ textAlign: 'center', padding: 32 }}>
        <h3 style={{ marginBottom: 8 }}>
          {project?.name}.csv
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
          {entries.length} properties · Ready for Preferred Hotel Upload Tool
        </p>
        <a
          href={getExportUrl(projectId!)}
          className="btn btn-primary"
          style={{ padding: '12px 32px', fontSize: 15 }}
          download
        >
          ↓ Download CSV
        </a>
      </div>
    </div>
  );
}
