import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Loader2, RefreshCcw, X, ChevronDown, Keyboard } from "lucide-react";
import { listProductsApi } from "../../api/productApi";
import { classifyError } from "../../utils/errorClassifier";

// Module-level cache so switching between forms doesn't re-fetch.
const catalogCache = new Map(); // key: `${storeUrl}::${token}` → { variants, ts }
// In-flight requests, so several pickers mounting at once (multi-product orders)
// share one catalog fetch instead of firing N identical ones.
const inFlight = new Map();     // key: `${storeUrl}::${token}` → Promise<variants>
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchAllVariants(storeUrl, token) {
  // Pull up to Shopify's max page size (250) once. That's usually enough for a dev store.
  const data = await listProductsApi(storeUrl, token, { limit: 250 });
  return (data.products ?? []).flatMap((p) =>
    (p.variants ?? []).map((v) => ({
      variantId: String(v.id),
      variantTitle: v.title,
      sku: v.sku,
      price: v.price,
      productId: String(p.id),
      productTitle: p.title,
      status: p.status,
      searchKey: [p.title, v.title, v.id, p.id, v.sku, p.product_type, p.vendor]
        .filter(Boolean)
        .map(String)
        .join(" ")
        .toLowerCase(),
    }))
  );
}

function VariantPicker({ storeUrl, token, value, onChange, disabled }) {
  const [manual, setManual] = useState(false);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const cacheKey = `${storeUrl}::${token}`;

  const load = async (force = false) => {
    if (!storeUrl || !token) return;
    const cached = catalogCache.get(cacheKey);
    if (!force && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      setVariants(cached.variants);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let pending = force ? null : inFlight.get(cacheKey);
      if (!pending) {
        pending = fetchAllVariants(storeUrl, token).then((list) => {
          catalogCache.set(cacheKey, { variants: list, ts: Date.now() });
          return list;
        });
        inFlight.set(cacheKey, pending);
        pending.catch(() => {}).finally(() => {
          if (inFlight.get(cacheKey) === pending) inFlight.delete(cacheKey);
        });
      }
      setVariants(await pending);
    } catch (err) {
      setError(classifyError(err));
    } finally {
      setLoading(false);
    }
  };

  // Load once creds are present (and reload if they change).
  useEffect(() => {
    if (!manual) load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, manual]);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = useMemo(
    () => variants.find((v) => v.variantId === String(value ?? "")),
    [variants, value]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return variants.slice(0, 100);
    const q = query.trim().toLowerCase();
    return variants
      .filter((v) => v.searchKey.includes(q))
      .slice(0, 100);
  }, [variants, query]);

  useEffect(() => {
    setHighlighted(0);
  }, [query, open]);

  const pick = (v) => {
    onChange(v.variantId);
    setQuery("");
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    setQuery("");
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlighted]) pick(filtered[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const hasCreds = storeUrl && token;

  // Manual entry OR fallback if no creds yet
  if (manual || !hasCreds) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="font-semibold text-gray-700 dark:text-slate-300 text-sm">Variant ID</label>
          {hasCreds && (
            <button
              type="button"
              onClick={() => setManual(false)}
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
            >
              <Search size={11} />
              Pick from store
            </button>
          )}
        </div>
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="42845809213488"
          className="w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 focus:border-purple-500 outline-none rounded-xl py-2.5 px-3 text-sm text-gray-800 dark:text-slate-100 transition-colors disabled:opacity-60"
        />
        {!hasCreds && (
          <p className="text-[11px] text-gray-500 dark:text-slate-500 mt-1">
            Fill Store URL + Access Token above to pick from a searchable list instead.
          </p>
        )}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <label className="font-semibold text-gray-700 dark:text-slate-300 text-sm">
          Product / Variant
          {variants.length > 0 && (
            <span className="ml-2 font-normal text-gray-400 dark:text-slate-500 text-xs">
              {variants.length} variant{variants.length !== 1 && "s"} loaded
            </span>
          )}
        </label>
        <div className="flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => load(true)}
            className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
            disabled={loading}
          >
            <RefreshCcw size={11} className={loading ? "animate-spin" : ""} />
            Reload
          </button>
          <button
            type="button"
            onClick={() => setManual(true)}
            className="text-gray-500 dark:text-slate-400 hover:underline flex items-center gap-1"
          >
            <Keyboard size={11} />
            Type manually
          </button>
        </div>
      </div>

      {/* Trigger / selected display */}
      <div
        className="w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 focus-within:border-purple-500 rounded-xl transition-colors flex items-center"
      >
        <Search size={16} className="ml-3 text-gray-400 dark:text-slate-500 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={open ? query : (selected ? `${selected.productTitle}${selected.variantTitle && selected.variantTitle !== "Default Title" ? ` — ${selected.variantTitle}` : ""}` : query)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          disabled={disabled}
          placeholder={loading ? "Loading products…" : "Search by name, variant, ID, or SKU…"}
          className="flex-1 bg-transparent outline-none py-2.5 px-2.5 text-sm text-gray-800 dark:text-slate-100 disabled:opacity-60"
        />
        {selected && !open && (
          <span className="text-[11px] font-mono text-gray-500 dark:text-slate-400 shrink-0 mr-2">
            ID {selected.variantId}
          </span>
        )}
        {selected && (
          <button type="button" onClick={clear} className="p-1 mr-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700">
            <X size={13} className="text-gray-400" />
          </button>
        )}
        <button
          type="button"
          onClick={() => { setOpen((o) => !o); inputRef.current?.focus(); }}
          className="p-2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
          Couldn't load products: {error.title}. <button type="button" onClick={() => setManual(true)} className="underline">Type ID manually</button>.
        </p>
      )}

      {/* Dropdown */}
      {open && !error && (
        <div
          ref={listRef}
          className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg max-h-80 overflow-auto"
        >
          {loading && (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-slate-400 flex items-center justify-center gap-2">
              <Loader2 size={13} className="animate-spin" />
              Loading products…
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
              {query ? `No matches for "${query}"` : "No products in this store"}
            </div>
          )}

          {!loading && filtered.map((v, idx) => {
            const isActive = idx === highlighted;
            const isSelected = v.variantId === String(value ?? "");
            const label = v.variantTitle && v.variantTitle !== "Default Title"
              ? `${v.productTitle} — ${v.variantTitle}`
              : v.productTitle;
            return (
              <button
                type="button"
                key={v.variantId}
                onMouseEnter={() => setHighlighted(idx)}
                onClick={() => pick(v)}
                className={`w-full text-left px-3 py-2 border-b border-gray-50 dark:border-slate-700/50 last:border-b-0 flex items-center gap-3 ${
                  isActive ? "bg-purple-50 dark:bg-purple-900/20" : ""
                } ${isSelected ? "font-semibold" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-slate-100 truncate">{label}</p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 font-mono truncate">
                    Variant {v.variantId} · Product {v.productId}{v.sku ? ` · SKU ${v.sku}` : ""}
                    {v.status !== "active" && ` · ${v.status}`}
                  </p>
                </div>
                {v.price && (
                  <span className="text-xs text-gray-700 dark:text-slate-300 font-medium shrink-0">
                    ${v.price}
                  </span>
                )}
              </button>
            );
          })}

          {!loading && variants.length >= 250 && (
            <div className="px-3 py-2 text-[10px] text-gray-400 dark:text-slate-500 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40">
              Showing first 250 products. Type to search; if you need a specific one and it's not here, click "Type manually".
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VariantPicker;
