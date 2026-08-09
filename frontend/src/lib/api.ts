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

  listUsers: () => request<{ users: any[] }>("/api/users"),

  sendSos: (data: any) =>
    request<{ alert: any }>("/api/sos", { method: "POST", body: JSON.stringify(data) }),
  listSos: (eventId: number) => request<{ alerts: any[] }>(`/api/sos/event/${eventId}`),
  ackSos: (id: number) => request(`/api/sos/${id}/ack`, { method: "POST" }),
  resolveSos: (id: number) => request(`/api/sos/${id}/resolve`, { method: "POST" }),
};
