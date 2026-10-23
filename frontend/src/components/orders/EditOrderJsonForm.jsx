import { useRef, useState } from "react";
import {
  Loader2,
  Send,
  Download,
  Eraser,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
} from "lucide-react";
import { cloneTemplateApi, createOrderApi, fetchOrderApi } from "../../api/orderApi";
import { useToast } from "../../context/ToastContext";
import { classifyError } from "../../utils/errorClassifier";
import { useOrderOps } from "../../context/OrderOpsContext";
import { useOrderSettings } from "../../context/OrderSettingsContext";
import SavedStorePicker from "../common/SavedStorePicker";
import ErrorBanner from "../common/ErrorBanner";
import { useScrollOnTruthy } from "../../hooks/useScrollOnTruthy";

const inputCls =
  "w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 focus:border-purple-500 outline-none rounded-xl py-2.5 px-3 text-sm text-gray-800 dark:text-slate-100 transition-colors disabled:opacity-60";

const PLACEHOLDER = `{
  "line_items": [
    { "variant_id": 48969032827102, "quantity": 1, "price": "10.00" }
  ],
  "shipping_address": {
    "first_name": "Serenity",
    "last_name": "Wuckert",
    "address1": "14 Nehru Place",
    "city": "New Delhi",
    "province": "Delhi",
    "country": "India",
    "zip": "110019",
    "phone": "+919312345680"
  },
  "billing_address": { },
  "email": "customer@example.com",
  "currency": "INR",
  "financial_status": "paid",
  "transactions": [
    { "kind": "sale", "status": "success", "amount": "10.00", "gateway": "bogus" }
  ],
  "note": "Edited via Shopify Helper"
}`;

/** Try to pretty-print; return null if the body isn't valid JSON. */
const tryFormat = (text) => {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return null;
  }
};

function EditOrderJsonForm() {
  const { showToast } = useToast();
  const { storeUrl, setStoreUrl, token, setToken } = useOrderOps();
  const { editableOrders } = useOrderSettings();

  const [body, setBody] = useState(() => localStorage.getItem("edit_json_body") ?? "");
  const [sourceId, setSourceId] = useState("");
  const [raw, setRaw] = useState(false); // show the raw source order instead of the cloned template

  const [prefilling, setPrefilling] = useState(false);
  const [posting, setPosting] = useState(false);

  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const resultRef = useRef(null);
  useScrollOnTruthy(resultRef, result || error);

  const setBodyVal = (v) => {
    setBody(v);
    localStorage.setItem("edit_json_body", v);
  };

  const parseError = (() => {
    if (!body.trim()) return null;
    try {
      JSON.parse(body);
      return null;
    } catch (err) {
      return err.message;
    }
  })();

  const handleFormat = () => {
    const pretty = tryFormat(body);
    if (pretty == null) {
      showToast("Can't format — JSON is invalid", "error");
      return;
    }
    setBodyVal(pretty);
    showToast("Formatted", "success");
  };

  const handleClear = () => {
    if (body && !window.confirm("Clear the editor?")) return;
    setBodyVal("");
    setResult(null);
    setError(null);
  };

  const handlePrefill = async () => {
    if (!sourceId.trim()) {
      showToast("Enter an order ID or name first", "error");
      return;
    }
    if (!storeUrl || !token) {
      showToast("Fill Store URL + Access Token first", "error");
      return;
    }
    setPrefilling(true);
    setError(null);
    try {
      let json;
      let successMsg;
      if (raw) {
        const order = await fetchOrderApi(storeUrl, token, sourceId.trim());
        json = JSON.stringify(order, null, 2);
        successMsg = `Loaded raw order ${order.name ?? sourceId}`;
      } else {
        const { template, source } = await cloneTemplateApi(storeUrl, token, sourceId.trim());
        json = JSON.stringify(template, null, 2);
        successMsg = `Prefilled from ${source?.name ?? sourceId} — edit any field, then Create`;
      }
      setBodyVal(json);
      showToast(successMsg, "success");
    } catch (err) {
      setError(classifyError(err));
    } finally {
      setPrefilling(false);
    }
  };

  const handleCreate = async (e) => {
    if (e) e.preventDefault();
    if (parseError) {
      showToast("Fix the JSON first", "error");
      return;
    }
    if (!storeUrl || !token) {
      showToast("Fill Store URL + Access Token first", "error");
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      showToast("JSON is empty or invalid", "error");
      return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      showToast("Top-level JSON must be an object (not an array or primitive)", "error");
      return;
    }

    setPosting(true);
    setError(null);
    setResult(null);
    try {
      const data = await createOrderApi({
        storeUrl,
        token,
        viaDraftOrder: Boolean(editableOrders),
        ...parsed,
      });
      setResult(data);
      showToast(`Created ${data?.order?.name ?? "order"}`, "success");
    } catch (err) {
      setError(classifyError(err));
    } finally {
      setPosting(false);
    }
  };

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      showToast("Copied result JSON", "success");
    } catch {
      showToast("Copy failed", "error");
    }
  };

  return (
    <div className="space-y-5">
      {/* Store credentials */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <SavedStorePicker onPick={({ storeUrl: u, token: t }) => { setStoreUrl(u); setToken(t); }} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">Store URL</label>
              <input
                type="text"
                placeholder="your-store.myshopify.com"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">Access Token</label>
              <input
                type="password"
                placeholder="shpat_..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </form>
      </div>

      {/* Prefill */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="mb-3">
          <h2 className="text-base font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            <Download size={15} className="text-purple-500" />
            Prefill from an existing order
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Optional — look up an order and drop its payload into the editor below as a starting point.
          </p>
        </div>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-xs">
              Order ID or name
            </label>
            <input
              type="text"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              placeholder="1234567890 or #1012"
              disabled={prefilling}
              className={inputCls}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handlePrefill())}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400 pb-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={raw}
              onChange={(e) => setRaw(e.target.checked)}
              className="w-3.5 h-3.5 accent-purple-600"
            />
            Load raw (full order, incl. read-only fields)
          </label>
          <button
            type="button"
            onClick={handlePrefill}
            disabled={prefilling || !sourceId.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold transition-all"
          >
            {prefilling ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {prefilling ? "Loading…" : "Prefill"}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <Code2 size={15} className="text-purple-500" />
              Order JSON
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              This is the request body sent as <code className="font-mono">order</code> on{" "}
              <code className="font-mono">POST /orders.json</code>. Edit any field; the top-level
              object will be posted as-is.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={handleFormat}
              disabled={!body.trim()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-40 text-gray-700 dark:text-slate-200"
              title="Pretty-print the JSON"
            >
              <Code2 size={12} />
              Format
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={!body.trim()}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-40 text-gray-700 dark:text-slate-200"
            >
              <Eraser size={12} />
              Clear
            </button>
          </div>
        </div>

        <textarea
          value={body}
          onChange={(e) => setBodyVal(e.target.value)}
          placeholder={PLACEHOLDER}
          spellCheck={false}
          rows={22}
          className="w-full bg-[#0B1120] text-emerald-300 font-mono text-xs leading-relaxed p-5 outline-none resize-y placeholder:text-slate-600"
          style={{ minHeight: "20rem" }}
        />

        {parseError && (
          <div className="flex items-start gap-2 px-5 py-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            Invalid JSON: {parseError}
          </div>
        )}

        <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between gap-3">
          <div className="text-[11px] text-gray-500 dark:text-slate-400">
            {editableOrders
              ? "Will post via the Draft Order path (editable-orders mode is on in Settings)."
              : "Will post directly to /orders.json."}
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={posting || !body.trim() || Boolean(parseError)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 disabled:opacity-50 text-white text-sm font-semibold transition-all"
          >
            {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {posting ? "Creating…" : "Create order from this JSON"}
          </button>
        </div>
      </div>

      <div ref={resultRef} className="scroll-mt-6" />

      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      {result?.order && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
              <CheckCircle2 size={15} className="text-emerald-500" />
              Created {result.order.name}
              <span className="text-xs text-gray-500 dark:text-slate-400 font-mono">
                — ID {result.order.id}
              </span>
            </div>
            <div className="flex gap-2">
              {storeUrl && (
                <a
                  href={`https://${storeUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}/admin/orders/${result.order.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300"
                >
                  <ExternalLink size={11} />
                  Open in Shopify
                </a>
              )}
              <button
                onClick={copyResult}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200"
              >
                <Copy size={11} />
                Copy JSON
              </button>
            </div>
          </div>
          <pre className="text-xs text-gray-700 dark:text-slate-300 p-5 leading-relaxed font-mono whitespace-pre-wrap break-all overflow-auto max-h-[500px]">
            {JSON.stringify(result.order, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default EditOrderJsonForm;
