import { useState } from "react";
import { Check, Eye, EyeOff, Pencil, Plus, Store as StoreIcon, Trash2, X } from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import SavedAddressesSection from "../../components/settings/SavedAddressesSection";
import ThemeSection from "../../components/settings/ThemeSection";
import BackendInfoSection from "../../components/settings/BackendInfoSection";
import { useToast } from "../../context/ToastContext";
import { cleanShopUrl, usePresta } from "../context/PrestaContext";
import { inputCls } from "../components/ui";

const mask = (t) => (t.length <= 8 ? "•".repeat(t.length) : `${t.slice(0, 4)}…${t.slice(-4)}`);

function SavedStoresSection() {
  const { stores, addStore, updateStore, removeStore } = usePresta();
  const { showToast } = useToast();
  const [draft, setDraft] = useState({ name: "", shopUrl: "", apiKey: "" });
  const [reveal, setReveal] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({ name: "", shopUrl: "", apiKey: "" });

  const add = (e) => {
    e.preventDefault();
    const record = addStore(draft);
    if (!record) return showToast("All fields required", "error");
    setDraft({ name: "", shopUrl: "", apiKey: "" });
    showToast(`Saved "${record.name}" — ${record.shopUrl}`, "success");
  };
  const saveEdit = () => {
    if (!edit.name.trim() || !cleanShopUrl(edit.shopUrl) || !edit.apiKey.trim()) return showToast("All fields required", "error");
    updateStore(editingId, edit);
    showToast(`Updated "${edit.name.trim()}"`, "success");
    setEditingId(null);
  };

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
        <StoreIcon size={17} className="text-pink-500" />
        <h2 className="text-base font-semibold text-gray-800 dark:text-slate-100">Saved PrestaShop Stores</h2>
      </header>
      <div className="p-5 space-y-4">
        <p className="text-xs text-gray-500 dark:text-slate-400">
          Save named store profiles so every page can load a Shop URL + Webservice key in one click. Stored in this browser's localStorage only. Create the key in Back Office → Advanced Parameters → Webservice.
        </p>

        <form onSubmit={add} className="grid grid-cols-4 gap-3">
          <input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Label (e.g. Test Shop)" className={inputCls} />
          <input required value={draft.shopUrl} onChange={(e) => setDraft({ ...draft, shopUrl: e.target.value })} placeholder="https://myshop.com" className={inputCls} />
          <input required type="password" value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} placeholder="Webservice key" className={inputCls} />
          <button type="submit" className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold transition-all"><Plus size={14} /> Add</button>
        </form>

        {stores.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-400 dark:text-slate-500 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl">No saved stores yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900/40 border-b border-gray-100 dark:border-slate-700">
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-400">
                <th className="px-3 py-2 font-semibold">Name</th><th className="px-3 py-2 font-semibold">Shop URL</th>
                <th className="px-3 py-2 font-semibold">API key</th><th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((s) =>
                editingId === s.id ? (
                  <tr key={s.id} className="border-b border-gray-50 dark:border-slate-700/50 bg-pink-50/40 dark:bg-pink-900/10">
                    <td className="px-3 py-2"><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={inputCls} autoFocus /></td>
                    <td className="px-3 py-2"><input value={edit.shopUrl} onChange={(e) => setEdit({ ...edit, shopUrl: e.target.value })} className={inputCls} /></td>
                    <td className="px-3 py-2"><input type="password" value={edit.apiKey} onChange={(e) => setEdit({ ...edit, apiKey: e.target.value })} className={inputCls} /></td>
                    <td className="px-3 py-2"><div className="flex justify-end gap-1.5">
                      <button onClick={saveEdit} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white"><Check size={12} /> Save</button>
                      <button onClick={() => setEditingId(null)} className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200"><X size={12} /></button>
                    </div></td>
                  </tr>
                ) : (
                  <tr key={s.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="px-3 py-2 text-gray-800 dark:text-slate-100 font-medium">{s.name}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-slate-300 font-mono text-xs">{s.shopUrl}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-slate-300 font-mono text-xs">
                      <button onClick={() => setReveal(reveal === s.id ? null : s.id)} className="inline-flex items-center gap-1.5 hover:text-pink-600">
                        {reveal === s.id ? <EyeOff size={11} /> : <Eye size={11} />} {reveal === s.id ? s.apiKey : mask(s.apiKey)}
                      </button>
                    </td>
                    <td className="px-3 py-2"><div className="flex justify-end gap-1.5">
                      <button onClick={() => { setEditingId(s.id); setEdit({ name: s.name, shopUrl: s.shopUrl, apiKey: s.apiKey }); }} className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200"><Pencil size={11} /></button>
                      <button onClick={() => { if (window.confirm(`Remove "${s.name}" from saved stores?`)) { removeStore(s.id); showToast(`Removed "${s.name}"`, "success"); } }} className="text-xs px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"><Trash2 size={12} /></button>
                    </div></td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default function PrestaSettings() {
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">Settings</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">PrestaShop store profiles and app preferences</p>
      </div>
      <div className="space-y-5">
        <SavedStoresSection />
        <SavedAddressesSection />
        <ThemeSection />
        <BackendInfoSection />
      </div>
    </MainLayout>
  );
}
