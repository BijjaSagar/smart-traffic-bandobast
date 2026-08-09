import { FormEvent, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

const OUTCOME_STYLE: Record<string, string> = {
  clear: "bg-green-100 text-green-700 border-green-300",
  flagged: "bg-orange-100 text-saffron border-orange-300",
  hold: "bg-red-100 text-alert border-red-300",
};

// Module 8 — Digital Nakabandi & QR/Vehicle Verification console.
// A checkpoint officer opens this for their assigned checkpoint post,
// enters a vehicle number, and gets an instant go/hold result plus a
// permanent log — replacing a paper nakabandi register.
export default function CheckpointConsole() {
  const { postId: postIdParam } = useParams();
  const postId = Number(postIdParam);
  const { user } = useAuth();
  const isCommand = user?.role === "admin" || user?.role === "commander";

  const [vehicleNumber, setVehicleNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  const [showAddWatchlist, setShowAddWatchlist] = useState(false);
  const [watchForm, setWatchForm] = useState({ vehicleNumber: "", reason: "", severity: "alert" });

  function refreshLogs() {
    api.checkpointLogs(postId).then((r) => setLogs(r.logs));
  }

  useEffect(() => { refreshLogs(); }, [postId]);

  async function handleCheck(e: FormEvent) {
    e.preventDefault();
    if (!vehicleNumber.trim()) return;
    setBusy(true);
    try {
      const result = await api.checkVehicle(postId, vehicleNumber.trim());
      setLastResult(result);
      setVehicleNumber("");
      refreshLogs();
    } finally {
      setBusy(false);
    }
  }

  async function handleAddWatchlist(e: FormEvent) {
    e.preventDefault();
    await api.addWatchlistEntry(watchForm);
    setWatchForm({ vehicleNumber: "", reason: "", severity: "alert" });
    setShowAddWatchlist(false);
  }

  return (
    <div className="h-full overflow-y-auto max-w-lg mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-navy">Checkpoint Console</h1>
          <p className="text-xs text-gray-500">Post #{postId}</p>
        </div>
        <Link to="/dashboard" className="text-xs text-gray-500 underline">← Command Map</Link>
      </div>

      <form onSubmit={handleCheck} className="bg-white border rounded-xl p-4 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle number</label>
        <input
          autoFocus
          className="w-full border rounded-lg px-3 py-2 text-lg tracking-wide uppercase"
          placeholder="MH12AB1234"
          value={vehicleNumber}
          onChange={(e) => setVehicleNumber(e.target.value)}
        />
        <button disabled={busy} className="mt-3 w-full bg-navy text-white rounded-lg py-2 font-semibold disabled:opacity-50">
          {busy ? "Checking…" : "Check Vehicle"}
        </button>
      </form>

      {lastResult && (
        <div className={`border-2 rounded-xl p-4 text-center ${OUTCOME_STYLE[lastResult.outcome]}`}>
          <p className="text-xl font-bold uppercase">{lastResult.outcome}</p>
          {lastResult.matchReason && <p className="text-sm mt-1">{lastResult.matchReason}</p>}
          {lastResult.outcome === "clear" && <p className="text-sm mt-1">No watchlist match — vehicle clear to proceed.</p>}
        </div>
      )}

      {isCommand && (
        <div className="bg-white border rounded-xl p-4">
          <button onClick={() => setShowAddWatchlist((s) => !s)} className="text-sm text-saffron underline">
            {showAddWatchlist ? "Cancel" : "+ Add vehicle to watchlist"}
          </button>
          {showAddWatchlist && (
            <form onSubmit={handleAddWatchlist} className="space-y-2 mt-3">
              <input required placeholder="Vehicle number" className="w-full border rounded px-2 py-1.5 text-sm uppercase"
                value={watchForm.vehicleNumber} onChange={(e) => setWatchForm({ ...watchForm, vehicleNumber: e.target.value })} />
              <input required placeholder="Reason" className="w-full border rounded px-2 py-1.5 text-sm"
                value={watchForm.reason} onChange={(e) => setWatchForm({ ...watchForm, reason: e.target.value })} />
              <select className="w-full border rounded px-2 py-1.5 text-sm" value={watchForm.severity}
                onChange={(e) => setWatchForm({ ...watchForm, severity: e.target.value })}>
                <option value="alert">Alert (flag, allow through)</option>
                <option value="hold">Hold (stop vehicle)</option>
              </select>
              <button className="w-full bg-navy text-white rounded py-1.5 text-sm">Add to watchlist</button>
            </form>
          )}
        </div>
      )}

      <div>
        <h3 className="font-semibold text-sm text-navy mb-2">Recent checks at this post</h3>
        <ul className="space-y-1">
          {logs.map((l) => (
            <li key={l.id} className="flex justify-between text-xs border-b py-1.5">
              <span className="font-mono">{l.vehicleNumber}</span>
              <span className={`capitalize ${l.outcome === "clear" ? "text-green-600" : "text-alert"}`}>{l.outcome}</span>
              <span className="text-gray-400">{new Date(l.checkedAt).toLocaleTimeString()}</span>
            </li>
          ))}
          {logs.length === 0 && <p className="text-xs text-gray-400">No checks logged yet.</p>}
        </ul>
      </div>
    </div>
  );
}
