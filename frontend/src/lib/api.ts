const BASE = '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    window.location.href = '/auth/login';
    throw new Error('Not authenticated');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }

  return res.json();
}

// Auth
export const getMe = () => request<{ authenticated: boolean; user?: any }>('/auth/me');

// Properties
export const searchProperties = (params: Record<string, string>) => {
  const qs = new URLSearchParams(params).toString();
  return request<{ data: any[]; total: number; page: number; pages: number }>(
    `/api/properties/search?${qs}`
  );
};

export const getChains = () => request<any[]>('/api/properties/chains/list');

// Projects
export const listProjects = () => request<any[]>('/api/projects');
export const createProject = (name: string) =>
  request<{ id: string; name: string }>('/api/projects', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
export const getProject = (id: string) => request<any>(`/api/projects/${id}`);
export const renameProject = (id: string, name: string) =>
  request<{ ok: boolean }>(`/api/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
export const deleteProject = (id: string) =>
  request<{ ok: boolean }>(`/api/projects/${id}`, { method: 'DELETE' });

// Entries
export const listEntries = (projectId: string) =>
  request<any[]>(`/api/projects/${projectId}/entries`);

export const addEntry = (projectId: string, data: any) =>
  request<{ id: number }>(`/api/projects/${projectId}/entries`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const bulkAddEntries = (projectId: string, propertyIds: number[]) =>
  request<{ added: number }>(`/api/projects/${projectId}/entries/bulk`, {
    method: 'POST',
    body: JSON.stringify({ property_ids: propertyIds }),
  });

export const updateEntry = (projectId: string, entryId: number, data: any) =>
  request<{ ok: boolean }>(`/api/projects/${projectId}/entries/${entryId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteEntry = (projectId: string, entryId: number) =>
  request<{ ok: boolean }>(`/api/projects/${projectId}/entries/${entryId}`, {
    method: 'DELETE',
  });

// Export
export const validateProject = (projectId: string) =>
  request<any>(`/api/projects/${projectId}/export/validate`, { method: 'POST' });

export const previewExport = (projectId: string) =>
  request<any>(`/api/projects/${projectId}/export/preview`);

export const getExportUrl = (projectId: string) =>
  `/api/projects/${projectId}/export/csv`;

// Admin
export const getStats = () => request<any>('/api/admin/stats');
