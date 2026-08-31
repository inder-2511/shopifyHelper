import { useEffect, useState } from "react";
import { Plus, Trash2, Store as StoreIcon, Eye, EyeOff, Pencil, Check, X } from "lucide-react";
import { useSavedStores, normalizeStoreUrl } from "../../context/SavedStoresContext";
import { useToast } from "../../context/ToastContext";

const inputCls =
  "w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-400";

/** Strip a full myshopify.com URL down to just the store name for display in edit mode. */
const toStoreName = (url) => String(url ?? "").replace(/\.myshopify\.com$/i, "");

function SavedStoresSection() {
  const { stores, addStore, updateStore, removeStore } = useSavedStores();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [token, setToken] = useState("");
  const [revealId, setRevealId] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: "", storeName: "", token: "" });

  const handleAdd = (e) => {
    e.preventDefault();
    const record = addStore({ name, storeUrl: storeName, token });
    if (!record) {
      showToast("All fields required", "error");
      return;
    }
    setName("");
    setStoreName("");
    setToken("");
    showToast(`Saved "${record.name}" — ${record.storeUrl}`, "success");
  };

  const handleRemove = (store) => {
    if (!window.confirm(`Remove "${store.name}" from saved stores?`)) return;
    removeStore(store.id);
    showToast(`Removed "${store.name}"`, "success");
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditDraft({
      name: s.name,
      storeName: toStoreName(s.storeUrl),
      token: s.token,
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({ name: "", storeName: "", token: "" });
  };
  const saveEdit = () => {
    const trimmedName = editDraft.name.trim();
    const normalizedUrl = normalizeStoreUrl(editDraft.storeName);
    const trimmedToken = editDraft.token.trim();
    if (!trimmedName || !normalizedUrl || !trimmedToken) {
      showToast("All fields required", "error");
      return;
    }
    updateStore(editingId, { name: trimmedName, storeUrl: normalizedUrl, token: trimmedToken });
    showToast(`Updated "${trimmedName}"`, "success");
    cancelEdit();
  };

  // Escape cancels edit mode
  useEffect(() => {
    if (!editingId) return;
    const handler = (e) => e.key === "Escape" && cancelEdit();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [editingId]);

  const mask = (t) => (t.length <= 8 ? "•".repeat(t.length) : `${t.slice(0, 6)}…${t.slice(-4)}`);
  const previewUrl = storeName ? normalizeStoreUrl(storeName) : "";

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
        <StoreIcon size={17} className="text-purple-500" />
        <h2 className="text-base font-semibold text-gray-800 dark:text-slate-100">Saved Stores</h2>
      </header>

      <div className="p-5 space-y-4">
        <p className="text-xs text-gray-500 dark:text-slate-400">
          Save named store profiles here — Product and Order forms can pick from this list instead
          of retyping the URL and access token every time. Stored in your browser's localStorage.
        </p>

        <form onSubmit={handleAdd} className="space-y-2">
          <div className="grid grid-cols-4 gap-3">
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
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Store name (e.g. mystore)"
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
          </div>
          <p className="text-[11px] text-gray-500 dark:text-slate-500 pl-1">
            <code className="font-mono">.myshopify.com</code> is added automatically
            {previewUrl && <> — will save as <span className="font-mono text-purple-600 dark:text-purple-400">{previewUrl}</span></>}
          </p>
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
                  <th className="px-3 py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((s) => {
                  const isEditing = editingId === s.id;
                  if (isEditing) {
                    return (
                      <tr key={s.id} className="border-b border-gray-50 dark:border-slate-700/50 bg-purple-50/40 dark:bg-purple-900/10">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={editDraft.name}
                            onChange={(e) => setEditDraft((p) => ({ ...p, name: e.target.value }))}
                            className={inputCls}
                            autoFocus
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={editDraft.storeName}
                            onChange={(e) => setEditDraft((p) => ({ ...p, storeName: e.target.value }))}
                            placeholder="mystore"
                            className={inputCls}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="password"
                            value={editDraft.token}
                            onChange={(e) => setEditDraft((p) => ({ ...p, token: e.target.value }))}
                            className={inputCls}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={saveEdit}
                              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white"
                              title="Save (Enter)"
                            >
                              <Check size={12} />
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200"
                              title="Cancel (Esc)"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return (
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
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => startEdit(s)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 inline-flex items-center gap-1"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={() => handleRemove(s)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default SavedStoresSection;
