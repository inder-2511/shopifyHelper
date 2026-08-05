import { useState } from "react";
import { Search, Copy, Download, CheckCircle2, Loader2 } from "lucide-react";
import { useProductOps } from "../../context/ProductOpsContext";
import { useToast } from "../../context/ToastContext";
import StoreCredentialsInputs, { productInputCls } from "./StoreCredentialsInputs";
import ErrorBanner from "../common/ErrorBanner";

function FetchProductForm() {
  const { fetchOp, runFetch, clearError } = useProductOps();
  const { loading, result: product, error } = fetchOp;
  const { showToast } = useToast();

  const [productId, setProductId] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    runFetch(productId);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(product, null, 2));
    setCopied(true);
    showToast("Copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(product, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `product-${product?.id ?? productId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
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
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold transition-all"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                {loading ? "Fetching…" : "Fetch"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {loading && (
        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl px-4 py-3 text-sm text-purple-700 dark:text-purple-300">
          <Loader2 size={15} className="animate-spin" />
          Fetching in progress — result will remain here even if you navigate away and come back.
        </div>
      )}

      <ErrorBanner
        error={error}
        onRetry={() => { clearError("fetch"); if (productId) runFetch(productId); }}
        onDismiss={() => clearError("fetch")}
      />

      {product && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
              <CheckCircle2 size={15} className="text-green-500" />
              {product.title} — ID {product.id}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 transition-all"
              >
                <Copy size={12} />
                {copied ? "Copied!" : "Copy JSON"}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 transition-all"
              >
                <Download size={12} />
                Download
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-px bg-gray-100 dark:bg-slate-700 border-b border-gray-100 dark:border-slate-700">
            {[
              { label: "Status", value: product.status ?? "—" },
              { label: "Vendor", value: product.vendor || "—" },
              { label: "Type", value: product.product_type || "—" },
              { label: "Variants", value: product.variants?.length ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white dark:bg-slate-800 px-4 py-2.5 text-center">
                <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide">{label}</p>
                <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 mt-0.5 capitalize">{value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-auto max-h-[500px]">
            <pre className="text-xs text-gray-700 dark:text-slate-300 p-5 leading-relaxed font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(product, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default FetchProductForm;
