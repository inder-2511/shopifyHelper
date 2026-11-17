import { useState } from "react";
import { Copy, Plus, RefreshCcw, Save, Search, ShoppingBag, Trash2 } from "lucide-react";
import { useActivity } from "../../context/ActivityContext";
import { usePresta } from "../context/PrestaContext";
import { useOp } from "../hooks/useOp";
import {
  createOrderApi, duplicateOrderApi, fetchOrderApi, listProductsApi, updateOrderApi,
} from "../api/prestaApi";
import {
  Busy, Card, ErrorBanner, Facts, Field, JsonResult, LookupPage, Page, PrestaCredentials, Skipped,
  Spinner, inputCls, primaryBtn, secondaryBtn,
} from "../components/ui";

/** A <select> when the store's list is loaded, a plain number box when it isn't. */
function RefSelect({ items, value, onChange, placeholder, required }) {
  const usable = (items?.items ?? []).filter((i) => i.active !== false);
  if (!usable.length) {
    return (
      <input type="number" min="1" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={items?.error ? `ID (${items.status ?? "error"}: ${items.error.slice(0, 40)})` : "ID — click “Load store data”"}
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

function ReferenceBar({ onLoaded }) {
  const { reference, loadReference, creds } = usePresta();
  const loaded = reference.data && reference.forShop === creds.shopUrl;
  return (
    <div className="flex items-center justify-between pt-1">
      <p className="text-xs text-gray-500 dark:text-slate-400">
        {loaded
          ? `Store data loaded from ${reference.forShop} — carriers, statuses, countries and currencies are selectable below.`
          : "Load the store's carriers, order statuses, countries and currencies to pick them from lists."}
      </p>
      <button type="button" disabled={reference.loading || !creds.shopUrl || !creds.apiKey} onClick={() => loadReference().then(() => onLoaded?.()).catch(() => {})} className={secondaryBtn}>
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
// Create order
// ---------------------------------------------------------------------------
const emptyItem = () => ({ productId: "", combinationId: "", quantity: 1 });

export function CreateOrderPage() {
  const { creds, reference } = usePresta();
  const { addActivity } = useActivity();
  const op = useOp(createOrderApi, {
    successToast: (r) => `Created order #${r.order.id} (${r.order.reference})`,
  });
  const refData = reference.data && reference.forShop === creds.shopUrl ? reference.data : null;

  const [customer, setCustomer] = useState({ email: "", firstname: "Test", lastname: "Customer" });
  const [address, setAddress] = useState({ alias: "Test address", address1: "", city: "", postcode: "", id_country: "", id_state: "", phone: "" });
  const [addressId, setAddressId] = useState("");
  const [items, setItems] = useState([emptyItem()]);
  const [opts, setOpts] = useState({
    carrierId: "", currentState: "", currencyId: "",
    paymentModule: "ps_wirepayment", paymentLabel: "Bank transfer", shippingCost: 0, taxRate: 0,
  });
  const [productOptions, setProductOptions] = useState([]);

  const setOpt = (k) => (v) => setOpts((o) => ({ ...o, [k]: v }));
  const setItem = (i, patch) => setItems((arr) => arr.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  // Offer the store's newest products as suggestions for the Product ID boxes.
  const loadProducts = async () => {
    try {
      const { products } = await listProductsApi(creds, { limit: 100 });
      setProductOptions(products);
    } catch {
      /* suggestions are optional */
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      customer,
      address: addressId
        ? { id: Number(addressId) }
        : { ...address, id_country: Number(address.id_country), id_state: address.id_state ? Number(address.id_state) : undefined },
      items: items.filter((i) => i.productId).map((i) => ({
        productId: Number(i.productId),
        combinationId: i.combinationId ? Number(i.combinationId) : 0,
        quantity: Number(i.quantity) || 1,
      })),
      carrierId: Number(opts.carrierId),
      currentState: Number(opts.currentState),
      currencyId: opts.currencyId ? Number(opts.currencyId) : undefined,
      paymentModule: opts.paymentModule,
      paymentLabel: opts.paymentLabel,
      shippingCost: Number(opts.shippingCost) || 0,
      taxRate: Number(opts.taxRate) || 0,
    };
    const r = await op.run(creds, payload);
    if (r) addActivity("order", `Created PrestaShop order #${r.order.id} (${r.order.reference}) on ${creds.shopUrl}`);
  };

  return (
    <Page title="Create Order" subtitle="Build a PrestaShop order: customer → address → cart → order, creating only what's missing">
      <form onSubmit={submit} className="space-y-5">
        <PrestaCredentials><ReferenceBar onLoaded={loadProducts} /></PrestaCredentials>
        <ErrorBanner error={reference.error && { kind: "unknown", title: "Couldn't load store data", message: reference.error.response?.data?.error ?? reference.error.message }} />

        <Card title="Customer">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Email" hint="An existing customer with this email is reused; otherwise one is created">
              <input type="email" required value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="qa@example.com" className={inputCls} />
            </Field>
            <Field label="First name">
              <input value={customer.firstname} onChange={(e) => setCustomer({ ...customer, firstname: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Last name">
              <input value={customer.lastname} onChange={(e) => setCustomer({ ...customer, lastname: e.target.value })} className={inputCls} />
            </Field>
          </div>
        </Card>

        <Card title="Delivery & invoice address">
          <Field label="Use an existing address ID (optional)" hint="Leave empty to create a new address from the fields below" className="mb-4">
            <input type="number" min="1" value={addressId} onChange={(e) => setAddressId(e.target.value)} placeholder="e.g. 4" className={inputCls} />
          </Field>
          {!addressId && (
            <div className="grid grid-cols-3 gap-4">
              <Field label="Street"><input required value={address.address1} onChange={(e) => setAddress({ ...address, address1: e.target.value })} placeholder="1 Main St" className={inputCls} /></Field>
              <Field label="City"><input required value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} className={inputCls} /></Field>
              <Field label="Postcode"><input value={address.postcode} onChange={(e) => setAddress({ ...address, postcode: e.target.value })} className={inputCls} /></Field>
              <Field label="Country">
                <RefSelect items={refData?.countries} value={address.id_country} onChange={(v) => setAddress({ ...address, id_country: v })} placeholder="— pick a country —" required />
              </Field>
              <Field label="State ID (if the country has states)"><input type="number" min="1" value={address.id_state} onChange={(e) => setAddress({ ...address, id_state: e.target.value })} className={inputCls} /></Field>
              <Field label="Phone"><input value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} className={inputCls} /></Field>
            </div>
          )}
        </Card>

        <Card title="Products">
          <datalist id="presta-products">
            {productOptions.map((p) => (
              <option key={p.id} value={p.id} label={`${p.name}${p.reference ? ` — ${p.reference}` : ""}`} />
            ))}
          </datalist>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_100px_36px] gap-3 items-end">
                <Field label={i === 0 ? "Product ID" : ""}>
                  <input list="presta-products" type="number" min="1" required={i === 0} value={it.productId} onChange={(e) => setItem(i, { productId: e.target.value })} placeholder="ID" className={inputCls} />
                </Field>
                <Field label={i === 0 ? "Combination ID (optional)" : ""}>
                  <input type="number" min="0" value={it.combinationId} onChange={(e) => setItem(i, { combinationId: e.target.value })} placeholder="0" className={inputCls} />
                </Field>
                <Field label={i === 0 ? "Qty" : ""}>
                  <input type="number" min="1" value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} className={inputCls} />
                </Field>
                <button type="button" disabled={items.length === 1} onClick={() => setItems((a) => a.filter((_, j) => j !== i))} className="h-9 flex items-center justify-center rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setItems((a) => [...a, emptyItem()])} className={`${secondaryBtn} mt-3`}>
            <Plus size={12} /> Add product
          </button>
        </Card>

        <Card title="Order options">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Carrier"><RefSelect items={refData?.carriers} value={opts.carrierId} onChange={setOpt("carrierId")} placeholder="— pick a carrier —" required /></Field>
            <Field label="Order status"><RefSelect items={refData?.orderStates} value={opts.currentState} onChange={setOpt("currentState")} placeholder="— pick a status —" required /></Field>
            <Field label="Currency" hint="Empty = store default"><RefSelect items={refData?.currencies} value={opts.currencyId} onChange={setOpt("currencyId")} placeholder="— store default —" /></Field>
            <Field label="Payment module" hint="Technical name, e.g. ps_wirepayment, ps_checkpayment"><input value={opts.paymentModule} onChange={(e) => setOpt("paymentModule")(e.target.value)} className={inputCls} /></Field>
            <Field label="Payment label"><input value={opts.paymentLabel} onChange={(e) => setOpt("paymentLabel")(e.target.value)} className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Shipping (excl. tax)"><input type="number" min="0" step="0.01" value={opts.shippingCost} onChange={(e) => setOpt("shippingCost")(e.target.value)} className={inputCls} /></Field>
              <Field label="Tax rate %" hint="Applied to all lines"><input type="number" min="0" step="0.01" value={opts.taxRate} onChange={(e) => setOpt("taxRate")(e.target.value)} className={inputCls} /></Field>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-3">
            Prices come from each product's tax-excluded price. Totals are computed here, not by PrestaShop's cart rules — so discounts and per-country taxes aren't applied.
          </p>
        </Card>

        <button type="submit" disabled={op.loading} className={primaryBtn}>
          {op.loading ? <Spinner /> : <ShoppingBag size={15} />}
          {op.loading ? "Creating order…" : "Create order"}
        </button>
      </form>

      {op.loading && <Busy>Creating customer, address, cart and order…</Busy>}
      <ErrorBanner error={op.error} onDismiss={op.clearError} />
      {op.result && (
        <JsonResult
          title={`Order #${op.result.order.id} — ${op.result.order.reference}`}
          data={op.result}
          filename={`presta-order-${op.result.order.id}.json`}
          summary={<><Facts items={orderFacts(op.result.order)} /><div className="p-3"><Skipped dropped={op.result.dropped} /></div></>}
        />
      )}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Duplicate / fetch
// ---------------------------------------------------------------------------
export function DuplicateOrderPage() {
  const { reference, creds } = usePresta();
  const { addActivity } = useActivity();
  const [state, setState] = useState("");
  const op = useOp(duplicateOrderApi, {
    successToast: (r) => `Duplicated order #${r.source.id} → #${r.order.id}`,
  });
  const states = reference.data && reference.forShop === creds.shopUrl ? reference.data.orderStates : null;

  const run = async (c, id) => {
    const r = await op.run(c, id, state ? Number(state) : undefined);
    if (r) addActivity("order", `Duplicated PrestaShop order #${r.source.id} → #${r.order.id} on ${c.shopUrl}`);
  };

  return (
    <LookupPage
      title="Duplicate Order"
      subtitle="Re-create an order with a new cart, same customer, addresses, carrier and products"
      label="Order ID or reference" placeholder="12 or XKBKNABJK"
      buttonLabel="Duplicate" busyLabel="Duplicating…" buttonIcon={Copy}
      op={op} run={run}
      extraFields={
        <Field label="New status (optional)" className="w-64">
          {states?.items?.length ? (
            <select value={state} onChange={(e) => setState(e.target.value)} className={inputCls}>
              <option value="">— keep original —</option>
              {states.items.map((s) => <option key={s.id} value={s.id}>{s.name} — #{s.id}</option>)}
            </select>
          ) : (
            <input type="number" min="1" value={state} onChange={(e) => setState(e.target.value)} placeholder="status ID, empty = keep" className={inputCls} />
          )}
        </Field>
      }
    >
      {(r) => (
        <JsonResult
          title={`#${r.source.id} (${r.source.reference}) → #${r.order.id} (${r.order.reference})`}
          data={r} filename={`presta-order-${r.order.id}.json`}
          summary={<><Facts items={orderFacts(r.order)} /><div className="p-3"><Skipped dropped={r.dropped} /></div></>}
        />
      )}
    </LookupPage>
  );
}

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
