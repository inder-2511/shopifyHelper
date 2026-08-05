import { BookmarkPlus, Bookmark } from "lucide-react";
import { Link } from "react-router-dom";
import { useSavedStores } from "../../context/SavedStoresContext";

/**
 * One-click load of a saved (name, storeUrl, token) into any form.
 * Renders above the manual Store URL / Access Token inputs — those stay editable.
 *
 * variant="chips"  — clickable pills (used by order forms).
 * variant="select" — dropdown (used by product forms).
 */
function SavedStorePicker({ onPick, className = "", variant = "chips" }) {
  const { stores } = useSavedStores();

  if (stores.length === 0) {
    return (
      <div className={`text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5 ${className}`}>
        <BookmarkPlus size={12} />
        Tip: save store profiles in{" "}
        <Link to="/settings" className="text-purple-600 dark:text-purple-400 hover:underline">
          Settings
        </Link>{" "}
        so you don't have to retype these.
      </div>
    );
  }

  const pick = (s) => onPick({ storeUrl: s.storeUrl, token: s.token });

  if (variant === "select") {
    return (
      <div className={className}>
        <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
          Load from saved stores
        </label>
        <select
          value=""
          onChange={(e) => {
            const s = stores.find((x) => x.id === e.target.value);
            if (s) pick(s);
          }}
          className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          <option value="">— pick a saved store —</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.storeUrl})
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
        <Bookmark size={12} />
        Saved stores — click to load
      </p>
      <div className="flex flex-wrap gap-2">
        {stores.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => pick(s)}
            title={s.storeUrl}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 transition-all"
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default SavedStorePicker;
