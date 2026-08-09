import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("admin@sbs.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-navy mb-1">Smart Bandobast System</h1>
        <p className="text-sm text-gray-500 mb-6">Sign in to your control room or field account</p>

        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          className="w-full border rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-saffron"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />

        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          className="w-full border rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-saffron"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
        />

        {error && <p className="text-alert text-sm mb-4">{error}</p>}

        <button
          disabled={busy}
          className="w-full bg-navy text-white rounded-lg py-2 font-semibold hover:bg-navy/90 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-xs text-gray-400 mt-4">
          Demo: admin@sbs.local / Admin@123 (Commander) · officer@sbs.local / Officer@123 (Field Officer)
        </p>
      </form>
    </div>
  );
}
