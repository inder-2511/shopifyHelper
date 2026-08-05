import { useProductOps } from "../../context/ProductOpsContext";
import SavedStorePicker from "../common/SavedStorePicker";

const inputCls =
  "w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-400";

function StoreCredentialsInputs() {
  const { storeUrl, setStoreUrl, token, setToken } = useProductOps();

  const handlePick = ({ storeUrl: url, token: t }) => {
    setStoreUrl(url);
    setToken(t);
  };

  return (
    <div className="space-y-3">
      <SavedStorePicker onPick={handlePick} variant="chips" />

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
