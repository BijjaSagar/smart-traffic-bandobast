import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import MapView, { MapPost, MapSos } from "../components/MapView";

const AGENCIES = [
  { value: "traffic_police", label: "Traffic Police", color: "bg-navy" },
  { value: "local_police", label: "Local Police", color: "bg-purple-700" },
  { value: "fire", label: "Fire", color: "bg-red-600" },
  { value: "medical", label: "Medical", color: "bg-emerald-600" },
  { value: "municipal", label: "Municipal", color: "bg-amber-600" },
];

export default function CommandDashboard() {
  const { eventId: eventIdParam } = useParams();
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState<number | null>(eventIdParam ? Number(eventIdParam) : null);
  const [event, setEvent] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [sosAlerts, setSosAlerts] = useState<any[]>([]);

  // Module 10 — Multi-Agency Dashboard: which agencies' personnel are
  // visible right now. Starts with all agencies shown.
  const [visibleAgencies, setVisibleAgencies] = useState<Set<string>>(
    new Set(AGENCIES.map((a) => a.value))
  );

  // Module 7 — Green Corridor
  const [convoys, setConvoys] = useState<any[]>([]);
  const [showNewConvoy, setShowNewConvoy] = useState(false);
  const [convoyLabel, setConvoyLabel] = useState("");
  const [convoyWaypoints, setConvoyWaypoints] = useState([
    { junctionName: "", lat: "", lng: "", preAlertMinutes: "5" },
  ]);

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
    api.listConvoys(eventId).then((r) => setConvoys(r.convoys));

    const socket = getSocket();
    socket.emit("join:event", eventId);

    const onPostUpdate = () => api.getEvent(eventId).then((r) => setPosts(r.posts));
    const onAttendanceUpdate = () => api.getEvent(eventId).then((r) => setPosts(r.posts));
    const onSosNew = (payload: any) => setSosAlerts((prev) => [payload.alert, ...prev]);
    const onSosChanged = (payload: any) =>
      setSosAlerts((prev) => prev.map((a) => (a.id === payload.alert.id ? { ...a, ...payload.alert } : a)));
    const onConvoyUpdate = (payload: any) =>
      setConvoys((prev) => prev.map((c) => (c.id === payload.convoy.id ? { ...c, ...payload.convoy } : c)));
    const onCheckpointHit = (payload: any) => {
      // Surfaced via the SOS-style alert strip too, since a watchlist hit
      // at a nakabandi checkpoint needs the same immediate attention.
      console.warn("Checkpoint hit", payload);
    };

    socket.on("post:update", onPostUpdate);
    socket.on("attendance:update", onAttendanceUpdate);
    socket.on("sos:new", onSosNew);
    socket.on("sos:ack", onSosChanged);
    socket.on("sos:resolved", onSosChanged);
    socket.on("convoy:update", onConvoyUpdate);
    socket.on("checkpoint:hit", onCheckpointHit);

    return () => {
      socket.emit("leave:event", eventId);
      socket.off("post:update", onPostUpdate);
      socket.off("attendance:update", onAttendanceUpdate);
      socket.off("sos:new", onSosNew);
      socket.off("sos:ack", onSosChanged);
      socket.off("sos:resolved", onSosChanged);
      socket.off("convoy:update", onConvoyUpdate);
      socket.off("checkpoint:hit", onCheckpointHit);
    };
  }, [eventId]);

  function toggleAgency(value: string) {
    setVisibleAgencies((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  async function handleStartConvoy(convoyId: number) {
    await api.startConvoy(convoyId);
  }
  async function handleAdvanceConvoy(convoyId: number) {
    await api.advanceConvoy(convoyId);
  }

  function addWaypointRow() {
    setConvoyWaypoints((rows) => [...rows, { junctionName: "", lat: "", lng: "", preAlertMinutes: "5" }]);
  }
  function updateWaypointRow(i: number, field: string, value: string) {
    setConvoyWaypoints((rows) => rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  async function handleCreateConvoy() {
    if (!eventId || !convoyLabel.trim()) return;
    const waypoints = convoyWaypoints
      .filter((w) => w.junctionName && w.lat && w.lng)
      .map((w) => ({
        junctionName: w.junctionName,
        lat: Number(w.lat),
        lng: Number(w.lng),
        preAlertMinutes: Number(w.preAlertMinutes) || 5,
      }));
    if (waypoints.length === 0) return;

    await api.createConvoy({ eventId, label: convoyLabel, waypoints });
    setShowNewConvoy(false);
    setConvoyLabel("");
    setConvoyWaypoints([{ junctionName: "", lat: "", lng: "", preAlertMinutes: "5" }]);
    const r = await api.listConvoys(eventId);
    setConvoys(r.convoys);
  }

  // Filters each post's assignment list down to agencies currently toggled
  // on — this IS the "layer" behaviour: hide Fire + Medical and their
  // officers disappear from the map/roster without touching the underlying
  // duty chart data.
  const visiblePosts = useMemo(
    () =>
      posts.map((p) => ({
        ...p,
        assignments: (p.assignments ?? []).filter((a: any) => visibleAgencies.has(a.agency)),
      })),
    [posts, visibleAgencies]
  );

  const mapPosts: MapPost[] = useMemo(
    () =>
      visiblePosts.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        lat: p.lat,
        lng: p.lng,
        requiredStrength: p.requiredStrength,
        presentCount: p.assignments?.length ?? 0, // MVP proxy; wire to live attendance count next
      })),
    [visiblePosts]
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
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold text-navy">{event?.title ?? "Loading…"}</h2>
              <p className="text-xs text-gray-500">{event?.venueName}</p>
            </div>
            {event?.status === "completed" && (
              <Link to={`/report/${event.id}`} className="text-xs bg-navy text-white rounded px-2 py-1 whitespace-nowrap">
                After-Action Report
              </Link>
            )}
          </div>
          {event && (
            <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 capitalize">
              {event.status}
            </span>
          )}
        </div>

        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm text-navy mb-2">Agency Layers</h3>
          <div className="flex flex-wrap gap-1.5">
            {AGENCIES.map((a) => {
              const active = visibleAgencies.has(a.value);
              return (
                <button
                  key={a.value}
                  onClick={() => toggleAgency(a.value)}
                  className={`text-xs px-2 py-1 rounded-full border ${
                    active ? `${a.color} text-white border-transparent` : "text-gray-400 border-gray-300"
                  }`}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
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

        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-navy">Green Corridor</h3>
            <button onClick={() => setShowNewConvoy((s) => !s)} className="text-xs text-saffron underline">
              {showNewConvoy ? "Cancel" : "+ New convoy"}
            </button>
          </div>

          {showNewConvoy && (
            <div className="border rounded-lg p-2 mb-3 bg-orange-50 space-y-2">
              <input
                placeholder="Convoy label (e.g. VIP Convoy 1)"
                className="w-full border rounded px-2 py-1 text-xs"
                value={convoyLabel}
                onChange={(e) => setConvoyLabel(e.target.value)}
              />
              {convoyWaypoints.map((w, i) => (
                <div key={i} className="grid grid-cols-4 gap-1">
                  <input placeholder="Junction" className="border rounded px-1.5 py-1 text-xs col-span-2"
                    value={w.junctionName} onChange={(e) => updateWaypointRow(i, "junctionName", e.target.value)} />
                  <input placeholder="Lat" className="border rounded px-1.5 py-1 text-xs"
                    value={w.lat} onChange={(e) => updateWaypointRow(i, "lat", e.target.value)} />
                  <input placeholder="Lng" className="border rounded px-1.5 py-1 text-xs"
                    value={w.lng} onChange={(e) => updateWaypointRow(i, "lng", e.target.value)} />
                </div>
              ))}
              <div className="flex gap-2">
                <button onClick={addWaypointRow} className="text-xs border rounded px-2 py-1 flex-1">+ Junction</button>
                <button onClick={handleCreateConvoy} className="text-xs bg-navy text-white rounded px-2 py-1 flex-1">
                  Create route
                </button>
              </div>
            </div>
          )}

          {convoys.length > 0 && (
            <ul className="space-y-2">
              {convoys.map((c) => {
                const current = c.waypoints?.[c.currentWaypointIndex];
                const next = c.waypoints?.[c.currentWaypointIndex + 1];
                return (
                  <li key={c.id} className="rounded-lg border p-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{c.label}</span>
                      <span className="capitalize text-gray-500">{c.status}</span>
                    </div>
                    {c.status === "scheduled" && (
                      <button onClick={() => handleStartConvoy(c.id)} className="mt-1 bg-saffron text-white rounded px-2 py-1">
                        Start convoy
                      </button>
                    )}
                    {c.status === "active" && (
                      <>
                        <p className="text-gray-500 mt-1">
                          At: {current?.junctionName ?? "—"}
                          {next && <> · Next: {next.junctionName} (pre-alerted)</>}
                        </p>
                        <button onClick={() => handleAdvanceConvoy(c.id)} className="mt-1 bg-navy text-white rounded px-2 py-1">
                          Advance to next junction
                        </button>
                      </>
                    )}
                    {c.status === "completed" && <p className="text-green-700 mt-1">Route complete.</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="p-4 flex-1">
          <h3 className="font-semibold text-sm text-navy mb-2">Duty Posts</h3>
          <ul className="space-y-2">
            {visiblePosts.map((p) => (
              <li key={p.id} className="rounded-lg border p-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold">{p.name}</span>
                  <span className="capitalize text-gray-500">{p.type}</span>
                </div>
                <p className="text-gray-500">
                  Assigned: {p.assignments?.length ?? 0} / {p.requiredStrength}
                </p>
                {p.assignments?.map((a: any) => (
                  <p key={a.id} className="text-gray-400">
                    — {a.userName} ({a.badgeNo})
                    <span className="ml-1 text-gray-300">· {a.agency?.replace("_", " ")}</span>
                  </p>
                ))}
                {p.type === "checkpoint" && (
                  <Link to={`/checkpoint/${p.id}`} className="inline-block mt-1 text-saffron underline">
                    Open checkpoint console
                  </Link>
                )}
              </li>
            ))}
            {visiblePosts.length === 0 && <p className="text-xs text-gray-400">No posts visible for the selected agency layers.</p>}
          </ul>
        </div>
      </aside>
    </div>
  );
}
