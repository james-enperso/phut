import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getProject,
  listEntries,
  searchProperties,
  addEntry,
  bulkAddEntries,
  updateEntry,
  deleteEntry,
} from '../lib/api';
import EntryEditor from '../components/EntryEditor';
import PropertySearch from '../components/PropertySearch';

export default function Builder() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    if (!projectId) return;
    const data = await listEntries(projectId);
    setEntries(data);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([getProject(projectId), listEntries(projectId)])
      .then(([p, e]) => {
        setProject(p);
        setEntries(e);
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [projectId, navigate]);

  // Add a single Sabre property as an entry
  const handleAddProperty = async (property: any) => {
    if (!projectId) return;
    await addEntry(projectId, {
      property_name: property.property_name,
      is_gds_flag: 'Y',
      property_chain: property.property_chain,
      gds_property_id: property.gds_property_id,
      street_address: property.street_address,
      city_address: property.city_address,
      state_province: property.state_province,
      country_address: property.country_address,
      zip_postal_code: property.zip_postal_code,
      primary_airport: property.primary_airport,
    });
    await loadEntries();
  };

  // Bulk add
  const handleBulkAdd = async (propertyIds: number[]) => {
    if (!projectId) return;
    await bulkAddEntries(projectId, propertyIds);
    await loadEntries();
  };

  // Add manual non-GDS entry
  const handleAddManual = async () => {
    if (!projectId) return;
    await addEntry(projectId, {
      property_name: 'New Property',
      is_gds_flag: 'N',
    });
    await loadEntries();
  };

  // Update entry
  const handleUpdate = async (entryId: number, data: any) => {
    if (!projectId) return;
    await updateEntry(projectId, entryId, data);
    await loadEntries();
  };

  // Delete entry
  const handleDelete = async (entryId: number) => {
    if (!projectId) return;
    await deleteEntry(projectId, entryId);
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading project...
      </div>
    );
  }

  return (
    <div className="container">
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/" className="btn btn-sm btn-ghost">
            ← Back
          </Link>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>{project?.name}</h2>
          <span className="badge badge-info">{entries.length} properties</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={handleAddManual}>
            + Non-GDS Property
          </button>
          <Link to={`/project/${projectId}/export`} className="btn btn-sm btn-primary">
            Review &amp; Export CSV
          </Link>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="builder-layout">
        {/* Left: Search */}
        <div className="search-panel">
          <PropertySearch
            onAddProperty={handleAddProperty}
            onBulkAdd={handleBulkAdd}
            existingIds={new Set(entries.map((e) => `${e.property_chain}-${e.gds_property_id}`))}
          />
        </div>

        {/* Right: Entry list */}
        <div>
          {entries.length === 0 ? (
            <div className="card empty-state">
              <h3>No properties added yet</h3>
              <p>
                Search for Sabre properties on the left to add them to your upload file, or add a
                non-GDS property manually.
              </p>
            </div>
          ) : (
            <div>
              {entries.map((entry) => (
                <EntryEditor
                  key={entry.id}
                  entry={entry}
                  onUpdate={(data) => handleUpdate(entry.id, data)}
                  onDelete={() => handleDelete(entry.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
