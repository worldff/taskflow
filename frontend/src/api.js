// Klien REST API TaskFlow. Base URL relatif (/api) karena di production
// frontend dan backend disajikan dari origin yang sama melalui Nginx.
const BASE = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "taskflow_token";

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t) => {
    try { localStorage.setItem(TOKEN_KEY, t); } catch { /* abaikan */ }
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* abaikan */ }
  },
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Terjadi kesalahan (${res.status})`, res.status);
  return data;
}

export const api = {
  register: (name, email, password) =>
    request("/auth/register", { method: "POST", body: { name, email, password } }),
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password } }),
  me: () => request("/auth/me"),
  health: () => request("/health"),
  listTasks: (status) => request(`/tasks${status && status !== "semua" ? `?status=${status}` : ""}`),
  stats: () => request("/tasks/stats"),
  createTask: (task) => request("/tasks", { method: "POST", body: task }),
  updateTask: (id, changes) => request(`/tasks/${id}`, { method: "PATCH", body: changes }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: "DELETE" }),

  // ----- khusus admin -----
  adminListTasks: (status) =>
    request(`/admin/tasks${status && status !== "semua" ? `?status=${status}` : ""}`),
  adminStats: () => request("/admin/stats"),
  adminReview: (id, done) => request(`/admin/tasks/${id}`, { method: "PATCH", body: { done } }),
};
