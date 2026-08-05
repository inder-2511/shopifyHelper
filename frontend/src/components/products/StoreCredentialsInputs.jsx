import { BookmarkPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { useProductOps } from "../../context/ProductOpsContext";
import { useSavedStores } from "../../context/SavedStoresContext";

const inputCls =
  "w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-400";

function StoreCredentialsInputs() {
  const { storeUrl, setStoreUrl, token, setToken } = useProductOps();
  const { stores } = useSavedStores();

  const handlePick = (e) => {
    const id = e.target.value;
    if (!id) return;
    const picked = stores.find((s) => s.id === id);
    if (picked) {
      setStoreUrl(picked.storeUrl);
      setToken(picked.token);
    }
  };

  return (
    <div className="space-y-3">
      {stores.length > 0 ? (
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
            Load from saved stores
          </label>
          <select
            value=""
            onChange={handlePick}
            className={inputCls}
          >
            <option value="">— pick a saved store —</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.storeUrl})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
          <BookmarkPlus size={12} />
          Tip: save store profiles in{" "}
          <Link to="/settings" className="text-purple-600 dark:text-purple-400 hover:underline">
            Settings
          </Link>{" "}
          so you don't have to retype these.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
            Store URL
          </label>
          <input
            type="text"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            placeholder="mystore.myshopify.com"
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
            Admin Token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="shpat_..."
            required
            className={inputCls}
          />
        </div>
      </div>
    </div>
  );
}

export const productInputCls = inputCls;
export default StoreCredentialsInputs;
