import { useState } from "react";
import { Plus, Trash2, Store as StoreIcon, Eye, EyeOff } from "lucide-react";
import { useSavedStores } from "../../context/SavedStoresContext";
import { useToast } from "../../context/ToastContext";

const inputCls =
  "w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-400";

function SavedStoresSection() {
  const { stores, addStore, removeStore } = useSavedStores();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [token, setToken] = useState("");
  const [revealId, setRevealId] = useState(null);

  const handleAdd = (e) => {
    e.preventDefault();
    const record = addStore({ name, storeUrl, token });
    if (!record) {
      showToast("All fields required", "error");
      return;
    }
    setName("");
    setStoreUrl("");
    setToken("");
    showToast(`Saved "${record.name}"`, "success");
  };

  const handleRemove = (store) => {
    if (!window.confirm(`Remove "${store.name}" from saved stores?`)) return;
    removeStore(store.id);
    showToast(`Removed "${store.name}"`, "success");
  };

  const mask = (t) => (t.length <= 8 ? "•".repeat(t.length) : `${t.slice(0, 6)}…${t.slice(-4)}`);

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
        <StoreIcon size={17} className="text-purple-500" />
        <h2 className="text-base font-semibold text-gray-800 dark:text-slate-100">Saved Stores</h2>
      </header>

      <div className="p-5 space-y-4">
        <p className="text-xs text-gray-500 dark:text-slate-400">
          Save named store profiles here — Product and Order forms can pick from this list instead of retyping the URL and access token every time. Stored in your browser's localStorage.
        </p>

        <form onSubmit={handleAdd} className="grid grid-cols-4 gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Label (e.g. Test Store)"
            required
            className={inputCls}
          />
          <input
            type="text"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            placeholder="mystore.myshopify.com"
            required
            className={inputCls}
          />
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="shpat_..."
            required
            className={inputCls}
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-all"
          >
            <Plus size={14} />
            Add
          </button>
        </form>

        {stores.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-400 dark:text-slate-500 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
            No saved stores yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900/40 border-b border-gray-100 dark:border-slate-700">
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Store URL</th>
                  <th className="px-3 py-2 font-semibold">Token</th>
                  <th className="px-3 py-2 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30"
                  >
                    <td className="px-3 py-2 text-gray-800 dark:text-slate-100 font-medium">{s.name}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-slate-300 font-mono text-xs">{s.storeUrl}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-slate-300 font-mono text-xs">
                      <button
                        onClick={() => setRevealId(revealId === s.id ? null : s.id)}
                        className="inline-flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-purple-400"
                      >
                        {revealId === s.id ? <EyeOff size={11} /> : <Eye size={11} />}
                        {revealId === s.id ? s.token : mask(s.token)}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handleRemove(s)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default SavedStoresSection;
