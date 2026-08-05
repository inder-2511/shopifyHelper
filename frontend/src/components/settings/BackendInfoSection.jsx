import { useState } from "react";
import { Server, RefreshCcw, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { pingBackend } from "../../api/healthApi";

const APP_VERSION = "1.0.26";

function BackendInfoSection() {
  const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const hideLocal = import.meta.env.VITE_HIDE_LOCAL_FEATURES === "true";

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const check = async () => {
    setLoading(true);
    setError("");
    setStatus(null);
    try {
      const result = await pingBackend();
      setStatus(result);
    } catch (err) {
      setError(err.message ?? "Backend unreachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
        <Server size={17} className="text-purple-500" />
        <h2 className="text-base font-semibold text-gray-800 dark:text-slate-100">Backend & Version</h2>
      </header>

      <div className="p-5 space-y-3">
        <Row label="Backend URL" value={backendUrl} mono />
        <Row label="Playwright features" value={hideLocal ? "hidden (production)" : "enabled (local)"} />
        <Row label="App version" value={APP_VERSION} mono />

        <div className="pt-2 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <button
            onClick={check}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
            {loading ? "Pinging…" : "Ping backend"}
          </button>

          {status && (
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 size={13} className="text-green-500" />
              <span className="font-mono text-gray-700 dark:text-slate-200">
                {status.status} {typeof status.body === "string" ? `— ${status.body}` : ""} ({status.latencyMs} ms)
              </span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <XCircle size={13} />
              {error}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm text-gray-600 dark:text-slate-300">{label}</span>
      <span className={`text-sm text-gray-800 dark:text-slate-100 text-right ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export default BackendInfoSection;
