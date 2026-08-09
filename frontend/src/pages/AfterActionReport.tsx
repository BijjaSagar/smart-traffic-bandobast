import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";

// Module 11 — After-Action Analytics & Report Generator.
// Purely a read view over data the system already collected during the
// event (duty chart, attendance, SOS) — no new input here.
export default function AfterActionReport() {
  const { eventId: eventIdParam } = useParams();
  const eventId = Number(eventIdParam);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.eventReport(eventId).then(setReport).finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return <div className="p-8 text-gray-400">Loading report…</div>;
  if (!report) return <div className="p-8 text-alert">Could not load report for this event.</div>;

  const { event, manpower, postBreakdown, sos } = report;

  return (
    <div className="h-full overflow-y-auto max-w-3xl mx-auto p-6 space-y-6">
      <Link to="/dashboard" className="text-xs text-gray-500 underline">← Command Map</Link>

      <div>
        <h1 className="text-xl font-bold text-navy">{event.title}</h1>
        <p className="text-sm text-gray-500">
          {event.venueName} · {new Date(event.startAt).toLocaleDateString()} — After-Action Report
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Manpower fill rate" value={manpower.overallFillRate != null ? `${manpower.overallFillRate}%` : "—"} />
        <Stat label="Present / Required" value={`${manpower.totalPresent} / ${manpower.totalRequired}`} />
        <Stat label="Checked in late" value={String(manpower.totalLate)} />
        <Stat label="No-shows" value={String(manpower.noShowCount)} />
      </div>

      <div>
        <h2 className="font-semibold text-navy mb-2">Post-by-post breakdown</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-2">Post</th>
                <th className="p-2">Type</th>
                <th className="p-2">Required</th>
                <th className="p-2">Checked in</th>
                <th className="p-2">Fill rate</th>
              </tr>
            </thead>
            <tbody>
              {postBreakdown.map((p: any) => (
                <tr key={p.postId} className="border-t">
                  <td className="p-2">{p.name}</td>
                  <td className="p-2 capitalize text-gray-500">{p.type}</td>
                  <td className="p-2">{p.required}</td>
                  <td className="p-2">{p.checkedIn}</td>
                  <td className="p-2">{p.fillRate != null ? `${p.fillRate}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-navy mb-2">SOS response</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total alerts" value={String(sos.total)} />
          <Stat label="Resolved" value={String(sos.resolved)} />
          <Stat label="Avg. ack time" value={sos.avgAckSeconds != null ? `${sos.avgAckSeconds}s` : "—"} />
          <Stat label="Avg. resolve time" value={sos.avgResolveSeconds != null ? `${Math.round(sos.avgResolveSeconds / 60)}m` : "—"} />
        </div>
        {sos.drillCount > 0 && (
          <p className="text-xs text-gray-400 mt-2">{sos.drillCount} of these were marked as drills.</p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-lg p-3 bg-white">
      <p className="text-2xl font-bold text-navy">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
