import { useRef, useState } from "react";
import { RefreshCcw, ChevronLeft, ChevronRight, Loader2, Trash2, X, AlertTriangle } from "lucide-react";
import { useProductOps } from "../../context/ProductOpsContext";
import { useToast } from "../../context/ToastContext";
import { deleteProductApi } from "../../api/productApi";
import { classifyError } from "../../utils/errorClassifier";
import StoreCredentialsInputs, { productInputCls } from "./StoreCredentialsInputs";
import ErrorBanner from "../common/ErrorBanner";
import { useScrollOnTruthy } from "../../hooks/useScrollOnTruthy";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BULK_INTERVAL_MS = 300;

function ListProducts() {
  const { listOp, runList, deleteOp, runDelete, clearError, storeUrl, token, removeProductsFromList } = useProductOps();
  const { showToast } = useToast();
  const { loading, products, nextPageInfo, previousPageInfo, error } = listOp;
  const [limit, setLimit] = useState(25);

  const [selected, setSelected] = useState(() => new Set());
  const [bulk, setBulk] = useState({ loading: false, done: 0, total: 0, failed: [] });

  const resultRef = useRef(null);
  useScrollOnTruthy(resultRef, loading || products.length > 0 || error);

  const fetchPage = (opts = {}) => {
    setSelected(new Set());
    return runList({ limit, ...opts });
  };

  const allSelected = products.length > 0 && products.every((p) => selected.has(String(p.id)));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleRow = (id) => {
    const s = String(id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => String(p.id))));
    }
  };

  const clearSelection = () => setSelected(new Set());

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.title}"? This cannot be undone.`)) return;
    await runDelete(product.id);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(String(product.id));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (bulk.loading || selected.size === 0) return;

    const targets = products.filter((p) => selected.has(String(p.id)));
    if (targets.length === 0) return;

    const confirmed = window.confirm(
      `Delete ${targets.length} product${targets.length !== 1 ? "s" : ""}? This cannot be undone.`
    );
    if (!confirmed) return;

    setBulk({ loading: true, done: 0, total: targets.length, failed: [] });
    const succeededIds = [];

    for (let i = 0; i < targets.length; i++) {
      const p = targets[i];
      if (i > 0) await sleep(BULK_INTERVAL_MS);
      try {
        await deleteProductApi(storeUrl, token, p.id);
        succeededIds.push(p.id);
        setBulk((prev) => ({ ...prev, done: prev.done + 1 }));
      } catch (err) {
        const classified = classifyError(err);
        setBulk((prev) => ({
          ...prev,
          done: prev.done + 1,
          failed: [...prev.failed, { id: p.id, title: p.title, message: classified.title }],
        }));
      }
    }

    if (succeededIds.length > 0) removeProductsFromList(succeededIds);
    setSelected(new Set());
    setBulk((prev) => ({ ...prev, loading: false }));
    showToast(
      `${succeededIds.length} deleted${targets.length - succeededIds.length > 0 ? ` — ${targets.length - succeededIds.length} failed` : ""}`,
      succeededIds.length === targets.length ? "success" : "error"
    );
  };

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchPage();
          }}
          className="space-y-4"
        >
          <StoreCredentialsInputs />
          <div className="flex gap-3">
            <div className="w-32">
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                Page size
              </label>
              <input
                type="number"
                min={1}
                max={250}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className={productInputCls}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold transition-all"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCcw size={15} />}
                {loading ? "Loading…" : "Fetch Products"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div ref={resultRef} className="scroll-mt-6" />

      {loading && products.length === 0 && (
        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl px-4 py-3 text-sm text-purple-700 dark:text-purple-300">
          <Loader2 size={15} className="animate-spin" />
          Loading products…
        </div>
      )}

      <ErrorBanner
        error={error}
        onRetry={() => { clearError("list"); fetchPage(); }}
        onDismiss={() => clearError("list")}
      />

      {bulk.loading && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-slate-300 mb-2">
            <span className="flex items-center gap-2">
              <Loader2 size={13} className="animate-spin" />
              Deleting {bulk.done + 1} of {bulk.total}…
            </span>
            <span>{Math.round((bulk.done / bulk.total) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-200"
              style={{ width: `${(bulk.done / bulk.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {!bulk.loading && bulk.failed.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2 font-semibold mb-1">
            <AlertTriangle size={14} />
            {bulk.failed.length} deletion{bulk.failed.length !== 1 ? "s" : ""} failed
          </div>
          <ul className="text-xs list-disc list-inside space-y-0.5">
            {bulk.failed.slice(0, 5).map((f) => (
              <li key={f.id}>
                <span className="font-medium">{f.title}</span> — {f.message}
              </li>
            ))}
            {bulk.failed.length > 5 && <li>…and {bulk.failed.length - 5} more</li>}
          </ul>
          <button
            onClick={() => setBulk((prev) => ({ ...prev, failed: [] }))}
            className="mt-2 text-xs underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {products.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {selected.size > 0 && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800/50">
              <div className="flex items-center gap-3 text-sm text-purple-700 dark:text-purple-300">
                <span className="font-semibold">{selected.size} selected</span>
                <button
                  onClick={clearSelection}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-purple-200 dark:border-purple-800/60"
                >
                  <X size={11} />
                  Clear
                </button>
              </div>
              <button
                onClick={handleBulkDelete}
                disabled={bulk.loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold transition-all"
              >
                {bulk.loading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Delete {selected.size}
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900/40 border-b border-gray-100 dark:border-slate-700">
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  <th className="pl-4 pr-2 py-2.5 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleAll}
                      className="w-4 h-4 accent-purple-600 cursor-pointer"
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-4 py-2.5 font-semibold">Title</th>
                  <th className="px-4 py-2.5 font-semibold">Vendor</th>
                  <th className="px-4 py-2.5 font-semibold">Type</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Variants</th>
                  <th className="px-4 py-2.5 font-semibold">ID</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const isSelected = selected.has(String(p.id));
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-gray-50 dark:border-slate-700/50 transition-colors ${
                        isSelected
                          ? "bg-purple-50/50 dark:bg-purple-900/10"
                          : "hover:bg-gray-50 dark:hover:bg-slate-700/30"
                      }`}
                    >
                      <td className="pl-4 pr-2 py-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(p.id)}
                          disabled={bulk.loading}
                          className="w-4 h-4 accent-purple-600 cursor-pointer disabled:cursor-not-allowed"
                          aria-label={`Select ${p.title}`}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-gray-800 dark:text-slate-100 font-medium">{p.title}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-slate-300">{p.vendor || "—"}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-slate-300">{p.product_type || "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 capitalize">
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-slate-300">{p.variants?.length ?? 0}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-gray-500 dark:text-slate-400">{p.id}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={deleteOp.loading || bulk.loading}
                          className="text-xs px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50 text-red-600 dark:text-red-400 transition-all"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-slate-700">
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Showing {products.length} product{products.length !== 1 && "s"}
              {selected.size > 0 && ` • ${selected.size} selected`}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchPage({ pageInfo: previousPageInfo })}
                disabled={!previousPageInfo || loading || bulk.loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 dark:text-slate-200 transition-all"
              >
                <ChevronLeft size={12} />
                Prev
              </button>
              <button
                onClick={() => fetchPage({ pageInfo: nextPageInfo })}
                disabled={!nextPageInfo || loading || bulk.loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 dark:text-slate-200 transition-all"
              >
                Next
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ListProducts;
