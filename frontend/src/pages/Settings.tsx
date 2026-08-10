import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";

// Settings screen for integration credentials — Modules 6 (traffic diversion)
// and 9 (WhatsApp bot) read whichever of these are configured here. Values
// are encrypted at rest and never sent back to this screen in plaintext —
// only a masked preview once saved, same pattern as most SaaS API-key UIs.
export default function Settings() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function refresh() {
    setLoading(true);
    api.listSettings().then((r) => setSettings(r.settings)).finally(() => setLoading(false));
  }

  useEffect(() => { refresh(); }, []);

  async function handleSave(key: string, e: FormEvent) {
    e.preventDefault();
    const value = drafts[key]?.trim();
    if (!value) return;
    setSavingKey(key);
    setMessage(null);
    try {
      await api.saveSetting(key, value);
      setDrafts((d) => ({ ...d, [key]: "" }));
      refresh();
    } catch (err: any) {
      setMessage(err.message ?? "Could not save — check the value and try again.");
    } finally {
      setSavingKey(null);
    }
  }

  async function handleClear(key: string) {
    setSavingKey(key);
    try {
      await api.deleteSetting(key);
      refresh();
    } finally {
      setSavingKey(null);
    }
  }

  const grouped = settings.reduce<Record<string, any[]>>((acc, s) => {
    (acc[s.module] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="h-full overflow-y-auto max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy">Integration Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Add API keys for external providers here. Values are encrypted before storage and
          never shown again in full — only the last 4 characters, so you can confirm which
          key is loaded.
        </p>
      </div>

      {message && <p className="text-sm text-alert bg-red-50 border border-red-200 rounded p-2">{message}</p>}

      {loading && <p className="text-gray-400 text-sm">Loading…</p>}

      {Object.entries(grouped).map(([moduleName, items]) => (
        <div key={moduleName} className="border rounded-xl p-4 bg-white">
          <h2 className="font-semibold text-navy text-sm mb-3">{moduleName}</h2>
          <div className="space-y-4">
            {items.map((s) => (
              <div key={s.key} className="border-t pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">{s.label}</label>
                  {s.configured ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      Configured {s.preview}
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Not set</span>
                  )}
                </div>
                <form onSubmit={(e) => handleSave(s.key, e)} className="flex gap-2">
                  <input
                    type="password"
                    placeholder={s.configured ? "Enter a new value to replace it" : "Paste value here"}
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm font-mono"
                    value={drafts[s.key] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
                  />
                  <button
                    disabled={savingKey === s.key}
                    className="bg-navy text-white rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    Save
                  </button>
                  {s.configured && (
                    <button
                      type="button"
                      disabled={savingKey === s.key}
                      onClick={() => handleClear(s.key)}
                      className="border rounded-lg px-3 py-1.5 text-sm text-gray-500"
                    >
                      Clear
                    </button>
                  )}
                </form>
                {s.helpUrl && (
                  <a href={s.helpUrl} target="_blank" rel="noreferrer" className="text-xs text-saffron underline">
                    Where do I find this?
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
