import { useState } from "react";
import { Plus, Trash2, ToggleRight, RotateCcw } from "lucide-react";
import { useSavedToggles, UUID_PLACEHOLDER } from "../../context/SavedTogglesContext";
import { useToast } from "../../context/ToastContext";

const inputCls =
  "w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-400";

function SavedTogglesSection() {
  const { toggles, addToggles, removeToggle, resetToDefaults } = useSavedToggles();
  const { showToast } = useToast();

  const [draft, setDraft] = useState("");

  const handleAdd = (e) => {
    e.preventDefault();
    const added = addToggles(draft);
    if (added === 0) {
      showToast("Paste one or more toggle lines first", "error");
      return;
    }
    setDraft("");
    showToast(`Added ${added} toggle${added !== 1 ? "s" : ""}`, "success");
  };

  const handleReset = () => {
    if (!window.confirm("Replace the current toggle catalog with the defaults?")) return;
    resetToDefaults();
    showToast("Toggles reset to defaults", "success");
  };

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ToggleRight size={17} className="text-purple-500" />
          <h2 className="text-base font-semibold text-gray-800 dark:text-slate-100">Saved Toggles</h2>
          <span className="text-xs text-gray-400 dark:text-slate-500">— {toggles.length} in catalog</span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200"
        >
          <RotateCcw size={12} />
          Reset to defaults
        </button>
      </header>

      <div className="p-5 space-y-4">
        <p className="text-xs text-gray-500 dark:text-slate-400">
          Toggle lines used by the <a href="/create-env/toggles" className="text-purple-600 dark:text-purple-400 hover:underline">Create ENV → Toggles</a> page.
          Any UUID in a pasted line is auto-replaced with the placeholder{" "}
          <code className="font-mono text-purple-600 dark:text-purple-400">{UUID_PLACEHOLDER}</code>{" "}
          — the target account UUID gets substituted at generate time. Stored in your browser's localStorage.
        </p>

        <form onSubmit={handleAdd} className="space-y-2">
          <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400">
            Add toggle line(s) — paste one or many, one per line
          </label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            placeholder={`"88d1d4c2-....my.feature.enabled": true,\n"88d1d4c2-....another.feature.enabled": false,`}
            className={`${inputCls} font-mono text-xs resize-y`}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-all"
            >
              <Plus size={12} />
              Add
            </button>
          </div>
        </form>

        {toggles.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-400 dark:text-slate-500 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
            No toggles saved.
          </div>
        ) : (
          <ul className="border border-gray-200 dark:border-slate-700 rounded-xl divide-y divide-gray-100 dark:divide-slate-700 overflow-hidden">
            {toggles.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700/40"
              >
                <code className="flex-1 min-w-0 text-[11px] font-mono text-gray-700 dark:text-slate-300 truncate" title={t.line}>
                  {t.line}
                </code>
                <button
                  onClick={() => removeToggle(t.id)}
                  className="text-xs px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 shrink-0"
                  title="Remove"
                >
                  <Trash2 size={11} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default SavedTogglesSection;
