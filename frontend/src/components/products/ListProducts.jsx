import { useState } from "react";
import { RefreshCcw, ChevronLeft, ChevronRight, Loader2, XCircle } from "lucide-react";
import { listProductsApi, deleteProductApi } from "../../api/productApi";
import { useToast } from "../../context/ToastContext";
import StoreCredentialsInputs, { productInputCls } from "./StoreCredentialsInputs";

function ListProducts({ storeUrl, setStoreUrl, token, setToken }) {
  const { showToast } = useToast();
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [pageInfo, setPageInfo] = useState(null);
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);

  const fetchPage = async (opts = {}) => {
    setLoading(true);
    setError("");
    try {
      const data = await listProductsApi(storeUrl, token, { limit, ...opts });
      setProducts(data.products);
      setNextPage(data.nextPageInfo);
      setPrevPage(data.previousPageInfo);
      setPageInfo(opts.pageInfo ?? null);
    } catch (err) {
      const msg = err.response?.data?.error ?? err.message ?? "Failed to list products";
      setError(typeof msg === "object" ? JSON.stringify(msg) : msg);
      showToast("Failed to list products", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.title}"? This cannot be undone.`)) return;
    try {
      await deleteProductApi(storeUrl, token, product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      showToast(`Deleted "${product.title}"`, "success");
    } catch (err) {
      showToast("Delete failed", "error");
      console.error(err);
    }
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
          <StoreCredentialsInputs
            storeUrl={storeUrl}
            setStoreUrl={setStoreUrl}
            token={token}
            setToken={setToken}
          />
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

      {error && (
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <XCircle size={15} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {products.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900/40 border-b border-gray-100 dark:border-slate-700">
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-400">
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
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
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
                        className="text-xs px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-all"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-slate-700">
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Showing {products.length} product{products.length !== 1 && "s"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchPage({ pageInfo: prevPage })}
                disabled={!prevPage || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 dark:text-slate-200 transition-all"
              >
                <ChevronLeft size={12} />
                Prev
              </button>
              <button
                onClick={() => fetchPage({ pageInfo: nextPage })}
                disabled={!nextPage || loading}
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
