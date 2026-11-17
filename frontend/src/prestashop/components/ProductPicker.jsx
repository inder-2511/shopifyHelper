import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Keyboard, Loader2, RefreshCcw, Search, X } from "lucide-react";
import { listProductsApi } from "../api/prestaApi";
import { classifyPrestaError } from "../utils/prestaErrors";
import { inputCls } from "./ui";

// Module-level cache so several pickers (multi-product orders) share one catalog fetch.
const catalogCache = new Map(); // `${shop}::${key}` → { products, ts }
const inFlight = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
const CATALOG_LIMIT = 200; // the backend's page cap

const nameOf = (p) => (typeof p.name === "string" ? p.name : p.name?.[0]?.value ?? `#${p.id}`);
const searchKey = (p) => [nameOf(p), p.id, p.reference].filter(Boolean).join(" ").toLowerCase();
const normalise = (p) => ({ id: String(p.id), name: nameOf(p), reference: p.reference || "", price: p.price, active: String(p.active) === "1" });

/**
 * Searchable product dropdown — the PrestaShop twin of the Shopify helper's VariantPicker.
 * Loads the newest 200 products once; typing also searches the whole catalogue server-side.
 *   onChange(productId, productOrNull)
 */
export default function ProductPicker({ creds, value, valueLabel, onChange, disabled }) {
  const [manual, setManual] = useState(false);
  const [products, setProducts] = useState([]);
  const [remote, setRemote] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlightedRaw] = useState(0);
  const setHighlighted = (v) => setHighlightedRaw(v);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const hasCreds = Boolean(creds.shopUrl && creds.apiKey);
  const cacheKey = `${creds.shopUrl}::${creds.apiKey}`;

  const load = async (force = false) => {
    if (!hasCreds) return;
    const cached = catalogCache.get(cacheKey);
    if (!force && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      setProducts(cached.products);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let pending = force ? null : inFlight.get(cacheKey);
      if (!pending) {
        pending = listProductsApi(creds, { limit: CATALOG_LIMIT }).then(({ products: list }) => {
          const mapped = list.map(normalise);
          catalogCache.set(cacheKey, { products: mapped, ts: Date.now() });
          return mapped;
        });
        inFlight.set(cacheKey, pending);
        pending.catch(() => {}).finally(() => inFlight.get(cacheKey) === pending && inFlight.delete(cacheKey));
      }
      setProducts(await pending);
    } catch (err) {
      setError(classifyPrestaError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetching the catalogue when credentials change is a genuine effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!manual) load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, manual]);

  useEffect(() => {
    const onDown = (e) => wrapperRef.current && !wrapperRef.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Beyond the first 200 products, search the store itself (debounced).
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2 || !hasCreds) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const { products: found } = await listProductsApi(creds, { search: q, limit: 50 });
        if (!cancelled) setRemote(found.map(normalise));
      } catch {
        if (!cancelled) setRemote([]);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open, cacheKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const local = q ? products.filter((p) => searchKey(p).includes(q)) : products;
    const seen = new Set(local.map((p) => p.id));
    // Server-side results only count while the user is actually searching.
    const extra = q.length >= 2 ? remote.filter((p) => !seen.has(p.id)) : [];
    return [...local, ...extra].slice(0, 100);
  }, [products, remote, query]);

  const selected = useMemo(() => products.find((p) => p.id === String(value ?? "")), [products, value]);
  const shownLabel = selected ? selected.name : valueLabel || (value ? `Product ${value}` : "");

  const pick = (p) => {
    onChange(p.id, p);
    setQuery("");
    setOpen(false);
  };
  const clear = () => {
    onChange("", null);
    setQuery("");
    inputRef.current?.focus();
  };

  const onKey = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((i) => Math.min(filtered.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[highlighted]) pick(filtered[highlighted]); }
    else if (e.key === "Escape") setOpen(false);
  };

  if (manual || !hasCreds) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Product ID</span>
          {hasCreds && (
            <button type="button" onClick={() => setManual(false)} className="text-xs text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1">
              <Search size={11} /> Pick from store
            </button>
          )}
        </div>
        <input type="number" min="1" value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value, null)} placeholder="e.g. 12" className={inputCls} />
        {!hasCreds && <p className="text-[11px] text-gray-500 dark:text-slate-500 mt-1">Fill Shop URL + API key above to pick from a searchable list instead.</p>}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
          Product
          {products.length > 0 && <span className="ml-2 font-normal text-gray-400 dark:text-slate-500">{products.length} loaded</span>}
        </span>
        <div className="flex items-center gap-3 text-xs">
          <button type="button" onClick={() => load(true)} disabled={loading} className="text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1">
            <RefreshCcw size={11} className={loading ? "animate-spin" : ""} /> Reload
          </button>
          <button type="button" onClick={() => setManual(true)} className="text-gray-500 dark:text-slate-400 hover:underline flex items-center gap-1">
            <Keyboard size={11} /> Type manually
          </button>
        </div>
      </div>

      <div className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 focus-within:ring-2 focus-within:ring-pink-400 rounded-xl flex items-center">
        <Search size={15} className="ml-3 text-gray-400 dark:text-slate-500 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={open ? query : shownLabel || query}
          onChange={(e) => { setQuery(e.target.value); setHighlighted(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          disabled={disabled}
          placeholder={loading ? "Loading products…" : "Search by name, ID or reference…"}
          className="flex-1 bg-transparent outline-none py-2 px-2.5 text-sm text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 disabled:opacity-60"
        />
        {value && !open && <span className="text-[11px] font-mono text-gray-500 dark:text-slate-400 shrink-0 mr-2">ID {value}</span>}
        {value && (
          <button type="button" onClick={clear} className="p-1 mr-1 rounded hover:bg-gray-100 dark:hover:bg-slate-600" aria-label="Clear product">
            <X size={13} className="text-gray-400" />
          </button>
        )}
        <button type="button" onClick={() => { setOpen((o) => !o); inputRef.current?.focus(); }} className="p-2 text-gray-400 dark:text-slate-500" aria-label="Toggle list">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
        </button>
      </div>

      {error && (
        <p className="mt-1.5 text-[11px] text-red-600 dark:text-red-400">
          Couldn't load products: {error.title}.{" "}
          <button type="button" onClick={() => setManual(true)} className="underline">Type the ID manually</button>.
        </p>
      )}

      {open && !error && (
        <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg max-h-80 overflow-auto">
          {loading && (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-slate-400 flex items-center justify-center gap-2">
              <Loader2 size={13} className="animate-spin" /> Loading products…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
              {query ? `No matches for "${query}"` : "No products in this store"}
            </div>
          )}
          {!loading && filtered.map((p, idx) => (
            <button
              type="button"
              key={p.id}
              onMouseEnter={() => setHighlighted(idx)}
              onClick={() => pick(p)}
              className={`w-full text-left px-3 py-2 border-b border-gray-50 dark:border-slate-700/50 last:border-b-0 flex items-center gap-3 ${idx === highlighted ? "bg-pink-50 dark:bg-pink-900/20" : ""} ${p.id === String(value ?? "") ? "font-semibold" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-slate-100 truncate">{p.name}</p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 font-mono truncate">
                  Product {p.id}{p.reference ? ` · Ref ${p.reference}` : ""}{!p.active ? " · disabled" : ""}
                </p>
              </div>
              {p.price != null && p.price !== "" && (
                <span className="text-xs text-gray-700 dark:text-slate-300 font-medium shrink-0">{Number(p.price).toFixed(2)}</span>
              )}
            </button>
          ))}
          {!loading && products.length >= CATALOG_LIMIT && (
            <div className="px-3 py-2 text-[10px] text-gray-400 dark:text-slate-500 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40">
              Showing the newest {CATALOG_LIMIT} products. Keep typing (2+ letters) to search the whole store.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
