import { useState } from "react";
import { Trash2, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { deleteProductApi } from "../../api/productApi";
import { useToast } from "../../context/ToastContext";
import StoreCredentialsInputs, { productInputCls } from "./StoreCredentialsInputs";

function DeleteProductForm({ storeUrl, setStoreUrl, token, setToken }) {
  const { showToast } = useToast();
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const confirmed = window.confirm(
      `Delete product "${productId}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setLoading(true);
    setResult(null);
    setError("");

    try {
      const data = await deleteProductApi(storeUrl, token, productId);
      setResult(data);
      showToast(`Deleted "${data.title ?? data.id}"`, "success");
      setProductId("");
    } catch (err) {
      const msg = err.response?.data?.error ?? err.message ?? "Failed to delete product";
      setError(typeof msg === "object" ? JSON.stringify(msg) : msg);
      showToast("Failed to delete product", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
        <AlertTriangle size={15} className="shrink-0 mt-0.5" />
        <span>Deletion is permanent. Consider using <strong>Archive</strong> in Shopify admin instead if you might need the product later.</span>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <StoreCredentialsInputs
            storeUrl={storeUrl}
            setStoreUrl={setStoreUrl}
            token={token}
            setToken={setToken}
          />
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
