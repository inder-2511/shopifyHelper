import { useMemo, useRef, useState } from "react";
import {
  Loader2,
  Search,
  Copy,
  CheckCircle2,
  FileCode,
  Package,
  Layers,
  Cloud,
} from "lucide-react";
import { listProductsApi } from "../../api/productApi";
import { classifyError } from "../../utils/errorClassifier";
import { useToast } from "../../context/ToastContext";
import SavedStorePicker from "../common/SavedStorePicker";
import ErrorBanner from "../common/ErrorBanner";
import { useScrollOnTruthy } from "../../hooks/useScrollOnTruthy";

const inputCls =
  "w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 focus:border-purple-500 outline-none rounded-xl py-2.5 px-3 text-sm text-gray-800 dark:text-slate-100 transition-colors disabled:opacity-60";

/** Categorize a product by title keyword (matches importCsvService.js's convention). */
const categoryOf = (product) => {
  const title = (product.title || "").toLowerCase();
  if (title.includes("digital")) return "digital";
  if (title.includes("variable")) return "variable";
  return "simple";
};

/**
 * For a chosen product, emit the rows that go into the ENV list.
 *  - digital / simple: one row (first variant).
 *  - variable: one row per variant.
 */
const rowsForProduct = (product, category) => {
  if (!product.variants?.length) return [];
  if (category === "variable") {
    return product.variants.map((v) => ({
      product_id: product.id,
      variant_id: v.id,
    }));
  }
  return [
    {
      product_id: product.id,
      variant_id: product.variants[0].id,
    },
  ];
};

/** Format `[{product_id: X, variant_id: Y}, ...]` — unquoted keys, no spaces after commas between rows. */
const formatRows = (rows) => {
  if (!rows.length) return "[]";
  const items = rows.map((r) => `{"product_id":${r.product_id},"variant_id":${r.variant_id}}`);
  return `[${items.join(", ")}]`;
};

const CATEGORIES = [
  {
    key: "simple",
    label: "Simple Products",
    envKey: "SIMPLE_PRODUCTS_JSON",
    hint: "Standard products with a single variant. Match: title does NOT contain 'digital' or 'variable'.",
    icon: Package,
    tone: "text-violet-500",
  },
  {
    key: "variable",
    label: "Variable Products",
    envKey: "VARIABLE_PRODUCTS_JSON",
    hint: "Products with options (size, color). Match: title contains 'variable'. Every variant becomes a row.",
    icon: Layers,
    tone: "text-purple-500",
  },
  {
    key: "digital",
    label: "Digital Products",
    envKey: "DIGITAL_PRODUCTS_JSON",
    hint: "Non-shippable downloads. Match: title contains 'digital'.",
    icon: Cloud,
    tone: "text-sky-500",
  },
];

function CategoryPanel({ meta, products, selected, onToggle, onToggleAll, query, setQuery }) {
  const Icon = meta.icon;
  const filtered = useMemo(() => {
    if (!query.trim()) return products;
    const q = query.trim().toLowerCase();
    return products.filter((p) =>
      `${p.title} ${p.vendor ?? ""} ${p.id}`.toLowerCase().includes(q)
    );
  }, [products, query]);

  const selectedInCategory = products.filter((p) => selected.has(p.id)).length;
  const allShownSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  return (
    <div className="col-span-1 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col">
      <header className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Icon size={15} className={meta.tone} />
            <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100">{meta.label}</h3>
          </div>
          <span className="text-[11px] text-gray-500 dark:text-slate-400">
            {selectedInCategory} / {products.length}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-snug">{meta.hint}</p>
      </header>

      <div className="p-3 space-y-2 border-b border-gray-100 dark:border-slate-700">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${meta.label.toLowerCase()}…`}
            className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
        {products.length > 0 && (
          <button
            type="button"
            onClick={() => onToggleAll(filtered, !allShownSelected)}
            className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline"
          >
            {allShownSelected ? "Deselect" : "Select"} {query ? "shown" : "all"} ({filtered.length})
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto max-h-72">
        {products.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-gray-400 dark:text-slate-500">
            No {meta.label.toLowerCase()} in this store.
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-gray-400 dark:text-slate-500">
            No matches for "{query}".
          </div>
        ) : (
          <ul>
            {filtered.map((p) => {
              const isSelected = selected.has(p.id);
              const variantCount = p.variants?.length ?? 0;
              return (
                <li key={p.id}>
                  <label
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/40 ${
                      isSelected ? "bg-purple-50/40 dark:bg-purple-900/10" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(p.id)}
                      className="w-3.5 h-3.5 accent-purple-600 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800 dark:text-slate-100 font-medium truncate">{p.title}</p>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400 font-mono truncate">
                        ID {p.id}
                        {variantCount > 1 && ` · ${variantCount} variants`}
                        {p.vendor && ` · ${p.vendor}`}
                      </p>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function CreateEnvForm() {
  const { showToast } = useToast();

  const [storeUrl, setStoreUrl] = useState(() => localStorage.getItem("env_storeUrl") ?? "");
  const [token, setToken]       = useState(() => localStorage.getItem("env_token") ?? "");

  const setStore = (v) => { setStoreUrl(v); localStorage.setItem("env_storeUrl", v); };
  const setTok   = (v) => { setToken(v);    localStorage.setItem("env_token", v); };

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [products, setProducts] = useState([]);

  // Selection sets per category (product IDs)
  const [selected, setSelected] = useState({
    simple:   new Set(),
    variable: new Set(),
    digital:  new Set(),
  });

  // Search queries per category
  const [queries, setQueries] = useState({ simple: "", variable: "", digital: "" });

  const [envOutput, setEnvOutput] = useState("");
  const [copied, setCopied] = useState(false);

  const outputRef = useRef(null);
  useScrollOnTruthy(outputRef, envOutput);

  const bucketed = useMemo(() => {
    const buckets = { simple: [], variable: [], digital: [] };
    for (const p of products) {
      buckets[categoryOf(p)].push(p);
    }
    return buckets;
  }, [products]);

  const fetchProducts = async (e) => {
    if (e) e.preventDefault();
    if (!storeUrl || !token) {
      showToast("Fill Store URL + Access Token first", "error");
      return;
    }
    setLoading(true);
    setError(null);
    setEnvOutput("");
    try {
      const data = await listProductsApi(storeUrl, token, { limit: 250 });
      setProducts(data.products ?? []);
      setSelected({ simple: new Set(), variable: new Set(), digital: new Set() });
      showToast(`Loaded ${data.products?.length ?? 0} products`, "success");
    } catch (err) {
      setError(classifyError(err));
    } finally {
      setLoading(false);
    }
  };

  const toggle = (category, productId) => {
    setSelected((prev) => {
      const nextSet = new Set(prev[category]);
      if (nextSet.has(productId)) nextSet.delete(productId);
      else nextSet.add(productId);
      return { ...prev, [category]: nextSet };
    });
  };

  const toggleAll = (category, list, on) => {
    setSelected((prev) => {
      const nextSet = new Set(prev[category]);
      for (const p of list) {
        if (on) nextSet.add(p.id);
        else nextSet.delete(p.id);
      }
      return { ...prev, [category]: nextSet };
    });
  };

  const missingCategories = CATEGORIES.filter((c) => selected[c.key].size === 0).map((c) => c.label);
  const canGenerate = products.length > 0 && missingCategories.length === 0 && !loading;

  const generate = () => {
    if (!canGenerate) return;
    const lines = CATEGORIES.map((meta) => {
      const ids = selected[meta.key];
      const rows = bucketed[meta.key]
        .filter((p) => ids.has(p.id))
        .flatMap((p) => rowsForProduct(p, meta.key));
      return `${meta.envKey}=${formatRows(rows)}`;
    });
    setEnvOutput(lines.join("\n"));
    setCopied(false);
    showToast("ENV generated", "success");
  };

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(envOutput);
      setCopied(true);
      showToast("Copied to clipboard", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Copy failed — select the text and copy manually", "error");
    }
  };

  return (
    <div className="space-y-5">
      {/* Store credentials */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <form onSubmit={fetchProducts} className="space-y-4">
          <SavedStorePicker onPick={({ storeUrl: u, token: t }) => { setStore(u); setTok(t); }} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">Store URL</label>
              <input
                type="text"
                placeholder="your-store.myshopify.com"
                value={storeUrl}
                onChange={(e) => setStore(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">Access Token</label>
              <input
                type="password"
                placeholder="shpat_..."
                value={token}
                onChange={(e) => setTok(e.target.value)}
                className={inputCls}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2 ${loading ? "opacity-80 cursor-not-allowed pointer-events-none" : "hover:opacity-90"}`}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <FileCode size={18} />}
            {loading ? "Loading products…" : "Fetch products"}
          </button>
        </form>
      </div>

      <ErrorBanner
        error={error}
        onRetry={() => { setError(null); fetchProducts(); }}
        onDismiss={() => setError(null)}
      />

      {/* Three category panels */}
      {products.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {CATEGORIES.map((meta) => (
            <CategoryPanel
              key={meta.key}
              meta={meta}
              products={bucketed[meta.key]}
              selected={selected[meta.key]}
              onToggle={(id) => toggle(meta.key, id)}
              onToggleAll={(list, on) => toggleAll(meta.key, list, on)}
              query={queries[meta.key]}
              setQuery={(v) => setQueries((prev) => ({ ...prev, [meta.key]: v }))}
            />
          ))}
        </div>
      )}

      {/* Generate bar */}
      {products.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 flex items-center justify-between gap-4">
          <div className="text-xs text-gray-600 dark:text-slate-300">
            {missingCategories.length === 0 ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 size={13} />
                Ready — one or more selected in each category
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">
                Pick at least one from: <strong>{missingCategories.join(", ")}</strong>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={!canGenerate}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all flex items-center gap-2"
          >
            <FileCode size={14} />
            Generate ENV
          </button>
        </div>
      )}

      <div ref={outputRef} className="scroll-mt-6" />

      {/* Output */}
      {envOutput && (
        <div className="bg-[#0B1120] border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">ENV output</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Paste into your <code className="font-mono">.env</code> file</p>
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
          <pre className="p-5 text-xs leading-relaxed font-mono text-emerald-300 whitespace-pre-wrap break-all overflow-auto max-h-[500px]">
            {envOutput}
          </pre>
        </div>
      )}
    </div>
  );
}

export default CreateEnvForm;
