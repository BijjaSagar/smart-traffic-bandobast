import { useEffect, useState } from "react";
import { api } from "../lib/api";

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported on this device"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true, timeout: 10000,
    });
  });
}

export default function FieldOfficer() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sosBusy, setSosBusy] = useState(false);
  const [sosSent, setSosSent] = useState(false);

  useEffect(() => {
    api.myAssignments().then((r) => setAssignments(r.assignments));
  }, []);

  async function handleCheckIn(assignmentId: number) {
    setBusy(true);
    setStatus(null);
    try {
      const pos = await getPosition();
      const r = await api.checkIn({
        postAssignmentId: assignmentId,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      setStatus(
        r.status === "present"
          ? `Checked in — inside geofence (${r.distanceMeters}m from post).`
          : `Checked in but ${r.distanceMeters}m from the post — flagged as LATE for the control room.`
      );
    } catch (err: any) {
      setStatus(`Could not check in: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSos(assignment: any) {
    setSosBusy(true);
    try {
      const pos = await getPosition();
      await api.sendSos({
        eventId: assignment.post.eventId,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      setSosSent(true);
      setTimeout(() => setSosSent(false), 6000);
    } catch (err: any) {
      setStatus(`SOS failed to send: ${err.message}`);
    } finally {
      setSosBusy(false);
    }
  }

  const primary = assignments[0];

  return (
    <div className="h-full flex flex-col items-center px-4 py-6 gap-6 max-w-md mx-auto">
      <h1 className="text-lg font-bold text-navy self-start">My Duty</h1>

      {assignments.length === 0 && (
        <p className="text-gray-500 text-sm">No active duty assignment. Check back closer to your shift.</p>
      )}

      {assignments.map((a) => (
        <div key={a.assignmentId} className="w-full border rounded-xl p-4 bg-white shadow-sm">
          <p className="font-semibold text-navy">{a.post.name}</p>
          <p className="text-xs text-gray-500 capitalize">{a.post.type}</p>
          <p className="text-xs text-gray-400 mt-1">
            Shift: {new Date(a.shiftStart).toLocaleString()} – {new Date(a.shiftEnd).toLocaleTimeString()}
          </p>
          <button
            disabled={busy}
            onClick={() => handleCheckIn(a.assignmentId)}
            className="mt-3 w-full bg-navy text-white rounded-lg py-2 font-medium disabled:opacity-50"
          >
            {busy ? "Checking in…" : "Check In at Post"}
          </button>
        </div>
      ))}

      {status && <p className="text-sm text-center text-gray-700 bg-gray-100 rounded-lg p-3 w-full">{status}</p>}

      <div className="flex-1" />

      {primary && (
        <button
          disabled={sosBusy}
          onClick={() => handleSos(primary)}
          className="w-40 h-40 rounded-full bg-alert text-white text-xl font-bold shadow-xl active:scale-95 transition disabled:opacity-60"
        >
          {sosBusy ? "Sending…" : "🆘 SOS"}
        </button>
      )}
      {sosSent && (
        <p className="text-alert font-semibold text-sm">Alert sent — control room notified with your location.</p>
      )}
      <p className="text-xs text-gray-400 text-center">
        Press and hold only in a genuine emergency. Your live location is sent instantly to the control room.
      </p>
    </div>
  );
}
