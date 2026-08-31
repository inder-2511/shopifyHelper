import { useEffect, useState } from "react";
import { Plus, Trash2, MapPin, Pencil, Check, X } from "lucide-react";
import { useSavedAddresses } from "../../context/SavedAddressesContext";
import { useToast } from "../../context/ToastContext";

const inputCls =
  "w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-400";

const EMPTY = {
  name: "",
  first_name: "",
  last_name: "",
  company: "",
  address1: "",
  address2: "",
  city: "",
  province: "",
  country: "",
  zip: "",
  phone: "",
};

const summary = (a) =>
  [a.address1, a.city, a.province, a.zip, a.country].filter(Boolean).join(", ");

function Field({ label, value, onChange, required, placeholder, type = "text", className = "" }) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1">
        {label}
        {required && <span className="text-purple-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={inputCls}
      />
    </div>
  );
}

function SavedAddressesSection() {
  const { addresses, addAddress, updateAddress, removeAddress } = useSavedAddresses();
  const { showToast } = useToast();

  const [draft, setDraft] = useState(EMPTY);
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(EMPTY);

  const set = (key, val) => setDraft((p) => ({ ...p, [key]: val }));
  const setEdit = (key, val) => setEditDraft((p) => ({ ...p, [key]: val }));

  const resetDraft = () => setDraft(EMPTY);

  const handleAdd = (e) => {
    e.preventDefault();
    const record = addAddress(draft);
    if (!record) {
      showToast("Label + Address 1 + City + Country + ZIP are required", "error");
      return;
    }
    resetDraft();
    setExpanded(false);
    showToast(`Saved "${record.name}"`, "success");
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setEditDraft({ ...EMPTY, ...a });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(EMPTY);
  };
  const saveEdit = () => {
    const nextName = editDraft.name?.trim();
    if (!nextName || !editDraft.address1?.trim() || !editDraft.city?.trim() || !editDraft.country?.trim() || !editDraft.zip?.trim()) {
      showToast("Label + Address 1 + City + Country + ZIP are required", "error");
      return;
    }
    updateAddress(editingId, editDraft);
    showToast(`Updated "${nextName}"`, "success");
    cancelEdit();
  };

  useEffect(() => {
    if (!editingId) return;
    const handler = (e) => e.key === "Escape" && cancelEdit();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [editingId]);

  const handleRemove = (a) => {
    if (!window.confirm(`Remove "${a.name}"?`)) return;
    removeAddress(a.id);
    showToast(`Removed "${a.name}"`, "success");
  };

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
        <MapPin size={17} className="text-purple-500" />
        <h2 className="text-base font-semibold text-gray-800 dark:text-slate-100">Saved Addresses</h2>
      </header>

      <div className="p-5 space-y-4">
        <p className="text-xs text-gray-500 dark:text-slate-400">
          Save shipping/billing addresses here — order forms let you pick one instead of retyping.
          Stored in your browser's localStorage.
        </p>

        {/* Add form (collapsible) */}
        <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/40"
          >
            <span className="flex items-center gap-2">
              <Plus size={14} />
              Add address
            </span>
            <span className="text-xs text-gray-400 dark:text-slate-500">{expanded ? "Collapse" : "Expand"}</span>
          </button>

          {expanded && (
            <form onSubmit={handleAdd} className="p-4 border-t border-gray-100 dark:border-slate-700 space-y-3 bg-gray-50/50 dark:bg-slate-900/20">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Label" required value={draft.name} onChange={(v) => set("name", v)} placeholder="Home / Office" />
                <Field label="Company" value={draft.company} onChange={(v) => set("company", v)} placeholder="Acme Inc." />
                <Field label="First Name" value={draft.first_name} onChange={(v) => set("first_name", v)} placeholder="John" />
                <Field label="Last Name" value={draft.last_name} onChange={(v) => set("last_name", v)} placeholder="Doe" />
              </div>
              <Field label="Address line 1" required value={draft.address1} onChange={(v) => set("address1", v)} placeholder="121 Evelyn Rd" />
              <Field label="Address line 2" value={draft.address2} onChange={(v) => set("address2", v)} placeholder="Apt / Suite (optional)" />
              <div className="grid grid-cols-4 gap-3">
                <Field label="City" required value={draft.city} onChange={(v) => set("city", v)} placeholder="Needham Heights" />
                <Field label="State / Province" value={draft.province} onChange={(v) => set("province", v)} placeholder="Massachusetts" />
                <Field label="ZIP / Postcode" required value={draft.zip} onChange={(v) => set("zip", v)} placeholder="02494" />
                <Field label="Country" required value={draft.country} onChange={(v) => set("country", v)} placeholder="United States" />
              </div>
              <Field label="Phone" value={draft.phone} onChange={(v) => set("phone", v)} placeholder="+1 415 555 2671" />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { resetDraft(); setExpanded(false); }}
                  className="text-xs px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                >
                  <Plus size={12} />
                  Save address
                </button>
              </div>
            </form>
          )}
        </div>

        {/* List */}
        {addresses.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-400 dark:text-slate-500 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
            No saved addresses yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {addresses.map((a) => {
              const isEditing = editingId === a.id;
              if (isEditing) {
                return (
                  <li key={a.id} className="p-4 border border-purple-200 dark:border-purple-800/60 rounded-xl bg-purple-50/40 dark:bg-purple-900/10 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Label" required value={editDraft.name} onChange={(v) => setEdit("name", v)} />
                      <Field label="Company" value={editDraft.company} onChange={(v) => setEdit("company", v)} />
                      <Field label="First Name" value={editDraft.first_name} onChange={(v) => setEdit("first_name", v)} />
                      <Field label="Last Name" value={editDraft.last_name} onChange={(v) => setEdit("last_name", v)} />
                    </div>
                    <Field label="Address line 1" required value={editDraft.address1} onChange={(v) => setEdit("address1", v)} />
                    <Field label="Address line 2" value={editDraft.address2} onChange={(v) => setEdit("address2", v)} />
                    <div className="grid grid-cols-4 gap-3">
                      <Field label="City" required value={editDraft.city} onChange={(v) => setEdit("city", v)} />
                      <Field label="State / Province" value={editDraft.province} onChange={(v) => setEdit("province", v)} />
                      <Field label="ZIP" required value={editDraft.zip} onChange={(v) => setEdit("zip", v)} />
                      <Field label="Country" required value={editDraft.country} onChange={(v) => setEdit("country", v)} />
                    </div>
                    <Field label="Phone" value={editDraft.phone} onChange={(v) => setEdit("phone", v)} />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="flex items-center gap-1 text-xs px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200"
                      >
                        <X size={12} />
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="flex items-center gap-1 text-xs px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                      >
                        <Check size={12} />
                        Save
                      </button>
                    </div>
                  </li>
                );
              }
              return (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-3 p-4 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-gray-300 dark:hover:border-slate-600 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{a.name}</p>
                    <p className="text-xs text-gray-600 dark:text-slate-300 truncate">{summary(a)}</p>
                    {(a.first_name || a.last_name || a.phone) && (
                      <p className="text-[11px] text-gray-500 dark:text-slate-500 mt-0.5 truncate">
                        {[`${a.first_name || ""} ${a.last_name || ""}`.trim(), a.company, a.phone].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => startEdit(a)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 inline-flex items-center gap-1"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => handleRemove(a)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

export default SavedAddressesSection;
