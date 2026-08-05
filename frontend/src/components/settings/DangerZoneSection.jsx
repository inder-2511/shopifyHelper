import { AlertTriangle, Trash2 } from "lucide-react";
import { useActivity } from "../../context/ActivityContext";
import { useSavedStores } from "../../context/SavedStoresContext";
import { useToast } from "../../context/ToastContext";

function DangerZoneSection() {
  const { clearActivities } = useActivity();
  const { clearStores } = useSavedStores();
  const { showToast } = useToast();

  const doAndConfirm = (label, effect) => () => {
    if (!window.confirm(`${label}\n\nThis cannot be undone. Continue?`)) return;
    effect();
    showToast(`${label} — done`, "success");
  };

  const wipeAll = () => {
    localStorage.clear();
    // Hard reload to reset all React contexts back to their initial state
    window.location.reload();
  };

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-sm">
      <header className="px-5 py-4 border-b border-red-100 dark:border-red-900/50 flex items-center gap-2">
        <AlertTriangle size={17} className="text-red-500" />
        <h2 className="text-base font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
      </header>

      <div className="p-5 space-y-3">
        <Row
          label="Clear activity log"
          description="Removes all entries from the Activity panel (current session only)."
          onClick={doAndConfirm("Clear activity log", clearActivities)}
        />
        <Row
          label="Clear saved stores"
          description="Deletes all saved store profiles (name + URL + token)."
          onClick={doAndConfirm("Clear saved stores", clearStores)}
        />
        <Row
          label="Reset all local data"
          description="Clears everything in localStorage (saved stores, theme, form field memory) and reloads the page."
          onClick={doAndConfirm("Reset all local data", wipeAll)}
          strong
        />
      </div>
    </section>
  );
}

function Row({ label, description, onClick, strong }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-gray-800 dark:text-slate-100 font-medium">{label}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{description}</p>
      </div>
      <button
        onClick={onClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          strong
            ? "bg-red-600 hover:bg-red-700 text-white"
            : "bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
        }`}
      >
        <Trash2 size={12} />
        {strong ? "Reset" : "Clear"}
      </button>
    </div>
  );
}

export default DangerZoneSection;
