// Where the API lives. Empty = same origin (local dev via the Vite proxy, or
// the Docker image that serves both). On Vercel, set VITE_API_URL to the
// Render backend, e.g. https://vitalis-api.onrender.com
const raw = (import.meta.env.VITE_API_URL ?? '').trim();
export const API_BASE = raw.replace(/\/+$/, '');

export const apiUrl = (path: string) => `${API_BASE}${path}`;
