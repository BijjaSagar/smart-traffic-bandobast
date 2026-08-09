import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import MapView, { MapPost, MapSos } from "../components/MapView";

export default function CommandDashboard() {
  const { eventId: eventIdParam } = useParams();
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState<number | null>(eventIdParam ? Number(eventIdParam) : null);
  const [event, setEvent] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [sosAlerts, setSosAlerts] = useState<any[]>([]);

  useEffect(() => {
    api.listEvents().then((r) => {
      setEvents(r.events);
      if (!eventId && r.events.length) setEventId(r.events[0].id);
    });
  }, []);

  useEffect(() => {
    if (!eventId) return;
    api.getEvent(eventId).then((r) => {
      setEvent(r.event);
      setPosts(r.posts);
    });
    api.listSos(eventId).then((r) => setSosAlerts(r.alerts));

    const socket = getSocket();
    socket.emit("join:event", eventId);

    const onPostUpdate = () => api.getEvent(eventId).then((r) => setPosts(r.posts));
    const onAttendanceUpdate = () => api.getEvent(eventId).then((r) => setPosts(r.posts));
    const onSosNew = (payload: any) => setSosAlerts((prev) => [payload.alert, ...prev]);
    const onSosChanged = (payload: any) =>
      setSosAlerts((prev) => prev.map((a) => (a.id === payload.alert.id ? { ...a, ...payload.alert } : a)));

    socket.on("post:update", onPostUpdate);
    socket.on("attendance:update", onAttendanceUpdate);
    socket.on("sos:new", onSosNew);
    socket.on("sos:ack", onSosChanged);
    socket.on("sos:resolved", onSosChanged);

    return () => {
      socket.emit("leave:event", eventId);
      socket.off("post:update", onPostUpdate);
      socket.off("attendance:update", onAttendanceUpdate);
      socket.off("sos:new", onSosNew);
      socket.off("sos:ack", onSosChanged);
      socket.off("sos:resolved", onSosChanged);
    };
  }, [eventId]);

  const mapPosts: MapPost[] = useMemo(
    () =>
      posts.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        lat: p.lat,
        lng: p.lng,
        requiredStrength: p.requiredStrength,
        presentCount: p.assignments?.length ?? 0, // MVP proxy; wire to live attendance count next
      })),
    [posts]
  );

  const mapSos: MapSos[] = sosAlerts.map((a) => ({
    id: a.id, lat: a.lat, lng: a.lng, status: a.status, officerName: a.userName, badgeNo: a.badgeNo,
  }));

  async function handleAck(id: number) {
    await api.ackSos(id);
  }
  async function handleResolve(id: number) {
    await api.resolveSos(id);
  }

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_360px]">
      <div className="relative">
        {event && (
          <MapView
            centerLat={event.venueLat}
            centerLng={event.venueLng}
            posts={mapPosts}
            sosAlerts={mapSos}
          />
        )}
        {events.length > 1 && (
          <select
            className="absolute top-3 left-3 z-10 bg-white shadow rounded-lg px-3 py-2 text-sm"
            value={eventId ?? ""}
            onChange={(e) => setEventId(Number(e.target.value))}
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        )}
      </div>

      <aside className="border-l bg-white overflow-y-auto flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-bold text-navy">{event?.title ?? "Loading…"}</h2>
          <p className="text-xs text-gray-500">{event?.venueName}</p>
          {event && (
            <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 capitalize">
              {event.status}
            </span>
          )}
        </div>

        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm text-navy mb-2">
            SOS Alerts {sosAlerts.some((a) => a.status === "open") && (
              <span className="text-alert">● live</span>
            )}
          </h3>
          {sosAlerts.length === 0 && <p className="text-xs text-gray-400">No alerts.</p>}
          <ul className="space-y-2">
            {sosAlerts.map((a) => (
              <li key={a.id} className={`rounded-lg border p-2 text-xs ${a.status === "open" ? "border-alert bg-red-50" : "border-gray-200"}`}>
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{a.userName} ({a.badgeNo})</span>
                  <span className="capitalize text-gray-500">{a.status}</span>
                </div>
                <p className="text-gray-500">{new Date(a.createdAt).toLocaleTimeString()}</p>
                <div className="mt-1 flex gap-2">
                  {a.status === "open" && (
                    <button onClick={() => handleAck(a.id)} className="bg-saffron text-white rounded px-2 py-1">
                      Acknowledge
                    </button>
                  )}
                  {a.status !== "resolved" && (
                    <button onClick={() => handleResolve(a.id)} className="bg-navy text-white rounded px-2 py-1">
                      Resolve
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 flex-1">
          <h3 className="font-semibold text-sm text-navy mb-2">Duty Posts</h3>
          <ul className="space-y-2">
            {posts.map((p) => (
              <li key={p.id} className="rounded-lg border p-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold">{p.name}</span>
                  <span className="capitalize text-gray-500">{p.type}</span>
                </div>
                <p className="text-gray-500">
                  Assigned: {p.assignments?.length ?? 0} / {p.requiredStrength}
                </p>
                {p.assignments?.map((a: any) => (
                  <p key={a.id} className="text-gray-400">— {a.userName} ({a.badgeNo})</p>
                ))}
              </li>
            ))}
            {posts.length === 0 && <p className="text-xs text-gray-400">No posts yet — add some in Duty Planner.</p>}
          </ul>
        </div>
      </aside>
    </div>
  );
}
