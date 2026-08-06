import { useRef, useState } from "react";
import { Plus, Loader2, CheckCircle2 } from "lucide-react";
import { useProductOps } from "../../context/ProductOpsContext";
import StoreCredentialsInputs, { productInputCls } from "./StoreCredentialsInputs";
import ErrorBanner from "../common/ErrorBanner";
import { useScrollOnTruthy } from "../../hooks/useScrollOnTruthy";

function CreateProductForm() {
  const { createOp, runCreate, clearError } = useProductOps();
  const { loading, result, error } = createOp;

  const [title, setTitle] = useState("");
  const [vendor, setVendor] = useState("");
  const [productType, setProductType] = useState("");
  const [price, setPrice] = useState("10.00");
  const [inventory, setInventory] = useState(100);
  const [status, setStatus] = useState("active");

  const resultRef = useRef(null);
  useScrollOnTruthy(resultRef, result || error);

  const handleSubmit = (e) => {
    e.preventDefault();
    runCreate({
      title,
      vendor: vendor || undefined,
      product_type: productType || undefined,
      status,
      variants: [
        {
          price,
          inventory_quantity: Number(inventory),
          inventory_management: "shopify",
        },
      ],
    });
  };

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <StoreCredentialsInputs />

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Wireless earbuds"
              required
              className={productInputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                Vendor
              </label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Acme"
                className={productInputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                Product Type
              </label>
              <input
                type="text"
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                placeholder="Electronics"
                className={productInputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                Price
              </label>
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className={productInputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                Inventory
              </label>
              <input
                type="number"
                min={0}
                value={inventory}
                onChange={(e) => setInventory(e.target.value)}
                required
                className={productInputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={productInputCls}
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold transition-all"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {loading ? "Creating…" : "Create Product"}
          </button>
        </form>
      </div>

      <div ref={resultRef} className="scroll-mt-6" />

      <ErrorBanner
        error={error}
        onRetry={() => { clearError("create"); handleSubmit({ preventDefault: () => {} }); }}
        onDismiss={() => clearError("create")}
      />

      {result && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3">
            <CheckCircle2 size={15} className="text-green-500" />
            Product created — ID {result.id}
          </div>
          <pre className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap break-all overflow-auto max-h-[400px]">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default CreateProductForm;
