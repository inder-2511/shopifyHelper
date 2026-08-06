import { useRef, useState } from "react";
import { Copy, Loader2, CheckCircle2 } from "lucide-react";
import { useProductOps } from "../../context/ProductOpsContext";
import StoreCredentialsInputs, { productInputCls } from "./StoreCredentialsInputs";
import ErrorBanner from "../common/ErrorBanner";
import { useScrollOnTruthy } from "../../hooks/useScrollOnTruthy";

function DuplicateProductForm() {
  const { duplicateOp, runDuplicate, clearError } = useProductOps();
  const { loading, result, error } = duplicateOp;
  const [productId, setProductId] = useState("");

  const resultRef = useRef(null);
  useScrollOnTruthy(resultRef, result || error || loading);

  const handleSubmit = (e) => {
    e.preventDefault();
    runDuplicate(productId);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <StoreCredentialsInputs />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                Source Product ID or Title
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
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Copy size={15} />}
                {loading ? "Duplicating…" : "Duplicate"}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            The copy is created as a <strong>draft</strong> with " (Copy)" appended to the title.
          </p>
        </form>
      </div>

      <div ref={resultRef} className="scroll-mt-6" />

      {loading && (
        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl px-4 py-3 text-sm text-purple-700 dark:text-purple-300">
          <Loader2 size={15} className="animate-spin" />
          Duplicating in progress — you can leave this page; the result will appear here when it's done.
        </div>
      )}

      <ErrorBanner
        error={error}
        onRetry={() => { clearError("duplicate"); if (productId) runDuplicate(productId); }}
        onDismiss={() => clearError("duplicate")}
      />

      {result && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3">
            <CheckCircle2 size={15} className="text-green-500" />
            Duplicated — new ID {result.product.id}
          </div>
          <pre className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap break-all overflow-auto max-h-[400px]">
            {JSON.stringify(result.product, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default DuplicateProductForm;
