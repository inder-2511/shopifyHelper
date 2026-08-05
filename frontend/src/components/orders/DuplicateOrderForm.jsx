import { useState } from "react";
import { Hash, Loader2, XCircle, Copy } from "lucide-react";
import { useOrderOps } from "../../context/OrderOpsContext";
import OrderResultsPanel from "./OrderResultsPanel";
import SavedStorePicker from "../common/SavedStorePicker";
import ErrorBanner from "../common/ErrorBanner";

function DuplicateOrderForm() {
  const { storeUrl, setStoreUrl, token, setToken, duplicateOp, runDuplicateBatch, cancelOp, clearError } = useOrderOps();
  const { loading, progress, orders, error, errorContext } = duplicateOp;

  const [orderName, setOrderName] = useState("");
  const [count, setCount]         = useState(1);

  const handleSubmit = (e) => {
    e.preventDefault();
    runDuplicateBatch(orderName, count);
  };

  const inputCls = "w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 focus:border-purple-500 dark:focus:border-purple-500 outline-none rounded-xl py-2.5 px-3 text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-colors disabled:opacity-60";

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-3 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Duplicate Order</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-0.5 text-sm">Re-create an existing order with the same details</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <SavedStorePicker onPick={({ storeUrl: u, token: t }) => { setStoreUrl(u); setToken(t); }} />

          <div>
            <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">Store URL</label>
            <input type="text" placeholder="your-store.myshopify.com" value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              className={inputCls} required />
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">Access Token</label>
            <input type="text" placeholder="shpat_..." value={token}
              onChange={(e) => setToken(e.target.value)}
              className={inputCls} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">Order Number</label>
              <input type="text" placeholder="#1001 or 1001" value={orderName}
                onChange={(e) => setOrderName(e.target.value)}
                disabled={loading}
                className={inputCls} required />
            </div>

            <div>
              <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">
                Times to Duplicate
                <span className="ml-2 font-normal text-gray-400 dark:text-slate-500 text-xs">(&gt;5 paced at 16s each)</span>
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-2.5 text-gray-400 dark:text-slate-500" size={16} />
                <input type="number" min={1} max={500} value={count}
                  onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className={`${inputCls} pl-9`} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading}
              className={`flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2 ${loading ? "opacity-80 cursor-not-allowed pointer-events-none" : "hover:opacity-90"}`}>
              {loading ? (
                <>
                  <Loader2 className="btn-spinner shrink-0" size={20} />
                  <span>{progress ? `Duplicating ${progress.done + 1} of ${progress.total}...` : "Duplicating..."}</span>
                </>
              ) : (
                <>
                  <Copy size={18} />
                  <span>Duplicate {count > 1 ? `${count}×` : ""} Order</span>
                </>
              )}
            </button>

            {loading && (
              <button type="button" onClick={() => cancelOp("duplicate")}
                className="px-5 py-3 rounded-xl text-base font-semibold border-2 border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center gap-2 shrink-0">
                <XCircle size={18} />
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {error && (
        <div className="col-span-3">
          <ErrorBanner
            error={error}
            context={errorContext}
            onRetry={() => { clearError("duplicate"); handleSubmit({ preventDefault: () => {} }); }}
            onDismiss={() => clearError("duplicate")}
          />
        </div>
      )}

      <OrderResultsPanel progress={progress} loading={loading} orders={orders} verb="duplicated" showSource />
    </div>
  );
}

export default DuplicateOrderForm;
