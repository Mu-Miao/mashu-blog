export interface Tag { name: string; count: number }
export interface PostSummary {
  id: number; slug: string; title: string; kind: string; summary: string;
  status?: string; published_at: string | null; created_at: string; tags: string[];
}
export interface PostDetail extends PostSummary { body: string; rendered: string }
export interface Paged<T> { items: T[]; total: number; page: number; page_size: number }

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "same-origin", ...init });
  if (res.status === 204) return undefined as T;
  if (!res.ok) throw new ApiError(res.status);
  const ct = res.headers.get("content-type") || "";
  return (ct.includes("json") ? await res.json() : undefined) as T;
}

export const api = {
  get: <T>(p: string) => req<T>(`/api/v1${p}`),
  post: <T>(p: string, body?: unknown) =>
    req<T>(`/api/v1${p}`, body === undefined
      ? { method: "POST" }
      : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  upload: <T>(p: string, form: FormData) =>
    req<T>(`/api/v1${p}`, { method: "POST", body: form }),
  put: <T>(p: string, body: unknown) =>
    req<T>(`/api/v1${p}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  del: (p: string) => req<void>(`/api/v1${p}`, { method: "DELETE" }),
  login: (username: string, password: string) => api.post("/auth/login", { username, password }),
  logout: () => api.post("/auth/logout"),
};

export class ApiError extends Error {
  status: number;
  constructor(status: number) { super(`HTTP ${status}`); this.status = status; }
}
