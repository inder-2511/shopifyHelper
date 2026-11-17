import { useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, PackagePlus, RefreshCcw, Search, Trash2, X } from "lucide-react";
import { useActivity } from "../../context/ActivityContext";
import { useToast } from "../../context/ToastContext";
import { usePresta } from "../context/PrestaContext";
import { useOp } from "../hooks/useOp";
import {
  createProductApi, deleteProductApi, duplicateProductApi, fetchProductApi, listProductsApi,
} from "../api/prestaApi";
import {
  Busy, Card, ErrorBanner, Facts, Field, JsonResult, LookupPage, Page, PrestaCredentials, Skipped,
  Spinner, inputCls, primaryBtn, secondaryBtn,
} from "../components/ui";
import { classifyPrestaError } from "../utils/prestaErrors";

const nameOf = (p) => (typeof p.name === "string" ? p.name : p.name?.[0]?.value ?? `#${p.id}`);
const price = (v) => (v == null || v === "" ? "—" : Number(v).toFixed(2));

// ---------------------------------------------------------------------------
// All products (list + per-row duplicate / delete)
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BULK_GAP_MS = 200;

export function ListProductsPage() {
  const { creds } = usePresta();
  const { showToast } = useToast();
  const { addActivity } = useActivity();
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [state, setState] = useState({ loading: false, data: null, error: null });
  const [rowBusy, setRowBusy] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [bulk, setBulk] = useState({ loading: false, verb: "", done: 0, total: 0, failed: [] });

  const load = async (nextOffset = 0, term = search) => {
    setSelected(new Set());
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await listProductsApi(creds, { limit: Math.min(Math.max(Number(limit) || 25, 1), 200), offset: nextOffset, search: term });
      setOffset(nextOffset);
      setState({ loading: false, data, error: null });
    } catch (err) {
      const error = classifyPrestaError(err);
      setState((s) => ({ ...s, loading: false, error }));
      showToast(error.title, "error");
    }
  };

  const onRow = async (kind, p) => {
    if (kind === "delete" && !window.confirm(`Delete "${nameOf(p)}" (ID ${p.id}) from ${creds.shopUrl}? This cannot be undone.`)) return;
    setRowBusy(`${kind}-${p.id}`);
    try {
      if (kind === "delete") {
        await deleteProductApi(creds, String(p.id));
        showToast(`Deleted "${nameOf(p)}"`, "success");
        addActivity("product", `Deleted PrestaShop product #${p.id} on ${creds.shopUrl}`);
      } else {
        const r = await duplicateProductApi(creds, String(p.id));
        showToast(`Duplicated as #${r.product.id}`, "success");
        addActivity("product", `Duplicated PrestaShop product #${p.id} → #${r.product.id}`);
      }
      await load(offset);
    } catch (err) {
      showToast(classifyPrestaError(err).title, "error");
    } finally {
      setRowBusy(null);
    }
  };

  const { loading, data, error } = state;
  const products = data?.products ?? [];
  const allSelected = products.length > 0 && products.every((p) => selected.has(String(p.id)));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleRow = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(products.map((p) => String(p.id))));

  // Bulk delete / duplicate the ticked products, one at a time with a progress bar.
  const runBulk = async (kind) => {
    if (bulk.loading || selected.size === 0) return;
    const targets = products.filter((p) => selected.has(String(p.id)));
    const verb = kind === "delete" ? "Deleting" : "Duplicating";
    if (kind === "delete" && !window.confirm(`Delete ${targets.length} product${targets.length !== 1 ? "s" : ""} from ${creds.shopUrl}? This cannot be undone.`)) return;

    setBulk({ loading: true, verb, done: 0, total: targets.length, failed: [] });
    let ok = 0;
    for (let i = 0; i < targets.length; i++) {
      const p = targets[i];
      if (i > 0) await sleep(BULK_GAP_MS);
      try {
        if (kind === "delete") await deleteProductApi(creds, String(p.id));
        else await duplicateProductApi(creds, String(p.id));
        ok += 1;
        setBulk((b) => ({ ...b, done: b.done + 1 }));
      } catch (err) {
        setBulk((b) => ({ ...b, done: b.done + 1, failed: [...b.failed, { id: p.id, name: nameOf(p), message: classifyPrestaError(err).message }] }));
      }
    }
    addActivity("product", `${kind === "delete" ? "Bulk-deleted" : "Bulk-duplicated"} ${ok} of ${targets.length} PrestaShop products on ${creds.shopUrl}`);
    setBulk((b) => ({ ...b, loading: false }));
    showToast(`${ok} ${kind === "delete" ? "deleted" : "duplicated"}${ok < targets.length ? ` — ${targets.length - ok} failed` : ""}`, ok === targets.length ? "success" : "error");
    await load(kind === "delete" && ok === products.length ? Math.max(0, offset - Number(limit)) : offset);
  };

  const busy = !!rowBusy || bulk.loading;

  return (
    <Page title="All Products" subtitle="Browse and manage products across a PrestaShop store (newest first) — tick rows to delete or duplicate in bulk">
      <form onSubmit={(e) => { e.preventDefault(); load(0); }} className="space-y-5">
        <PrestaCredentials />
        <Card>
          <div className="flex gap-3 items-end">
            <Field label="Search by name (optional)" className="flex-1">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. mug" className={inputCls} />
            </Field>
            <Field label="Page size" className="w-28">
              <input type="number" min={1} max={200} value={limit} onChange={(e) => setLimit(e.target.value)} className={inputCls} />
            </Field>
            <button type="submit" disabled={loading} className={primaryBtn}>
              {loading ? <Spinner /> : <RefreshCcw size={15} />} {data ? "Reload" : "Fetch Products"}
            </button>
          </div>
        </Card>
      </form>

      <ErrorBanner error={error} onRetry={() => load(offset)} onDismiss={() => setState((s) => ({ ...s, error: null }))} />

      {bulk.loading && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-slate-300 mb-2">
            <span className="flex items-center gap-2"><Spinner size={13} /> {bulk.verb} {Math.min(bulk.done + 1, bulk.total)} of {bulk.total}…</span>
            <span>{Math.round((bulk.done / bulk.total) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-200 ${bulk.verb === "Deleting" ? "bg-gradient-to-r from-red-500 to-red-600" : "bg-gradient-to-r from-pink-500 to-rose-500"}`} style={{ width: `${(bulk.done / bulk.total) * 100}%` }} />
          </div>
        </div>
      )}

      {!bulk.loading && bulk.failed.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2 font-semibold mb-1"><AlertTriangle size={14} /> {bulk.failed.length} failed</div>
          <ul className="text-xs list-disc list-inside space-y-0.5">
            {bulk.failed.slice(0, 5).map((f) => <li key={f.id}><span className="font-medium">{f.name}</span> — {f.message}</li>)}
            {bulk.failed.length > 5 && <li>…and {bulk.failed.length - 5} more</li>}
          </ul>
          <button onClick={() => setBulk((b) => ({ ...b, failed: [] }))} className="mt-2 text-xs underline hover:no-underline">Dismiss</button>
        </div>
      )}

      {data && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {selected.size > 0 && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-pink-50 dark:bg-pink-900/20 border-b border-pink-200 dark:border-pink-800/50">
              <div className="flex items-center gap-3 text-sm text-pink-700 dark:text-pink-300">
                <span className="font-semibold">{selected.size} selected</span>
                <button onClick={() => setSelected(new Set())} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-pink-200 dark:border-pink-800/60">
                  <X size={11} /> Clear
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => runBulk("duplicate")} disabled={busy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-xs font-semibold transition-all">
                  <Copy size={12} /> Duplicate {selected.size}
                </button>
                <button onClick={() => runBulk("delete")} disabled={busy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold transition-all">
                  {bulk.loading && bulk.verb === "Deleting" ? <Spinner size={12} /> : <Trash2 size={12} />} Delete {selected.size}
                </button>
              </div>
            </div>
          )}

          {products.length === 0 ? (
            <p className="text-center py-10 text-sm text-gray-400 dark:text-slate-500">No products found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900/40 border-b border-gray-100 dark:border-slate-700">
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  <th className="pl-4 pr-2 py-2.5 w-8">
                    <input type="checkbox" checked={allSelected} ref={(el) => { if (el) el.indeterminate = someSelected; }} onChange={toggleAll} className="w-4 h-4 accent-pink-600 cursor-pointer" aria-label="Select all" />
                  </th>
                  <th className="px-4 py-2 font-semibold">ID</th>
                  <th className="px-4 py-2 font-semibold">Name</th>
                  <th className="px-4 py-2 font-semibold">Reference</th>
                  <th className="px-4 py-2 font-semibold text-right">Price (excl.)</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const isSelected = selected.has(String(p.id));
                  return (
                    <tr key={p.id} className={`border-b border-gray-50 dark:border-slate-700/50 transition-colors ${isSelected ? "bg-pink-50/50 dark:bg-pink-900/10" : "hover:bg-gray-50 dark:hover:bg-slate-700/30"}`}>
                      <td className="pl-4 pr-2 py-2">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleRow(p.id)} disabled={bulk.loading} className="w-4 h-4 accent-pink-600 cursor-pointer disabled:cursor-not-allowed" aria-label={`Select ${nameOf(p)}`} />
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-500 dark:text-slate-400">{p.id}</td>
                      <td className="px-4 py-2 text-gray-800 dark:text-slate-100 font-medium">{nameOf(p)}</td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-slate-300">{p.reference || "—"}</td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-slate-200">{price(p.price)}</td>
                      <td className="px-4 py-2">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${String(p.active) === "1" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400"}`}>
                          {String(p.active) === "1" ? "active" : "disabled"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1.5">
                          <button disabled={busy} onClick={() => onRow("duplicate", p)} title="Duplicate" className={secondaryBtn}>
                            {rowBusy === `duplicate-${p.id}` ? <Spinner size={12} /> : <Copy size={12} />}
                          </button>
                          <button disabled={busy} onClick={() => onRow("delete", p)} title="Delete" className="px-3 py-1.5 rounded-lg text-xs bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400">
                            {rowBusy === `delete-${p.id}` ? <Spinner size={12} /> : <Trash2 size={12} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-700 text-xs text-gray-500 dark:text-slate-400">
            <span>
              Showing {products.length ? `${offset + 1}–${offset + products.length}` : 0}
              {selected.size > 0 && ` • ${selected.size} selected`}
            </span>
            <div className="flex gap-2">
              <button disabled={loading || busy || offset === 0} onClick={() => load(Math.max(0, offset - Number(limit)))} className={secondaryBtn}><ChevronLeft size={12} /> Prev</button>
              <button disabled={loading || busy || !data.hasMore} onClick={() => load(offset + Number(limit))} className={secondaryBtn}>Next <ChevronRight size={12} /></button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Create product
// ---------------------------------------------------------------------------
export function CreateProductPage() {
  const { creds, reference } = usePresta();
  const { addActivity } = useActivity();
  const op = useOp(createProductApi, { successToast: (r) => `Created "${nameOf(r.product)}" (#${r.product.id})` });
  const [f, setF] = useState({
    name: "", price: "10", reference: "", quantity: "10", weight: "0.5",
    categoryId: "", taxRulesGroupId: "", ean13: "", descriptionShort: "", description: "", active: true,
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const ref = reference.data && reference.forShop === creds.shopUrl ? reference.data : null;
  const cats = (ref?.categories?.items ?? []).filter((c) => c.active);
  const taxes = (ref?.taxGroups?.items ?? []).filter((c) => c.active);

  const submit = async (e) => {
    e.preventDefault();
    const r = await op.run(creds, {
      name: f.name, price: Number(f.price), reference: f.reference, quantity: Number(f.quantity) || 0,
      weight: Number(f.weight) || 0, ean13: f.ean13, description: f.description, descriptionShort: f.descriptionShort,
      active: f.active,
      ...(f.categoryId ? { categoryId: Number(f.categoryId) } : {}),
      ...(f.taxRulesGroupId ? { taxRulesGroupId: Number(f.taxRulesGroupId) } : {}),
    });
    if (r) addActivity("product", `Created PrestaShop product #${r.product.id} on ${creds.shopUrl}`);
  };

  return (
    <Page title="Create Product" subtitle="Create a simple product with stock in a PrestaShop store">
      <form onSubmit={submit} className="space-y-5">
        <PrestaCredentials />
        <Card>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Name" className="col-span-2"><input required value={f.name} onChange={set("name")} placeholder="Test mug" className={inputCls} /></Field>
            <Field label="Reference (SKU)"><input value={f.reference} onChange={set("reference")} className={inputCls} /></Field>
            <Field label="Price (tax excl.)"><input type="number" min="0" step="0.01" required value={f.price} onChange={set("price")} className={inputCls} /></Field>
            <Field label="Quantity in stock"><input type="number" min="0" value={f.quantity} onChange={set("quantity")} className={inputCls} /></Field>
            <Field label="Weight (kg)"><input type="number" min="0" step="0.001" value={f.weight} onChange={set("weight")} className={inputCls} /></Field>
            <Field label="Category" hint={cats.length ? "" : "Empty = Home (ID 2). Load store data on Create Order to pick from a list."}>
              {cats.length ? (
                <select value={f.categoryId} onChange={set("categoryId")} className={inputCls}>
                  <option value="">— Home (default) —</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name} — #{c.id}</option>)}
                </select>
              ) : (
                <input type="number" min="1" value={f.categoryId} onChange={set("categoryId")} placeholder="2" className={inputCls} />
              )}
            </Field>
            <Field label="Tax rule group">
              {taxes.length ? (
                <select value={f.taxRulesGroupId} onChange={set("taxRulesGroupId")} className={inputCls}>
                  <option value="">— none —</option>
                  {taxes.map((c) => <option key={c.id} value={c.id}>{c.name} — #{c.id}</option>)}
                </select>
              ) : (
                <input type="number" min="0" value={f.taxRulesGroupId} onChange={set("taxRulesGroupId")} placeholder="0 = no tax" className={inputCls} />
              )}
            </Field>
            <Field label="EAN-13 (optional)"><input value={f.ean13} onChange={set("ean13")} maxLength={13} className={inputCls} /></Field>
            <Field label="Short description" className="col-span-3"><input value={f.descriptionShort} onChange={set("descriptionShort")} className={inputCls} /></Field>
            <Field label="Description (HTML)" className="col-span-3"><textarea rows={3} value={f.description} onChange={set("description")} className={inputCls} /></Field>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
              <input type="checkbox" checked={f.active} onChange={set("active")} className="accent-pink-600" /> Enabled (visible in the shop)
            </label>
          </div>
        </Card>
        <button type="submit" disabled={op.loading} className={primaryBtn}>
          {op.loading ? <Spinner /> : <PackagePlus size={15} />} {op.loading ? "Creating…" : "Create product"}
        </button>
      </form>

      {op.loading && <Busy>Creating product and setting stock…</Busy>}
      <ErrorBanner error={op.error} onDismiss={op.clearError} />
      {op.result && (
        <JsonResult
          title={`${nameOf(op.result.product)} — ID ${op.result.product.id}`}
          data={op.result.product} filename={`presta-product-${op.result.product.id}.json`}
          summary={<>
            <Facts items={[{ label: "ID", value: op.result.product.id }, { label: "Price", value: price(op.result.product.price) }, { label: "Stock", value: op.result.stock.updated ? op.result.stock.quantity : op.result.stock.reason }]} />
            <div className="p-3"><Skipped dropped={op.result.dropped} /></div>
          </>}
        />
      )}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Fetch / duplicate / delete
// ---------------------------------------------------------------------------
export function FetchProductPage() {
  const op = useOp(fetchProductApi, { successToast: (r) => `Fetched "${nameOf(r.product)}"` });
  return (
    <LookupPage
      title="Fetch Product" subtitle="Look up a product by ID, reference (SKU) or name and view its JSON"
      label="Product ID, reference or name" placeholder="12, W-1 or Test mug"
      buttonLabel="Fetch" busyLabel="Fetching…" buttonIcon={Search} op={op} run={op.run}
    >
      {({ product, quantity }) => (
        <JsonResult
          title={`${nameOf(product)} — ID ${product.id}`} data={product} filename={`presta-product-${product.id}.json`}
          summary={<Facts items={[
            { label: "Status", value: String(product.active) === "1" ? "active" : "disabled" },
            { label: "Reference", value: product.reference || "—" },
            { label: "Price (excl.)", value: price(product.price) },
            { label: "Stock", value: quantity },
          ]} />}
        />
      )}
    </LookupPage>
  );
}

export function DuplicateProductPage() {
  const { addActivity } = useActivity();
  const op = useOp(duplicateProductApi, { successToast: (r) => `Duplicated "${nameOf(r.source)}" → #${r.product.id}` });
  const run = async (c, id) => {
    const r = await op.run(c, id);
    if (r) addActivity("product", `Duplicated PrestaShop product #${r.source.id} → #${r.product.id} on ${c.shopUrl}`);
  };
  return (
    <LookupPage
      title="Duplicate Product" subtitle="Clone a product as a disabled copy (with its categories, features and stock)"
      label="Product ID, reference or name" placeholder="12, W-1 or Test mug"
      buttonLabel="Duplicate" busyLabel="Duplicating…" buttonIcon={Copy} op={op} run={run}
    >
      {(r) => (
        <JsonResult
          title={`"${nameOf(r.source)}" (#${r.source.id}) → #${r.product.id}`} data={r} filename={`presta-product-${r.product.id}.json`}
          summary={<>
            <Facts items={[{ label: "New ID", value: r.product.id }, { label: "Status", value: "disabled (copy)" }, { label: "Stock copied", value: r.stock.updated ? r.stock.quantity : r.stock.reason }]} />
            <div className="p-3"><Skipped skipped={r.skipped} dropped={r.dropped} /></div>
          </>}
        />
      )}
    </LookupPage>
  );
}

export function DeleteProductPage() {
  const { addActivity } = useActivity();
  const op = useOp(deleteProductApi, { successToast: (r) => `Deleted "${r.name}"` });
  const run = async (c, id) => {
    const r = await op.run(c, id);
    if (r) addActivity("product", `Deleted PrestaShop product #${r.id} on ${c.shopUrl}`);
  };
  return (
    <LookupPage
      title="Delete Product" subtitle="Permanently delete a product from the store"
      label="Product ID, reference or name" placeholder="12, W-1 or Test mug"
      buttonLabel="Delete" busyLabel="Deleting…" buttonIcon={Trash2} op={op} run={run} danger
      confirm={(v) => `Delete product "${v}"? This cannot be undone.`}
    >
      {(r) => <JsonResult title={`Deleted "${r.name}" — ID ${r.id}`} data={r} filename={`presta-deleted-${r.id}.json`} />}
    </LookupPage>
  );
}
