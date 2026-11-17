import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Hash, Loader2, Plus, RefreshCcw, Save, Search, ShoppingBag, SlidersHorizontal, Trash2, XCircle } from "lucide-react";
import { useActivity } from "../../context/ActivityContext";
import { useSavedAddresses } from "../../context/SavedAddressesContext";
import { usePresta } from "../context/PrestaContext";
import { usePrestaOps } from "../context/PrestaOpsContext";
import { useOp } from "../hooks/useOp";
import { duplicateOrderApi, fetchOrderApi, updateOrderApi, createOrderApi } from "../api/prestaApi";
import { presetOptions, randomCustomer, resolveAddressChoice } from "../utils/prestaAddresses";
import {
  Card, ErrorBanner, Facts, Field, JsonResult, LookupPage, Page, PrestaCredentials, Skipped,
  Spinner, inputCls, primaryBtn, secondaryBtn,
} from "../components/ui";
import ProductPicker from "../components/ProductPicker";
import OrderResultsPanel from "../components/OrderResultsPanel";

const gradientBtn = (disabled) =>
  `flex-1 bg-gradient-to-r from-pink-600 to-rose-500 text-white py-3 rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2 ${disabled ? "opacity-80 cursor-not-allowed pointer-events-none" : "hover:opacity-90"}`;

const cancelBtn =
  "px-5 py-3 rounded-xl text-base font-semibold border-2 border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center gap-2 shrink-0";

/** A <select> when the store's list is loaded, a plain number box when it isn't. */
function RefSelect({ items, value, onChange, placeholder, required }) {
  const usable = (items?.items ?? []).filter((i) => i.active !== false);
  if (!usable.length) {
    return (
      <input type="number" min="1" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={items?.error ? `ID (${items.status ?? "error"}: ${items.error.slice(0, 40)})` : "ID — store data not loaded"}
        required={required} className={inputCls} />
    );
  }
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} required={required} className={inputCls}>
      <option value="">{placeholder}</option>
      {usable.map((i) => (
        <option key={i.id} value={i.id}>
          {i.name}{i.iso ? ` (${i.iso})` : ""} — #{i.id}
        </option>
      ))}
    </select>
  );
}

/** Loads carriers / statuses / countries… as soon as a Shop URL + key are entered. */
function useAutoReference() {
  const { creds, reference, loadReference } = usePresta();
  const tried = useRef("");
  useEffect(() => {
    if (!creds.shopUrl || !creds.apiKey) return undefined;
    if (reference.loading || (reference.data && reference.forShop === creds.shopUrl)) return undefined;
    const key = `${creds.shopUrl}::${creds.apiKey}`;
    if (tried.current === key) return undefined;
    const t = setTimeout(() => {
      tried.current = key;
      loadReference().catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [creds, reference.loading, reference.data, reference.forShop, loadReference]);
}

function ReferenceBar() {
  const { reference, loadReference, creds } = usePresta();
  const loaded = reference.data && reference.forShop === creds.shopUrl;
  return (
    <div className="flex items-center justify-between pt-1">
      <p className="text-xs text-gray-500 dark:text-slate-400">
        {reference.loading
          ? "Loading carriers, statuses, countries and currencies…"
          : loaded
            ? `Store data loaded from ${reference.forShop} — carriers, statuses, countries and currencies are selectable below.`
            : "Store data (carriers, statuses, countries, currencies) loads automatically once the URL and key are filled."}
      </p>
      <button type="button" disabled={reference.loading || !creds.shopUrl || !creds.apiKey} onClick={() => loadReference().catch(() => {})} className={secondaryBtn}>
        {reference.loading ? <Spinner size={12} /> : <RefreshCcw size={12} />}
        {loaded ? "Reload store data" : "Load store data"}
      </button>
    </div>
  );
}

const orderFacts = (o) => [
  { label: "Order ID", value: o.id },
  { label: "Reference", value: o.reference },
  { label: "Status ID", value: o.current_state },
  { label: "Total (incl. tax)", value: o.total_paid_tax_incl ? Number(o.total_paid_tax_incl).toFixed(2) : null },
  { label: "Rows", value: o.associations?.order_rows?.length ?? 0 },
];

// ---------------------------------------------------------------------------
// Product rows (remembered between visits, like the Shopify helper)
// ---------------------------------------------------------------------------
const ROWS_KEY = "presta_order_rows";
const OPTS_KEY = "presta_order_opts";

let rowSeq = 0;
const makeRow = (o = {}) => ({
  key: `row-${rowSeq++}`, productId: "", productName: "", listPrice: "", combinationId: "", quantity: 1, price: "", ...o,
});

const readJson = (key, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null");
    return v ?? fallback;
  } catch {
    return fallback;
  }
};

function useOrderRows() {
  const [items, setItems] = useState(() => {
    const saved = readJson(ROWS_KEY, null);
    return Array.isArray(saved) && saved.length ? saved.map(makeRow) : [makeRow()];
  });
  useEffect(() => {
    localStorage.setItem(ROWS_KEY, JSON.stringify(items.map((r) => ({ productId: r.productId, productName: r.productName, listPrice: r.listPrice, combinationId: r.combinationId, quantity: r.quantity, price: r.price }))));
  }, [items]);
  return {
    items,
    update: (key, patch) => setItems((p) => p.map((r) => (r.key === key ? { ...r, ...patch } : r))),
    add: () => setItems((p) => [...p, makeRow()]),
    remove: (key) => setItems((p) => (p.length > 1 ? p.filter((r) => r.key !== key) : p)),
    incomplete: items.some((r) => String(r.productId ?? "").trim() === ""),
  };
}

function ProductRows({ rows, creds, disabled }) {
  const { items, update, add, remove, incomplete } = rows;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-gray-700 dark:text-slate-300 text-sm">
          Line items
          <span className="ml-2 font-normal text-gray-400 dark:text-slate-500 text-xs">
            {items.length} product{items.length !== 1 && "s"} per order
          </span>
        </span>
        <button type="button" onClick={add} disabled={disabled} className="text-xs font-semibold text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1 disabled:opacity-50">
          <Plus size={13} /> Add product
        </button>
      </div>

      <div className="space-y-3">
        {items.map((row, idx) => (
          <div key={row.key} className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-900/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">Product {idx + 1}</span>
              {items.length > 1 && (
                <button type="button" onClick={() => remove(row.key)} disabled={disabled} title="Remove this product" className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3">
                <ProductPicker
                  creds={creds}
                  value={row.productId}
                  valueLabel={row.productName}
                  disabled={disabled}
                  onChange={(id, p) => update(row.key, { productId: id, productName: p?.name ?? "", listPrice: p?.price ?? "" })}
                />
              </div>
              <Field label="Quantity">
                <input type="number" min={1} value={row.quantity} disabled={disabled} onChange={(e) => update(row.key, { quantity: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Price (excl. tax)" hint="Blank = the product's own price">
                <input type="number" min="0" step="0.01" value={row.price} disabled={disabled} onChange={(e) => update(row.key, { price: e.target.value })}
                  placeholder={row.listPrice !== "" ? Number(row.listPrice).toFixed(2) : "product price"} className={inputCls} />
              </Field>
              <Field label="Combination ID" hint="Optional — for products with variants">
                <input type="number" min="0" value={row.combinationId} disabled={disabled} onChange={(e) => update(row.key, { combinationId: e.target.value })} placeholder="0" className={inputCls} />
              </Field>
            </div>
          </div>
        ))}
      </div>
      {incomplete && <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">Pick a product (or enter an ID) for every line item before creating the order.</p>}
    </div>
  );
}

function CountField({ label, hint, value, onChange }) {
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <Hash className="absolute left-3 top-2.5 text-gray-400 dark:text-slate-500" size={16} />
        <input type="number" min={1} max={500} value={value} onChange={(e) => onChange(Math.max(1, parseInt(e.target.value, 10) || 1))} className={`${inputCls} pl-9`} />
      </div>
    </Field>
  );
}

// ---------------------------------------------------------------------------
// Create order (quick) / Custom order (every field) — both can create N orders
// ---------------------------------------------------------------------------
const DEFAULT_OPTS = { carrierId: "", currentState: "", currencyId: "", paymentModule: "ps_wirepayment", paymentLabel: "Bank transfer", shippingCost: 0, taxRate: 0 };

function OrderBatchForm({ custom }) {
  const { creds, reference } = usePresta();
  const { addresses } = useSavedAddresses();
  const ops = usePrestaOps();
  const opKey = custom ? "custom" : "create";
  const op = custom ? ops.customOp : ops.createOp;
  const { loading, progress, error, errorContext } = op;

  useAutoReference();
  const refData = reference.data && reference.forShop === creds.shopUrl ? reference.data : null;

  const rows = useOrderRows();
  const [opts, setOpts] = useState(() => ({ ...DEFAULT_OPTS, ...readJson(OPTS_KEY, {}) }));
  useEffect(() => {
    localStorage.setItem(OPTS_KEY, JSON.stringify(opts));
  }, [opts]);
  const setOpt = (k) => (v) => setOpts((o) => ({ ...o, [k]: v }));

  const [addressChoice, setAddressChoice] = useState("US");
  const [override, setOverride] = useState({});   // custom mode: hand-edited address fields
  const [addressId, setAddressId] = useState(""); // custom mode: reuse an existing address
  const [customer, setCustomer] = useState({ email: "", firstname: "", lastname: "" });
  const [count, setCount] = useState(1);

  // Fall back if the chosen saved address was deleted.
  const choice = addressChoice.startsWith("saved:") && !addresses.some((a) => a.id === addressChoice.slice(6)) ? "US" : addressChoice;

  const resolved = useMemo(() => resolveAddressChoice(choice, addresses, refData), [choice, addresses, refData]);
  const fields = { ...resolved.fields, ...override };

  // Defaults once the store's lists are known: first active carrier, a "paid" status.
  const firstActive = (l) => (l?.items ?? []).find((i) => i.active !== false);
  const states = refData?.orderStates?.items ?? [];
  const carrierId = opts.carrierId || firstActive(refData?.carriers)?.id || "";
  const currentState = opts.currentState || (states.find((s) => s.paid) ?? states[0])?.id || "";

  const stateName = (id) => states.find((s) => String(s.id) === String(id))?.name ?? `#${id}`;
  const currencyIso = (id) => (refData?.currencies?.items ?? []).find((c) => String(c.id) === String(id))?.iso ?? "";

  const needsCountry = !addressId && !fields.id_country;
  const blocked = rows.incomplete || !carrierId || !currentState || needsCountry;

  const submit = (e) => {
    e.preventDefault();
    if (blocked || loading) return;

    const fake = randomCustomer();
    const customerData = custom
      ? { email: customer.email.trim() || fake.email, firstname: customer.firstname.trim() || fake.firstname, lastname: customer.lastname.trim() || fake.lastname }
      : fake;

    const payload = {
      customer: customerData,
      address: addressId
        ? { id: Number(addressId) }
        : { ...fields, id_country: Number(fields.id_country), id_state: fields.id_state ? Number(fields.id_state) : undefined },
      items: rows.items.map((r) => ({
        productId: Number(r.productId),
        combinationId: r.combinationId ? Number(r.combinationId) : 0,
        quantity: Number(r.quantity) || 1,
        ...(r.price !== "" ? { priceOverride: Number(r.price) } : {}),
      })),
      carrierId: Number(carrierId),
      currentState: Number(currentState),
      currencyId: opts.currencyId ? Number(opts.currencyId) : undefined,
      paymentModule: opts.paymentModule,
      paymentLabel: opts.paymentLabel,
      shippingCost: Number(opts.shippingCost) || 0,
      taxRate: Number(opts.taxRate) || 0,
    };

    // One customer + one address are reused across the whole batch.
    let addrId = null;
    ops.runBatch(opKey, count, {
      verb: "created",
      runner: async () => {
        const r = await createOrderApi(creds, { ...payload, address: addrId ? { id: addrId } : payload.address });
        addrId = r.order.id_address_delivery ?? r.created?.address ?? null;
        return r;
      },
      toEntry: (r) => ({
        id: r.order.id,
        reference: r.order.reference,
        status: stateName(r.order.current_state || currentState),
        total: Number(r.order.total_paid_tax_incl ?? 0).toFixed(2),
        currency: currencyIso(r.order.id_currency),
      }),
      label: (r) => `${custom ? "Custom " : ""}PrestaShop order #${r.order.id} (${r.order.reference}) on ${creds.shopUrl}`,
    });
  };

  const setF = (k) => (e) => setOverride((o) => ({ ...o, [k]: e.target.value }));

  const addressSelect = (
    <Field label="Shipping & billing address" hint={<>Add more in <a href="/presta/settings" className="text-pink-600 dark:text-pink-400 hover:underline">Settings</a>. Country and state are matched to this store's lists.</>}>
      <select value={choice} onChange={(e) => { setAddressChoice(e.target.value); setOverride({}); }} className={`${inputCls} cursor-pointer`}>
        <optgroup label="Built-in presets">
          {presetOptions().map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </optgroup>
        {addresses.length > 0 && (
          <optgroup label="Saved addresses">
            {addresses.map((a) => (
              <option key={a.id} value={`saved:${a.id}`}>{a.name} — {[a.address1, a.city, a.zip].filter(Boolean).join(", ")}</option>
            ))}
          </optgroup>
        )}
      </select>
    </Field>
  );

  const stateList = (refData?.states?.items ?? []).filter((s) => String(s.countryId) === String(fields.id_country) && s.active !== false);

  return (
    <Page
      title={custom ? "Custom Order" : "Create Order"}
      subtitle={custom
        ? "Choose the customer, edit every address field and set the payment details"
        : "Pick products, an address and how many — customer, address, cart and order are created for you"}
    >
      <form onSubmit={submit} className="space-y-5">
        <PrestaCredentials><ReferenceBar /></PrestaCredentials>
        <ErrorBanner error={reference.error && { kind: "unknown", title: "Couldn't load store data", message: reference.error.response?.data?.error ?? reference.error.message }} />

        {custom && (
          <Card title="Customer">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Email" hint="Reused if a customer with this email exists. Blank = random">
                <input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="qa@example.com" className={inputCls} />
              </Field>
              <Field label="First name" hint="Blank = random"><input value={customer.firstname} onChange={(e) => setCustomer({ ...customer, firstname: e.target.value })} className={inputCls} /></Field>
              <Field label="Last name" hint="Blank = random"><input value={customer.lastname} onChange={(e) => setCustomer({ ...customer, lastname: e.target.value })} className={inputCls} /></Field>
            </div>
          </Card>
        )}

        <Card title="Products">
          <ProductRows rows={rows} creds={creds} disabled={loading} />
        </Card>

        <Card title={custom ? "Delivery & invoice address" : "Address"}>
          <div className="space-y-4">
            {custom && (
              <Field label="Use an existing address ID (optional)" hint="Leave empty to create an address from the fields below">
                <input type="number" min="1" value={addressId} onChange={(e) => setAddressId(e.target.value)} placeholder="e.g. 4" className={inputCls} />
              </Field>
            )}
            {!addressId && addressSelect}
            {!addressId && custom && (
              <div className="grid grid-cols-3 gap-4">
                <Field label="Street"><input value={fields.address1} onChange={setF("address1")} className={inputCls} /></Field>
                <Field label="City"><input value={fields.city} onChange={setF("city")} className={inputCls} /></Field>
                <Field label="Postcode"><input value={fields.postcode} onChange={setF("postcode")} className={inputCls} /></Field>
                <Field label="Country">
                  <RefSelect items={refData?.countries} value={fields.id_country} onChange={(v) => setOverride((o) => ({ ...o, id_country: v, id_state: "" }))} placeholder="— pick a country —" />
                </Field>
                <Field label="State">
                  {stateList.length ? (
                    <select value={fields.id_state} onChange={setF("id_state")} className={inputCls}>
                      <option value="">— none —</option>
                      {stateList.map((s) => <option key={s.id} value={s.id}>{s.name} — #{s.id}</option>)}
                    </select>
                  ) : (
                    <input type="number" min="1" value={fields.id_state} onChange={setF("id_state")} placeholder="state ID, if the country has states" className={inputCls} />
                  )}
                </Field>
                <Field label="Phone"><input value={fields.phone} onChange={setF("phone")} className={inputCls} /></Field>
                <Field label="Company"><input value={fields.company} onChange={setF("company")} className={inputCls} /></Field>
                <Field label="Address line 2"><input value={fields.address2} onChange={setF("address2")} className={inputCls} /></Field>
              </div>
            )}
            {!addressId && resolved.warnings.length > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">{resolved.warnings.join(" ")}</p>
            )}
          </div>
        </Card>

        <Card title="Order options">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Carrier"><RefSelect items={refData?.carriers} value={carrierId} onChange={setOpt("carrierId")} placeholder="— pick a carrier —" required /></Field>
            <Field label="Order status"><RefSelect items={refData?.orderStates} value={currentState} onChange={setOpt("currentState")} placeholder="— pick a status —" required /></Field>
            <Field label="Currency" hint="Empty = store default"><RefSelect items={refData?.currencies} value={opts.currencyId} onChange={setOpt("currencyId")} placeholder="— store default —" /></Field>
            {custom && (
              <>
                <Field label="Payment module" hint="Technical name, e.g. ps_wirepayment, ps_checkpayment"><input value={opts.paymentModule} onChange={(e) => setOpt("paymentModule")(e.target.value)} className={inputCls} /></Field>
                <Field label="Payment label"><input value={opts.paymentLabel} onChange={(e) => setOpt("paymentLabel")(e.target.value)} className={inputCls} /></Field>
              </>
            )}
            <CountField label="Number of Orders" hint="One customer + address are reused for the whole batch" value={count} onChange={setCount} />
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-3">
            PrestaShop prices the order itself from the cart: the product's price, taxes for the address's country, and the carrier's shipping cost. A price override is applied as a temporary customer-specific price (the API key needs GET/POST/DELETE on specific_prices for that).
            {!custom && <> Need to set payment details or edit address fields? Use <a href="/presta/orders/custom" className="text-pink-600 dark:text-pink-400 hover:underline">Custom Order</a>.</>}
          </p>
        </Card>

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={loading || blocked} className={gradientBtn(loading || blocked)}>
            {loading ? (
              <>
                <Loader2 className="animate-spin shrink-0" size={20} />
                <span>{progress ? `Creating ${progress.done + 1} of ${progress.total}...` : "Creating..."}</span>
              </>
            ) : (
              <>
                {custom ? <SlidersHorizontal size={18} /> : <ShoppingBag size={18} />}
                <span>Create {count > 1 ? `${count} Orders` : "Order"}{rows.items.length > 1 ? ` · ${rows.items.length} products` : ""}</span>
              </>
            )}
          </button>
          {loading && (
            <button type="button" onClick={() => ops.cancelOp(opKey)} className={cancelBtn}>
              <XCircle size={18} /> Cancel
            </button>
          )}
        </div>
      </form>

      <ErrorBanner error={error} context={errorContext} onRetry={() => { ops.clearError(opKey); submit({ preventDefault: () => {} }); }} onDismiss={() => ops.clearError(opKey)} />
      <OrderResultsPanel op={op} verb="created" />
    </Page>
  );
}

export const CreateOrderPage = () => <OrderBatchForm custom={false} />;
export const CustomOrderPage = () => <OrderBatchForm custom />;

// ---------------------------------------------------------------------------
// Duplicate order — N copies
// ---------------------------------------------------------------------------
export function DuplicateOrderPage() {
  const { creds, reference } = usePresta();
  const ops = usePrestaOps();
  const { loading, progress, error, errorContext } = ops.duplicateOp;
  useAutoReference();
  const refData = reference.data && reference.forShop === creds.shopUrl ? reference.data : null;
  const states = refData?.orderStates?.items ?? [];

  const [orderId, setOrderId] = useState("");
  const [count, setCount] = useState(1);
  const [state, setState] = useState("");

  const stateName = (id) => states.find((s) => String(s.id) === String(id))?.name ?? `#${id}`;
  const currencyIso = (id) => (refData?.currencies?.items ?? []).find((c) => String(c.id) === String(id))?.iso ?? "";

  const submit = (e) => {
    e.preventDefault();
    ops.runBatch("duplicate", count, {
      verb: "duplicated",
      runner: () => duplicateOrderApi(creds, orderId.trim(), state ? Number(state) : undefined),
      toEntry: (r) => ({
        id: r.order.id,
        reference: r.order.reference,
        source: `#${r.source.id} (${r.source.reference})`,
        status: stateName(r.order.current_state || state || r.source.current_state),
        total: Number(r.order.total_paid_tax_incl ?? 0).toFixed(2),
        currency: currencyIso(r.order.id_currency),
      }),
      label: (r) => `Duplicated PrestaShop order #${r.source.id} → #${r.order.id} on ${creds.shopUrl}`,
    });
  };

  return (
    <Page title="Duplicate Order" subtitle="Re-create an existing order — new cart, same customer, addresses, carrier and products — as many times as you need">
      <form onSubmit={submit} className="space-y-5">
        <PrestaCredentials />
        <Card>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Order ID or reference"><input value={orderId} onChange={(e) => setOrderId(e.target.value)} disabled={loading} required placeholder="12 or XKBKNABJK" className={inputCls} /></Field>
            <CountField label="Times to Duplicate" value={count} onChange={setCount} />
            <Field label="New status (optional)">
              {states.length ? (
                <select value={state} onChange={(e) => setState(e.target.value)} className={inputCls}>
                  <option value="">— keep original —</option>
                  {states.map((s) => <option key={s.id} value={s.id}>{s.name} — #{s.id}</option>)}
                </select>
              ) : (
                <input type="number" min="1" value={state} onChange={(e) => setState(e.target.value)} placeholder="status ID, empty = keep" className={inputCls} />
              )}
            </Field>
          </div>
        </Card>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className={gradientBtn(loading)}>
            {loading ? (
              <>
                <Loader2 className="animate-spin shrink-0" size={20} />
                <span>{progress ? `Duplicating ${progress.done + 1} of ${progress.total}...` : "Duplicating..."}</span>
              </>
            ) : (
              <>
                <Copy size={18} />
                <span>Duplicate {count > 1 ? `${count}×` : ""} Order</span>
              </>
            )}
          </button>
          {loading && (
            <button type="button" onClick={() => ops.cancelOp("duplicate")} className={cancelBtn}>
              <XCircle size={18} /> Cancel
            </button>
          )}
        </div>
      </form>

      <ErrorBanner error={error} context={errorContext} onRetry={() => { ops.clearError("duplicate"); submit({ preventDefault: () => {} }); }} onDismiss={() => ops.clearError("duplicate")} />
      <OrderResultsPanel op={ops.duplicateOp} verb="duplicated" showSource />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------
export function FetchOrderPage() {
  const op = useOp(fetchOrderApi, { successToast: (r) => `Fetched order #${r.order.id}` });
  return (
    <LookupPage
      title="Fetch Order" subtitle="Look up any order by ID or reference and view its JSON"
      label="Order ID or reference" placeholder="12 or XKBKNABJK"
      buttonLabel="Fetch" busyLabel="Fetching…" buttonIcon={Search}
      op={op} run={op.run}
    >
      {({ order }) => (
        <JsonResult title={`Order #${order.id} — ${order.reference}`} data={order} filename={`presta-order-${order.id}.json`} summary={<Facts items={orderFacts(order)} />} />
      )}
    </LookupPage>
  );
}

// ---------------------------------------------------------------------------
// Edit order JSON (fetch → edit → PUT back)
// ---------------------------------------------------------------------------
export function EditOrderPage() {
  const { creds } = usePresta();
  const { addActivity } = useActivity();
  const fetchOp = useOp(fetchOrderApi);
  const saveOp = useOp(updateOrderApi, { successToast: (r) => `Updated order #${r.order.id}` });
  const [orderId, setOrderId] = useState("");
  const [text, setText] = useState("");
  const [parseError, setParseError] = useState("");

  const load = async (e) => {
    e?.preventDefault();
    const r = await fetchOp.run(creds, orderId.trim());
    if (r) {
      setText(JSON.stringify(r.order, null, 2));
      setParseError("");
      saveOp.reset();
    }
  };

  const save = async () => {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      setParseError(err.message);
      return;
    }
    setParseError("");
    const r = await saveOp.run(creds, parsed);
    if (r) addActivity("order", `Updated PrestaShop order #${r.order.id} on ${creds.shopUrl}`);
  };

  return (
    <Page title="Edit JSON Order" subtitle="Fetch an order, edit its JSON, and PUT the changes back to the store">
      <form onSubmit={load} className="space-y-5">
        <PrestaCredentials />
        <Card>
          <div className="flex gap-3 items-end">
            <Field label="Order ID or reference" className="flex-1">
              <input value={orderId} onChange={(e) => setOrderId(e.target.value)} required placeholder="12" className={inputCls} />
            </Field>
            <button type="submit" disabled={fetchOp.loading} className={primaryBtn}>
              {fetchOp.loading ? <Spinner /> : <Search size={15} />} Load order
            </button>
          </div>
        </Card>
      </form>

      <ErrorBanner error={fetchOp.error} onDismiss={fetchOp.clearError} />

      {text && (
        <Card title="Order JSON">
          <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} rows={22} className={`${inputCls} font-mono text-xs`} />
          {parseError && <p className="text-xs text-red-600 dark:text-red-400 mt-2">Invalid JSON: {parseError}</p>}
          <div className="flex items-center gap-3 mt-3">
            <button type="button" onClick={save} disabled={saveOp.loading} className={primaryBtn}>
              {saveOp.loading ? <Spinner /> : <Save size={15} />} Save changes (PUT)
            </button>
            <p className="text-[11px] text-gray-400 dark:text-slate-500">Read-only fields (dates, invoice numbers…) are removed automatically before sending.</p>
          </div>
        </Card>
      )}

      <ErrorBanner error={saveOp.error} onDismiss={saveOp.clearError} />
      {saveOp.result && (
        <JsonResult title={`Updated order #${saveOp.result.order.id}`} data={saveOp.result.order} filename={`presta-order-${saveOp.result.order.id}.json`} summary={<div className="p-3"><Skipped dropped={saveOp.result.dropped} /></div>} />
      )}
    </Page>
  );
}
