import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import MapView, { MapPost } from "../components/MapView";

const POST_TYPES = ["picket", "barricade", "checkpoint", "medical", "parking"];

export default function EventPlanner() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);

  const [pendingPoint, setPendingPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [postForm, setPostForm] = useState({ name: "", type: "picket", geofenceRadiusM: 75, requiredStrength: 2 });

  const [showNewEvent, setShowNewEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "", eventType: "festival", venueName: "", venueLat: 18.5158, venueLng: 73.8567,
    startAt: "", endAt: "", expectedFootfall: 10000,
  });

  function refreshEvents() {
    api.listEvents().then((r) => {
      setEvents(r.events);
      if (!selectedEventId && r.events.length) setSelectedEventId(r.events[0].id);
    });
  }

  useEffect(() => { refreshEvents(); api.listUsers().then((r) => setOfficers(r.users)); }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    api.getEvent(selectedEventId).then((r) => setPosts(r.posts));
  }, [selectedEventId]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  async function handleCreateEvent(e: FormEvent) {
    e.preventDefault();
    const { event } = await api.createEvent(eventForm);
    setShowNewEvent(false);
    refreshEvents();
    setSelectedEventId(event.id);
  }

  function handleMapClick(lat: number, lng: number) {
    setPendingPoint({ lat, lng });
  }

  async function handleCreatePost(e: FormEvent) {
    e.preventDefault();
    if (!pendingPoint || !selectedEventId) return;
    await api.createPost({
      eventId: selectedEventId,
      name: postForm.name || `Post @ ${pendingPoint.lat.toFixed(4)}`,
      type: postForm.type,
      lat: pendingPoint.lat,
      lng: pendingPoint.lng,
      geofenceRadiusM: Number(postForm.geofenceRadiusM),
      requiredStrength: Number(postForm.requiredStrength),
    });
    setPendingPoint(null);
    setPostForm({ name: "", type: "picket", geofenceRadiusM: 75, requiredStrength: 2 });
    const r = await api.getEvent(selectedEventId);
    setPosts(r.posts);
  }

  async function handleAssign(postId: number, userId: number) {
    if (!selectedEvent) return;
    await api.assignOfficer(postId, {
      userId,
      shiftStart: selectedEvent.startAt,
      shiftEnd: selectedEvent.endAt,
    });
    const r = await api.getEvent(selectedEventId!);
    setPosts(r.posts);
  }

  const mapPosts: MapPost[] = posts.map((p) => ({
    id: p.id, name: p.name, type: p.type, lat: p.lat, lng: p.lng,
    requiredStrength: p.requiredStrength, presentCount: p.assignments?.length ?? 0,
  }));

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_380px]">
      <div className="relative">
        {selectedEvent ? (
          <MapView
            centerLat={selectedEvent.venueLat}
            centerLng={selectedEvent.venueLng}
            posts={mapPosts}
            sosAlerts={[]}
            onMapClick={handleMapClick}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            Create an event to start planning its duty chart.
          </div>
        )}
        <div className="absolute top-3 left-3 z-10 flex gap-2">
          {events.length > 0 && (
            <select
              className="bg-white shadow rounded-lg px-3 py-2 text-sm"
              value={selectedEventId ?? ""}
              onChange={(e) => setSelectedEventId(Number(e.target.value))}
            >
              {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          )}
          <button
            onClick={() => setShowNewEvent(true)}
            className="bg-navy text-white shadow rounded-lg px-3 py-2 text-sm font-medium"
          >
            + New Event
          </button>
        </div>
        {selectedEvent && (
          <p className="absolute bottom-3 left-3 z-10 bg-white/90 shadow rounded-lg px-3 py-1.5 text-xs text-gray-600">
            Click anywhere on the map to drop a duty post (picket / barricade / checkpoint).
          </p>
        )}
      </div>

      <aside className="border-l bg-white overflow-y-auto p-4 space-y-6">
        {showNewEvent && (
          <form onSubmit={handleCreateEvent} className="space-y-2 border rounded-lg p-3">
            <h3 className="font-semibold text-navy text-sm">New Bandobast Event</h3>
            <input required placeholder="Title" className="w-full border rounded px-2 py-1 text-sm"
              value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} />
            <select className="w-full border rounded px-2 py-1 text-sm" value={eventForm.eventType}
              onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}>
              {["festival", "vip_visit", "election", "procession", "sports_event", "other"].map((t) => (
                <option key={t} value={t}>{t.replace("_", " ")}</option>
              ))}
            </select>
            <input required placeholder="Venue name" className="w-full border rounded px-2 py-1 text-sm"
              value={eventForm.venueName} onChange={(e) => setEventForm({ ...eventForm, venueName: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input required type="number" step="any" placeholder="Venue lat" className="border rounded px-2 py-1 text-sm"
                value={eventForm.venueLat} onChange={(e) => setEventForm({ ...eventForm, venueLat: Number(e.target.value) })} />
              <input required type="number" step="any" placeholder="Venue lng" className="border rounded px-2 py-1 text-sm"
                value={eventForm.venueLng} onChange={(e) => setEventForm({ ...eventForm, venueLng: Number(e.target.value) })} />
            </div>
            <label className="text-xs text-gray-500">Start</label>
            <input required type="datetime-local" className="w-full border rounded px-2 py-1 text-sm"
              onChange={(e) => setEventForm({ ...eventForm, startAt: new Date(e.target.value).toISOString() })} />
            <label className="text-xs text-gray-500">End</label>
            <input required type="datetime-local" className="w-full border rounded px-2 py-1 text-sm"
              onChange={(e) => setEventForm({ ...eventForm, endAt: new Date(e.target.value).toISOString() })} />
            <input type="number" placeholder="Expected footfall" className="w-full border rounded px-2 py-1 text-sm"
              value={eventForm.expectedFootfall} onChange={(e) => setEventForm({ ...eventForm, expectedFootfall: Number(e.target.value) })} />
            <div className="flex gap-2">
              <button className="bg-saffron text-white rounded px-3 py-1.5 text-sm flex-1">Create</button>
              <button type="button" onClick={() => setShowNewEvent(false)} className="border rounded px-3 py-1.5 text-sm">Cancel</button>
            </div>
          </form>
        )}

        {pendingPoint && (
          <form onSubmit={handleCreatePost} className="space-y-2 border-2 border-saffron rounded-lg p-3 bg-orange-50">
            <h3 className="font-semibold text-navy text-sm">New Duty Post</h3>
            <p className="text-xs text-gray-500">{pendingPoint.lat.toFixed(5)}, {pendingPoint.lng.toFixed(5)}</p>
            <input placeholder="Post name" className="w-full border rounded px-2 py-1 text-sm"
              value={postForm.name} onChange={(e) => setPostForm({ ...postForm, name: e.target.value })} />
            <select className="w-full border rounded px-2 py-1 text-sm" value={postForm.type}
              onChange={(e) => setPostForm({ ...postForm, type: e.target.value })}>
              {POST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Geofence (m)</label>
                <input type="number" className="w-full border rounded px-2 py-1 text-sm"
                  value={postForm.geofenceRadiusM} onChange={(e) => setPostForm({ ...postForm, geofenceRadiusM: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Required strength</label>
                <input type="number" className="w-full border rounded px-2 py-1 text-sm"
                  value={postForm.requiredStrength} onChange={(e) => setPostForm({ ...postForm, requiredStrength: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="bg-navy text-white rounded px-3 py-1.5 text-sm flex-1">Add Post</button>
              <button type="button" onClick={() => setPendingPoint(null)} className="border rounded px-3 py-1.5 text-sm">Cancel</button>
            </div>
          </form>
        )}

        <div>
          <h3 className="font-semibold text-sm text-navy mb-2">Duty Chart ({posts.length} posts)</h3>
          <ul className="space-y-3">
            {posts.map((p) => (
              <li key={p.id} className="border rounded-lg p-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-gray-500 capitalize">{p.type}</span>
                </div>
                <p className="text-gray-500 mb-1">Strength needed: {p.requiredStrength}</p>
                {p.assignments?.map((a: any) => (
                  <p key={a.id} className="text-green-700">✓ {a.userName} ({a.badgeNo})</p>
                ))}
                <select
                  className="w-full border rounded px-2 py-1 mt-1"
                  defaultValue=""
                  onChange={(e) => e.target.value && handleAssign(p.id, Number(e.target.value))}
                >
                  <option value="" disabled>+ Assign officer…</option>
                  {officers.map((o) => (
                    <option key={o.id} value={o.id}>{o.name} ({o.badgeNo})</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
