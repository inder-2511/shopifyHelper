import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

function ThemeSection() {
  const { dark, toggle } = useTheme();

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
        {dark ? <Moon size={17} className="text-purple-500" /> : <Sun size={17} className="text-purple-500" />}
        <h2 className="text-base font-semibold text-gray-800 dark:text-slate-100">Appearance</h2>
      </header>

      <div className="p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-700 dark:text-slate-200 font-medium">Dark mode</p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Currently: <span className="font-mono">{dark ? "dark" : "light"}</span> — remembered across sessions.
          </p>
        </div>
        <button
          onClick={toggle}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            dark ? "bg-purple-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
              dark ? "left-6" : "left-0.5"
            }`}
          />
        </button>
      </div>
    </section>
  );
}

export default ThemeSection;
