const BASE = '/api';
const token = () => localStorage.getItem('token') ?? '';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token()}`,
});

const request = async (method: string, path: string, body?: unknown) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: authHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

export const api = {
  get:    (path: string)               => request('GET',    path),
  post:   (path: string, body: unknown)=> request('POST',   path, body),
  put:    (path: string, body: unknown)=> request('PUT',    path, body),
  delete: (path: string)               => request('DELETE', path),
};

export const apiUpload = async (method: string, path: string, formData: FormData) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};
