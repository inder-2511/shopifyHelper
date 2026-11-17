import { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookmarkPlus, CheckCircle2, Copy, Download, Loader2 } from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import ErrorBanner from "../../components/common/ErrorBanner";
import { useToast } from "../../context/ToastContext";
import { usePresta } from "../context/PrestaContext";

export const inputCls =
  "w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-400";

export const primaryBtn =
  "flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-sm font-semibold transition-all";

export const secondaryBtn =
  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 transition-all";

export function Page({ title, subtitle, children }) {
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">{title}</h1>
        {subtitle && <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">{subtitle}</p>}
      </div>
      <div className="space-y-5">{children}</div>
    </MainLayout>
  );
}

export function Card({ title, children, className = "" }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 ${className}`}>
      {title && <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3">{title}</h2>}
      {children}
    </div>
  );
}

export function Field({ label, hint, children, className = "" }) {
  return (
    // Wrapping <label> ties the text to its input for screen readers and click-to-focus.
    <label className={`block ${className}`}>
      <span className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-gray-400 dark:text-slate-500 mt-1">{hint}</span>}
    </label>
  );
}

export function Spinner({ size = 15 }) {
  return <Loader2 size={size} className="animate-spin" />;
}

export function Busy({ children }) {
  return (
    <div className="flex items-center gap-2 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-xl px-4 py-3 text-sm text-pink-700 dark:text-pink-300">
      <Spinner />
      {children}
    </div>
  );
}

/** Saved-store chips + Shop URL + API key. Shared by every PrestaShop page. */
export function PrestaCredentials({ children }) {
  const { stores, creds, setShopUrl, setApiKey, pickStore } = usePresta();

  return (
    <Card>
      <div className="space-y-3">
        {stores.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
            <BookmarkPlus size={12} />
            Tip: save store profiles in{" "}
            <Link to="/presta/settings" className="text-pink-600 dark:text-pink-400 hover:underline">
              Settings
            </Link>{" "}
            so you don't have to retype these.
          </p>
        ) : (
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              <Bookmark size={12} />
              Saved stores — click to load
            </p>
            <div className="flex flex-wrap gap-2">
              {stores.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickStore(s)}
                  title={s.shopUrl}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    s.shopUrl === creds.shopUrl && s.apiKey === creds.apiKey
                      ? "bg-pink-600 text-white border-pink-600"
                      : "bg-pink-50 dark:bg-pink-900/30 hover:bg-pink-100 dark:hover:bg-pink-900/50 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800/60"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Shop URL" hint="Store root, e.g. https://myshop.com or localhost:8080 — without /api">
            <input
              type="text"
              value={creds.shopUrl}
              onChange={(e) => setShopUrl(e.target.value)}
              placeholder="https://myshop.com"
              className={inputCls}
              required
            />
          </Field>
          <Field label="Webservice API key" hint="Advanced Parameters → Webservice → Add new key">
            <input
              type="password"
              value={creds.apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="32-character key"
              className={inputCls}
              required
            />
          </Field>
        </div>
        {children}
      </div>
    </Card>
  );
}

/** Pretty JSON with Copy + Download. */
export function JsonResult({ title, data, filename = "prestashop.json", summary }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(data, null, 2);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast("Copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
          <CheckCircle2 size={15} className="text-green-500" />
          {title}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={copy} className={secondaryBtn}>
            <Copy size={12} />
            {copied ? "Copied!" : "Copy JSON"}
          </button>
          <button type="button" onClick={download} className={secondaryBtn}>
            <Download size={12} />
            Download
          </button>
        </div>
      </div>
      {summary}
      <div className="overflow-auto max-h-[500px]">
        <pre className="text-xs text-gray-700 dark:text-slate-300 p-5 leading-relaxed font-mono whitespace-pre-wrap break-all">
          {text}
        </pre>
      </div>
    </div>
  );
}

/** Small key/value strip shown above a JSON result. */
export function Facts({ items }) {
  return (
    <div className="grid gap-px bg-gray-100 dark:bg-slate-700 border-b border-gray-100 dark:border-slate-700" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map(({ label, value }) => (
        <div key={label} className="bg-white dark:bg-slate-800 px-4 py-2.5 text-center">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 mt-0.5 break-all">{value ?? "—"}</p>
        </div>
      ))}
    </div>
  );
}

/** Warning list for things the backend skipped (read-only fields, uncopied images…). */
export function Skipped({ dropped = [], skipped = [] }) {
  if (!dropped.length && !skipped.length) return null;
  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
      {skipped.length > 0 && <p><b>Not copied:</b> {skipped.join(", ")}.</p>}
      {dropped.length > 0 && (
        <p>
          <b>Left out (read-only or unknown to this store):</b> <span className="font-mono">{dropped.join(", ")}</span>
        </p>
      )}
    </div>
  );
}

export { ErrorBanner };

/**
 * One-field lookup form → result. Used by Fetch / Duplicate / Delete pages.
 */
export function LookupPage({
  title, subtitle, label, placeholder, buttonLabel, buttonIcon: Icon, busyLabel,
  op, run, danger = false, extraFields, confirm, children,
}) {
  const { creds } = usePresta();
  const [value, setValue] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (confirm && !window.confirm(confirm(value))) return;
    run(creds, value.trim());
  };

  return (
    <Page title={title} subtitle={subtitle}>
      <form onSubmit={submit} className="space-y-5">
        <PrestaCredentials />
        <Card>
          <div className="flex gap-3 items-end">
            <Field label={label} className="flex-1">
              <input type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} required className={inputCls} />
            </Field>
            {extraFields}
            <button
              type="submit"
              disabled={op.loading}
              className={danger
                ? "flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold transition-all"
                : primaryBtn}
            >
              {op.loading ? <Spinner /> : Icon && <Icon size={15} />}
              {op.loading ? busyLabel : buttonLabel}
            </button>
          </div>
        </Card>
      </form>

      {op.loading && <Busy>{busyLabel}</Busy>}
      <ErrorBanner error={op.error} onRetry={() => run(creds, value.trim())} onDismiss={op.clearError} />
      {op.result && children(op.result)}
    </Page>
  );
}
