const API_URL = import.meta.env.VITE_API_URL as string;

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("sbs_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ? JSON.stringify(body.error) : `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: any }>("/api/auth/me"),

  listEvents: () => request<{ events: any[] }>("/api/events"),
  createEvent: (data: any) =>
    request<{ event: any }>("/api/events", { method: "POST", body: JSON.stringify(data) }),
  getEvent: (id: number) => request<{ event: any; posts: any[] }>(`/api/events/${id}`),
  setEventStatus: (id: number, status: string) =>
    request(`/api/events/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  createPost: (data: any) =>
    request<{ post: any }>("/api/posts", { method: "POST", body: JSON.stringify(data) }),
  assignOfficer: (postId: number, data: any) =>
    request(`/api/posts/${postId}/assign`, { method: "POST", body: JSON.stringify(data) }),
  myAssignments: () => request<{ assignments: any[] }>("/api/posts/mine"),

  checkIn: (data: any) =>
    request<{ record: any; distanceMeters: number; status: string }>("/api/attendance/checkin", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listUsers: (agency?: string) =>
    request<{ users: any[] }>(`/api/users${agency ? `?agency=${agency}` : ""}`),
  createUser: (data: any) =>
    request<{ user: any }>("/api/users", { method: "POST", body: JSON.stringify(data) }),

  sendSos: (data: any) =>
    request<{ alert: any }>("/api/sos", { method: "POST", body: JSON.stringify(data) }),
  listSos: (eventId: number) => request<{ alerts: any[] }>(`/api/sos/event/${eventId}`),
  ackSos: (id: number) => request(`/api/sos/${id}/ack`, { method: "POST" }),
  resolveSos: (id: number) => request(`/api/sos/${id}/resolve`, { method: "POST" }),

  // Module 1 — AI Deployment Planner
  venueSuggestions: (venueName: string, excludeEventId?: number) =>
    request<{ suggestions: any[]; basedOnEvents: number; note: string }>(
      `/api/planner/venue-suggestions?venueName=${encodeURIComponent(venueName)}${
        excludeEventId ? `&excludeEventId=${excludeEventId}` : ""
      }`
    ),

  // Module 12 — Weather & Calendar Risk
  eventRisk: (eventId: number) =>
    request<{ riskScore: number; riskBand: string; weather: any; reasons: string[]; note: string }>(
      `/api/risk/events/${eventId}`
    ),

  // Module 11 — After-Action Report
  eventReport: (eventId: number) => request<any>(`/api/reports/events/${eventId}`),

  // Module 7 — Green Corridor / Convoys
  listConvoys: (eventId: number) => request<{ convoys: any[] }>(`/api/convoys/event/${eventId}`),
  createConvoy: (data: any) =>
    request<{ convoy: any; waypoints: any[] }>("/api/convoys", { method: "POST", body: JSON.stringify(data) }),
  startConvoy: (id: number) => request<{ convoy: any; alertWaypoint: any }>(`/api/convoys/${id}/start`, { method: "POST" }),
  advanceConvoy: (id: number) =>
    request<{ convoy: any; alertWaypoint: any; isComplete: boolean }>(`/api/convoys/${id}/advance`, { method: "POST" }),

  // Module 8 — Digital Nakabandi
  listWatchlist: () => request<{ entries: any[] }>("/api/checkpoints/watchlist"),
  addWatchlistEntry: (data: any) =>
    request<{ entry: any }>("/api/checkpoints/watchlist", { method: "POST", body: JSON.stringify(data) }),
  checkVehicle: (postId: number, vehicleNumber: string) =>
    request<{ log: any; outcome: string; matchReason: string | null }>(`/api/checkpoints/${postId}/check`, {
      method: "POST",
      body: JSON.stringify({ vehicleNumber }),
    }),
  checkpointLogs: (postId: number) => request<{ logs: any[] }>(`/api/checkpoints/${postId}/logs`),
};
