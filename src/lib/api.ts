const API_BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("tfo-access-token");
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    const refreshToken = localStorage.getItem("tfo-refresh-token");
    if (refreshToken) {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshRes.ok) {
        const { accessToken } = await refreshRes.json();
        localStorage.setItem("tfo-access-token", accessToken);
        headers["Authorization"] = `Bearer ${accessToken}`;
        return fetch(`${API_BASE}${path}`, { ...options, headers });
      }
    }
    // Refresh failed — clear session and redirect
    localStorage.removeItem("tfo-access-token");
    localStorage.removeItem("tfo-refresh-token");
    localStorage.removeItem("tfo-user");
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  return res;
}

async function safeJson(r: Response) {
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return [];
  return r.json();
}

export const api = {
  get: (path: string) => apiFetch(path).then(safeJson),
  post: (path: string, body: unknown) =>
    apiFetch(path, { method: "POST", body: JSON.stringify(body) }).then(safeJson),
  patch: (path: string, body: unknown) =>
    apiFetch(path, { method: "PATCH", body: JSON.stringify(body) }).then(safeJson),
  put: (path: string, body: unknown) =>
    apiFetch(path, { method: "PUT", body: JSON.stringify(body) }).then(safeJson),
  delete: (path: string) =>
    apiFetch(path, { method: "DELETE" }).then(safeJson),
};
