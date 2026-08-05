import { useState } from "react";
import { Trash2, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useProductOps } from "../../context/ProductOpsContext";
import StoreCredentialsInputs, { productInputCls } from "./StoreCredentialsInputs";

function DeleteProductForm() {
  const { deleteOp, runDelete } = useProductOps();
  const { loading, result, error } = deleteOp;
  const [productId, setProductId] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!window.confirm(`Delete product "${productId}"? This cannot be undone.`)) return;
    runDelete(productId);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
        <AlertTriangle size={15} className="shrink-0 mt-0.5" />
        <span>Deletion is permanent. Consider using <strong>Archive</strong> in Shopify admin instead if you might need the product later.</span>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <StoreCredentialsInputs />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                Product ID or Title
              </label>
              <input
                type="text"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="1234567890 or Wireless earbuds"
                required
                className={productInputCls}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold transition-all"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                {loading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {loading && (
        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl px-4 py-3 text-sm text-purple-700 dark:text-purple-300">
          <Loader2 size={15} className="animate-spin" />
          Deletion in progress — safe to navigate away; result will appear here when done.
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <XCircle size={15} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {result && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
            <CheckCircle2 size={15} className="text-green-500" />
            Deleted — "{result.title ?? "(unknown)"}" (ID {result.id})
          </div>
        </div>
      )}
    </div>
  );
}

export default DeleteProductForm;
