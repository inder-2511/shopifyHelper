import { useMemo, useRef, useState } from "react";
import { Copy, CheckCircle2, ToggleRight, AlertTriangle } from "lucide-react";
import { useSavedToggles, UUID_PLACEHOLDER } from "../../context/SavedTogglesContext";
import { useToast } from "../../context/ToastContext";
import { useScrollOnTruthy } from "../../hooks/useScrollOnTruthy";

const inputCls =
  "w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 focus:border-purple-500 outline-none rounded-xl py-2.5 px-3 text-sm text-gray-800 dark:text-slate-100 transition-colors disabled:opacity-60";

// A UUID looks like: 8-4-4-4-12 hex digits.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Escape a string for use inside a RegExp. */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function CreateTogglesForm() {
  const { showToast } = useToast();
  const { toggles } = useSavedToggles();

  const [uuid, setUuid] = useState(() => localStorage.getItem("toggles_uuid") ?? "");
  const [copied, setCopied] = useState(false);

  const outputRef = useRef(null);

  const setUuidVal = (v) => {
    setUuid(v);
    localStorage.setItem("toggles_uuid", v);
  };

  const uuidValid = UUID_RE.test(uuid.trim());
  const canGenerate = uuidValid && toggles.length > 0;

  // Build the substituted output. Uses a global regex so every occurrence of the placeholder
  // (a line can technically have more than one) is replaced.
  const output = useMemo(() => {
    if (!canGenerate) return "";
    const re = new RegExp(escapeRe(UUID_PLACEHOLDER), "g");
    return toggles.map((t) => t.line.replace(re, uuid.trim())).join("\n");
  }, [canGenerate, toggles, uuid]);

  useScrollOnTruthy(outputRef, output);

  const copyOutput = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      showToast("Copied to clipboard", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Copy failed — select the text and copy manually", "error");
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div>
            <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">
              Account UUID
            </label>
            <input
              type="text"
              value={uuid}
              onChange={(e) => setUuidVal(e.target.value)}
              placeholder="88d1d4c2-07df-4d12-8779-e74bcd697e8a"
              className={`${inputCls} font-mono`}
              autoFocus
            />
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1.5">
              Every occurrence of <code className="font-mono">{"{{UUID}}"}</code> in the saved
              toggle catalog will be replaced with this value. Manage the catalog in{" "}
              <a href="/settings" className="text-purple-600 dark:text-purple-400 hover:underline">
                Settings → Saved Toggles
              </a>.
            </p>
            {uuid && !uuidValid && (
              <div className="mt-2 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                Doesn't look like a UUID. Expected format:{" "}
                <code className="font-mono">xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</code>.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700">
            <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
              <ToggleRight size={13} />
              {toggles.length} toggle{toggles.length !== 1 && "s"} in catalog
            </div>
          </div>
        </form>
      </div>

      <div ref={outputRef} className="scroll-mt-6" />

      {output && (
        <div className="bg-[#0B1120] border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Toggles output</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Paste into your store config
              </p>
            </div>
            <button
              type="button"
              onClick={copyOutput}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-all"
            >
              {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="p-5 text-xs leading-relaxed font-mono text-emerald-300 whitespace-pre-wrap break-all overflow-auto max-h-[600px]">
            {output}
          </pre>
        </div>
      )}

      {!canGenerate && toggles.length === 0 && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle size={15} />
          The toggle catalog is empty. Add or restore defaults in{" "}
          <a href="/settings" className="underline">Settings → Saved Toggles</a>.
        </div>
      )}
    </div>
  );
}

export default CreateTogglesForm;
