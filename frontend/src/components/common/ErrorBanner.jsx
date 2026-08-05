import { AlertTriangle, X, RefreshCcw } from "lucide-react";

const kindTone = {
  auth:          { bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800", text: "text-amber-800 dark:text-amber-300", icon: "text-amber-500" },
  forbidden:     { bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800", text: "text-amber-800 dark:text-amber-300", icon: "text-amber-500" },
  not_found:     { bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800", text: "text-orange-800 dark:text-orange-300", icon: "text-orange-500" },
  validation:    { bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800", text: "text-orange-800 dark:text-orange-300", icon: "text-orange-500" },
  rate_limit:    { bg: "bg-yellow-50 dark:bg-yellow-900/20", border: "border-yellow-200 dark:border-yellow-800", text: "text-yellow-800 dark:text-yellow-300", icon: "text-yellow-500" },
  server:        { bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-400", icon: "text-red-500" },
  network:       { bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-400", icon: "text-red-500" },
  not_supported: { bg: "bg-gray-50 dark:bg-slate-900/40", border: "border-gray-200 dark:border-slate-700", text: "text-gray-700 dark:text-slate-300", icon: "text-gray-500" },
  unknown:       { bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-400", icon: "text-red-500" },
};

function ErrorBanner({ error, onRetry, onDismiss, context }) {
  if (!error) return null;
  const tone = kindTone[error.kind] ?? kindTone.unknown;

  return (
    <div className={`rounded-xl border ${tone.bg} ${tone.border} px-4 py-3 text-sm ${tone.text}`}>
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${tone.icon}`} />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold">{error.title}</p>
            {error.status && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-mono bg-white/40 dark:bg-black/20">
                HTTP {error.status}
              </span>
            )}
            {context && (
              <span className="text-[11px] opacity-70">— {context}</span>
            )}
          </div>
          {error.action && (
            <p className="text-xs leading-relaxed">{error.action}</p>
          )}
          {error.message && error.message !== error.title && (
            <details className="text-[11px] opacity-70">
              <summary className="cursor-pointer hover:opacity-100">Show raw response</summary>
              <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-[10px] max-h-40 overflow-auto bg-white/40 dark:bg-black/20 rounded p-2">
                {error.message}
              </pre>
            </details>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-white/60 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 transition-all"
            >
              <RefreshCcw size={11} />
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 rounded-md hover:bg-white/40 dark:hover:bg-black/20 transition-all"
              title="Dismiss"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorBanner;
