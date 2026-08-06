import { useRef, useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import SavedStorePicker from "../common/SavedStorePicker";
import ErrorBanner from "../common/ErrorBanner";
import { classifyError } from "../../utils/errorClassifier";
import { useScrollOnTruthy } from "../../hooks/useScrollOnTruthy";

function StoreSetupForm({ title, description, onRun }) {
  const [store, setStore] = useState(() => localStorage.getItem("setup_store") ?? "");
  const [token, setToken] = useState(() => localStorage.getItem("setup_token") ?? "");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const resultRef = useRef(null);
  useScrollOnTruthy(resultRef, loading || status || error);

  const setStoreVal = (v) => {
    setStore(v);
    localStorage.setItem("setup_store", v);
  };
  const setTokenVal = (v) => {
    setToken(v);
    localStorage.setItem("setup_token", v);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setStatus(null);
    setError(null);
    try {
      await onRun(store, token);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(classifyError(err));
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 focus:border-purple-500 outline-none rounded-xl py-2.5 px-3 text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-colors disabled:opacity-60";

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-3 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">{title}</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-0.5 text-sm">{description}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <SavedStorePicker onPick={({ storeUrl: u, token: t }) => { setStoreVal(u); setTokenVal(t); }} />

          <div>
            <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">Store URL</label>
            <input
              type="text"
              placeholder="your-store.myshopify.com"
              value={store}
              onChange={(e) => setStoreVal(e.target.value)}
              disabled={loading}
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">Access Token</label>
            <input
              type="password"
              placeholder="shpat_..."
              value={token}
              onChange={(e) => setTokenVal(e.target.value)}
              disabled={loading}
              className={inputCls}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2 ${loading ? "opacity-80 cursor-not-allowed pointer-events-none" : "hover:opacity-90"}`}
          >
            {loading ? (
              <>
                <Loader2 className="btn-spinner shrink-0" size={20} />
                <span>Running...</span>
              </>
            ) : (
              `Run: ${title}`
            )}
          </button>
        </form>
      </div>

      <div ref={resultRef} className="col-span-3 scroll-mt-6" />

      {loading && (
        <div className="col-span-3 flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl px-4 py-3 text-sm text-purple-700 dark:text-purple-300">
          <Loader2 size={15} className="animate-spin" />
          Running <strong className="mx-1">{title}</strong>… may take up to a minute depending on the store.
        </div>
      )}

      {status === "success" && !error && (
        <div className="col-span-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 flex items-center gap-4">
          <CheckCircle2 className="text-emerald-500 shrink-0" size={24} />
          <div>
            <p className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm">{title} completed successfully</p>
            <p className="text-emerald-600 dark:text-emerald-500 text-xs mt-0.5">Finished with no errors.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="col-span-3">
          <ErrorBanner
            error={error}
            onRetry={() => { setError(null); handleSubmit(); }}
            onDismiss={() => setError(null)}
          />
        </div>
      )}
    </div>
  );
}

export default StoreSetupForm;
