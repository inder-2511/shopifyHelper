import { useState } from "react";
import { CheckCircle2, Database, PlugZap, Search, UploadCloud, XCircle } from "lucide-react";
import { useActivity } from "../../context/ActivityContext";
import { usePresta } from "../context/PrestaContext";
import { useOp } from "../hooks/useOp";
import { importProductsApi, listResourceApi, testConnectionApi } from "../api/prestaApi";
import {
  Busy, Card, ErrorBanner, Facts, Field, JsonResult, Page, PrestaCredentials, Spinner, inputCls, primaryBtn, secondaryBtn,
} from "../components/ui";

const LISTS = [
  ["countries", "Countries"], ["zones", "Zones"], ["carriers", "Carriers"], ["orderStates", "Order statuses"],
  ["currencies", "Currencies"], ["languages", "Languages"], ["categories", "Categories"], ["taxGroups", "Tax rule groups"],
];

function RefTable({ label, list }) {
  const items = list?.items ?? [];
  return (
    <details className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-200 flex items-center justify-between bg-gray-50 dark:bg-slate-900/40">
        <span>{label}</span>
        {list?.error
          ? <span className="text-[11px] text-red-600 dark:text-red-400">{list.status ?? ""} {list.error.slice(0, 60)}</span>
          : <span className="text-[11px] text-gray-500 dark:text-slate-400">{items.length}</span>}
      </summary>
      {items.length > 0 && (
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-xs">
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-gray-100 dark:border-slate-700/50">
                  <td className="px-4 py-1.5 font-mono text-gray-500 dark:text-slate-400 w-14">{i.id}</td>
                  <td className="px-2 py-1.5 text-gray-800 dark:text-slate-100">{i.name}{i.iso ? ` (${i.iso})` : ""}</td>
                  <td className="px-4 py-1.5 text-right text-gray-400 dark:text-slate-500">{i.active === false ? "inactive" : i.paid ? "paid" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}

export function StoreInfoPage() {
  const { creds, reference, loadReference } = usePresta();
  const testOp = useOp(testConnectionApi);
  const exploreOp = useOp(listResourceApi);
  const [explore, setExplore] = useState({ resource: "products", limit: 10, field: "", value: "" });
  const ref = reference.data && reference.forShop === creds.shopUrl ? reference.data : null;

  const runExplore = (e) => {
    e.preventDefault();
    exploreOp.run(creds, {
      resource: explore.resource.trim(), limit: Number(explore.limit) || 10,
      filters: explore.field ? { [explore.field.trim()]: explore.value } : {},
    });
  };

  return (
    <Page title="Store Info" subtitle="Check the connection, see what the API key can reach, and browse any resource">
      <PrestaCredentials>
        <div className="flex gap-3">
          <button type="button" disabled={testOp.loading} onClick={() => testOp.run(creds)} className={primaryBtn}>
            {testOp.loading ? <Spinner /> : <PlugZap size={15} />} Test connection
          </button>
          <button type="button" disabled={reference.loading} onClick={() => loadReference().catch(() => {})} className={secondaryBtn}>
            {reference.loading ? <Spinner size={12} /> : <Database size={12} />} Load store data
          </button>
        </div>
      </PrestaCredentials>

      <ErrorBanner error={testOp.error} onDismiss={testOp.clearError} />
      {testOp.result && (
        <Card>
          <div className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400 mb-3">
            <CheckCircle2 size={16} /> Connected to {testOp.result.shop}
            {testOp.result.version && <span className="font-mono text-xs text-gray-500 dark:text-slate-400">PrestaShop {testOp.result.version}</span>}
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
            This key can see {testOp.result.resources.length} resources (click one to browse it below):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {testOp.result.resources.map((r) => (
              <button key={r} type="button" onClick={() => setExplore((s) => ({ ...s, resource: r }))}
                className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800/60 hover:bg-pink-100 dark:hover:bg-pink-900/50">
                {r}
              </button>
            ))}
          </div>
        </Card>
      )}

      {reference.error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400"><XCircle size={15} /> Couldn't load store data: {reference.error.response?.data?.error ?? reference.error.message}</div>
      )}
      {ref && (
        <Card title="Store data">
          <div className="grid grid-cols-2 gap-3">
            {LISTS.map(([key, label]) => <RefTable key={key} label={label} list={ref[key]} />)}
          </div>
        </Card>
      )}

      <form onSubmit={runExplore}>
        <Card title="Resource explorer (read-only)">
          <div className="grid grid-cols-[1fr_90px_1fr_1fr_auto] gap-3 items-end">
            <Field label="Resource"><input value={explore.resource} onChange={(e) => setExplore({ ...explore, resource: e.target.value })} placeholder="products" className={inputCls} /></Field>
            <Field label="Limit"><input type="number" min="1" max="200" value={explore.limit} onChange={(e) => setExplore({ ...explore, limit: e.target.value })} className={inputCls} /></Field>
            <Field label="Filter field (optional)"><input value={explore.field} onChange={(e) => setExplore({ ...explore, field: e.target.value })} placeholder="reference" className={inputCls} /></Field>
            <Field label="Equals"><input value={explore.value} onChange={(e) => setExplore({ ...explore, value: e.target.value })} className={inputCls} /></Field>
            <button type="submit" disabled={exploreOp.loading} className={primaryBtn}>{exploreOp.loading ? <Spinner /> : <Search size={15} />} Fetch</button>
          </div>
        </Card>
      </form>
      <ErrorBanner error={exploreOp.error} onDismiss={exploreOp.clearError} />
      {exploreOp.result && (
        <JsonResult title={`${explore.resource} — ${exploreOp.result.rows.length} row(s)`} data={exploreOp.result.rows} filename={`presta-${explore.resource}.json`} />
      )}
    </Page>
  );
}

export function ImportProductsPage() {
  const { creds } = usePresta();
  const { addActivity } = useActivity();
  const op = useOp(importProductsApi, { successToast: (r) => `Imported ${r.created.length} of ${r.total} products` });
  const [categoryId, setCategoryId] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const r = await op.run(creds, categoryId ? { categoryId: Number(categoryId) } : {});
    if (r) addActivity("store", `Imported ${r.created.length}/${r.total} products into PrestaShop ${creds.shopUrl}`);
  };

  return (
    <Page title="Import Products" subtitle="Create the products from backend/csv/products.csv (the same file the Shopify import uses)">
      <form onSubmit={submit} className="space-y-5">
        <PrestaCredentials />
        <Card>
          <div className="flex gap-3 items-end">
            <Field label="Category ID (optional)" hint="Empty = Home (ID 2)" className="w-64">
              <input type="number" min="1" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} placeholder="2" className={inputCls} />
            </Field>
            <button type="submit" disabled={op.loading} className={primaryBtn}>
              {op.loading ? <Spinner /> : <UploadCloud size={15} />} {op.loading ? "Importing…" : "Import products"}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-3">
            PrestaShop has no variants without combination setup, so every variant row becomes its own simple product, named “Title (Option)”. Images, vendors and Shopify categories are not imported.
          </p>
        </Card>
      </form>

      {op.loading && <Busy>Creating products one by one — this can take a minute…</Busy>}
      <ErrorBanner error={op.error} onDismiss={op.clearError} />
      {op.result && (
        <JsonResult
          title={`Imported ${op.result.created.length} of ${op.result.total}`} data={op.result} filename="presta-import.json"
          summary={<Facts items={[{ label: "Created", value: op.result.created.length }, { label: "Failed", value: op.result.failed.length }]} />}
        />
      )}
    </Page>
  );
}
