import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listProjects, createProject, deleteProject, getStats } from '../lib/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    Promise.all([listProjects(), getStats().catch(() => null)])
      .then(([p, s]) => {
        setProjects(p);
        setStats(s);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const project = await createProject(newName.trim());
      navigate(`/project/${project.id}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete project "${name}" and all its entries?`)) return;
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading projects...
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
        {/* Stats */}
        {stats && (
          <div className="card" style={{ flex: '0 0 280px' }}>
            <h3 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              Database Stats
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 600 }}>
                  {stats.properties?.toLocaleString() || 0}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sabre Properties</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 600 }}>{stats.chains || 0}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Hotel Chains</div>
              </div>
            </div>
          </div>
        )}

        {/* New project */}
        <div className="card" style={{ flex: 1 }}>
          <h3 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            New Upload File
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="e.g. Q1 2026 Hotel Refresh - APAC"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
            >
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </div>
      </div>

      {/* Project list */}
      <div className="card">
        <div className="card-header">
          <h2>Your Projects</h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state">
            <h3>No projects yet</h3>
            <p>Create a new project above to start building a PHUT upload file.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Properties</th>
                <th>Last Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/project/${p.id}`)}
                >
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td>
                    <span className="badge badge-info">{p.entry_count || 0} entries</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {new Date(p.updated_at).toLocaleDateString('en-AU', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(p.id, p.name);
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
