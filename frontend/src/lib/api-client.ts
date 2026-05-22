const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("syntess_token");
}
export function setToken(token: string) { localStorage.setItem("syntess_token", token); }
export function clearToken()            { localStorage.removeItem("syntess_token"); }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init.headers as Record<string, string>) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401) { clearToken(); window.location.href = "/login"; throw new ApiError(401, "Sessie verlopen"); }
  if (!res.ok) { const b = await res.json().catch(() => ({ error: res.statusText })); throw new ApiError(res.status, b.error ?? "Onbekende fout"); }
  return res.json() as Promise<T>;
}

export const api = {
  get:  <T>(path: string)               => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
};

export interface PaginatedResult<T> { data: T[]; total: number; page: number; pageSize: number; totalPages: number; }
export interface LoginResponse { token: string; expiresIn: string; user: { username: string; role: string }; }

export const authApi = {
  login: (username: string, password: string) => api.post<LoginResponse>("/api/v1/auth/login", { username, password }),
  me:    () => api.get<{ username: string; role: string }>("/api/v1/auth/me"),
};

export const healthApi = {
  check: () => api.get<{ status: string; mode: string; db: { connected: boolean; latencyMs: number } }>("/api/v1/health"),
};

export const dashboardApi = {
  kpis:               () => api.get<Record<string, unknown>>("/api/v1/dashboard/kpis"),
  omzetPerMaand:      () => api.get<unknown[]>("/api/v1/dashboard/omzet-per-maand"),
  topKlanten:         () => api.get<unknown[]>("/api/v1/dashboard/top-klanten"),
  recenteWerkbonnen:  () => api.get<unknown[]>("/api/v1/dashboard/recente-werkbonnen"),
  urenStats:          () => api.get<Record<string, unknown>>("/api/v1/dashboard/uren-stats"),
  urenPerDag:         () => api.get<unknown[]>("/api/v1/dashboard/uren-per-dag"),
  urenPerMedewerker:  () => api.get<unknown[]>("/api/v1/dashboard/uren-per-medewerker"),
  urenPerProject:     () => api.get<unknown[]>("/api/v1/dashboard/uren-per-project"),
  recenteUren:        () => api.get<unknown[]>("/api/v1/dashboard/recente-uren"),
  medewerkers:        () => api.get<unknown[]>("/api/v1/dashboard/medewerkers"),
};

function buildQuery(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const projectenApi = {
  list:   (p: Record<string, unknown> = {}) => api.get<PaginatedResult<Record<string, unknown>>>(`/api/v1/projecten${buildQuery(p)}`),
  detail: (id: number) => api.get<Record<string, unknown>>(`/api/v1/projecten/${id}`),
};
export const facturenApi = {
  list:   (p: Record<string, unknown> = {}) => api.get<PaginatedResult<Record<string, unknown>>>(`/api/v1/facturen${buildQuery(p)}`),
  aging:  () => api.get<unknown[]>("/api/v1/facturen/aging"),
  detail: (id: number) => api.get<Record<string, unknown>>(`/api/v1/facturen/${id}`),
};
export const werkbonnenApi = {
  list:   (p: Record<string, unknown> = {}) => api.get<PaginatedResult<Record<string, unknown>>>(`/api/v1/werkbonnen${buildQuery(p)}`),
  detail: (id: number) => api.get<Record<string, unknown>>(`/api/v1/werkbonnen/${id}`),
  exportUrl: (p: Record<string, unknown> = {}) => `${API_URL}/api/v1/werkbonnen/export${buildQuery({ ...p, format: "xlsx" })}`,
};
export const klantenApi = {
  list:   (p: Record<string, unknown> = {}) => api.get<PaginatedResult<Record<string, unknown>>>(`/api/v1/klanten${buildQuery(p)}`),
  detail: (id: number) => api.get<Record<string, unknown>>(`/api/v1/klanten/${id}`),
};
export const inkoopApi = {
  list:           (p: Record<string, unknown> = {}) => api.get<PaginatedResult<Record<string, unknown>>>(`/api/v1/inkoop${buildQuery(p)}`),
  perKostensoort: () => api.get<unknown[]>("/api/v1/inkoop/per-kostensoort"),
};
export const grootboekApi = {
  rubrieken: () => api.get<unknown[]>("/api/v1/grootboek/rubrieken"),
  mutaties:  (p: Record<string, unknown> = {}) => api.get<PaginatedResult<Record<string, unknown>>>(`/api/v1/grootboek/mutaties${buildQuery(p)}`),
  resultaat: () => api.get<unknown[]>("/api/v1/grootboek/resultaat"),
};
export const rapportagesApi = {
  list:      () => api.get<{ id: string; title: string }[]>("/api/v1/rapportages"),
  exportUrl: (type: string, dateFrom?: string, dateTo?: string, format = "xlsx") =>
    `${API_URL}/api/v1/rapportages/export${buildQuery({ type, dateFrom, dateTo, format })}`,
};
