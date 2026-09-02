import { useEffect, useState } from "react";
import { Hash, Loader2, XCircle, Sliders } from "lucide-react";
import { faker } from "@faker-js/faker";
import { ADDRESS_PRESETS, toGrams } from "../../utils/orderPayload";
import { useSavedAddresses } from "../../context/SavedAddressesContext";
import { useOrderOps } from "../../context/OrderOpsContext";
import OrderResultsPanel from "./OrderResultsPanel";
import OrderModeNotice from "./OrderModeNotice";
import SavedStorePicker from "../common/SavedStorePicker";
import ErrorBanner from "../common/ErrorBanner";
import VariantPicker from "./VariantPicker";

// ─── Field definitions ────────────────────────────────────────────────────────
const FIELD_GROUPS = [
  {
    label: "Line Item",
    fields: [
      { key: "quantity",           label: "Quantity",           type: "number",  placeholder: "1",              default: "1",     required: true },
      { key: "price",              label: "Price",              type: "number",  placeholder: "10.00",          default: "10.00", required: true },
      { key: "weight_value",       label: "Weight (blank = variant default)", type: "number", placeholder: "500", default: "" },
      { key: "weight_unit",        label: "Weight Unit",        type: "select",  options: [["g","grams"],["kg","kilograms"],["lb","pounds"],["oz","ounces"]], default: "g" },
      { key: "requires_shipping",  label: "Requires Shipping",  type: "select",  options: [["true","Yes"],["false","No"]],        default: "true" },
      { key: "taxable",            label: "Taxable",            type: "select",  options: [["true","Yes"],["false","No"]],        default: "true" },
    ],
  },
  {
    label: "Financial",
    fields: [
      { key: "financial_status", label: "Financial Status", type: "select",
        options: [["paid","Paid"],["pending","Pending"],["authorized","Authorized"],["partially_paid","Partially Paid"],["refunded","Refunded"],["voided","Voided"]],
        default: "paid" },
      { key: "currency", label: "Currency", type: "text", placeholder: "USD", default: "USD" },
    ],
  },
  {
    label: "Payment / Transaction",
    fields: [
      { key: "txn_gateway", label: "Gateway", type: "select",
        options: [["bogus","Bogus (test)"],["manual","Manual"],["cash_on_delivery","Cash on Delivery"],["gift_card","Gift Card"]],
        default: "bogus" },
      { key: "txn_kind", label: "Kind", type: "select",
        options: [["sale","Sale"],["authorization","Authorization"],["capture","Capture"],["void","Void"],["refund","Refund"]],
        default: "sale" },
      { key: "txn_status", label: "Status", type: "select",
        options: [["success","Success"],["pending","Pending"],["failure","Failure"],["error","Error"]],
        default: "success" },
      { key: "txn_amount", label: "Amount (leave blank = price)", type: "number", placeholder: "10.00", default: "" },
    ],
  },
  {
    label: "Shipping Method",
    fields: [
      { key: "shipping_title", label: "Method Title",      type: "text",   placeholder: "Standard Shipping", default: "Standard Shipping" },
      { key: "shipping_price", label: "Shipping Price",    type: "number", placeholder: "0.00",              default: "0.00" },
      { key: "fulfillment_status", label: "Fulfillment Status", type: "select",
        options: [["null","Unfulfilled"],["fulfilled","Fulfilled"],["partial","Partial"]],
        default: "null" },
    ],
  },
  {
    label: "Customer",
    fields: [
      { key: "email",      label: "Email",      type: "text", placeholder: "customer@example.com", default: "" },
      { key: "phone",      label: "Phone",      type: "text", placeholder: "+1 555 555 5555",       default: "" },
      { key: "first_name", label: "First Name", type: "text", placeholder: "John",                 default: "" },
      { key: "last_name",  label: "Last Name",  type: "text", placeholder: "Doe",                  default: "" },
      { key: "company",    label: "Company",    type: "text", placeholder: "Acme Inc.",             default: "" },
    ],
  },
  {
    label: "Order Details",
    fields: [
      { key: "note",        label: "Note",        type: "text", placeholder: "Order note...",    default: "Created from Shopify Helper" },
      { key: "tags",        label: "Tags",        type: "text", placeholder: "tag1,tag2",        default: "shopify-helper,test-order" },
      { key: "source_name", label: "Source Name", type: "text", placeholder: "web",              default: "shopify-helper" },
    ],
  },
  {
    label: "Settings",
    fields: [
      { key: "send_receipt",         label: "Send Receipt Email",  type: "select", options: [["false","No"],["true","Yes"]], default: "false" },
      { key: "taxes_included",       label: "Taxes Included",      type: "select", options: [["false","No"],["true","Yes"]], default: "false" },
      { key: "tax_exempt",           label: "Tax Exempt",          type: "select", options: [["false","No"],["true","Yes"]], default: "false" },
      { key: "inventory_behaviour",  label: "Inventory Behaviour", type: "select",
        options: [["bypass","Bypass"],["decrement_ignoring_policy","Decrement (ignore policy)"],["decrement_obeying_policy","Decrement (obey policy)"]],
        default: "bypass" },
    ],
  },
];

const ALL_FIELDS = FIELD_GROUPS.flatMap((g) => g.fields);
const defaultOf  = (key) => ALL_FIELDS.find((f) => f.key === key)?.default ?? "";

function CustomOrderForm() {
  const { storeUrl, setStoreUrl, token, setToken, customOp, runCustomBatch, cancelOp, clearError } = useOrderOps();
  const { loading, progress, orders, error, errorContext, droppedFields } = customOp;

  const { addresses } = useSavedAddresses();
  const [addressChoice, setAddressChoice] = useState("US");
  const [orderCount, setOrderCount]       = useState(1);
  const [variantId, setVariantId]         = useState("");

  useEffect(() => {
    if (addressChoice.startsWith("saved:")) {
      const id = addressChoice.slice(6);
      if (!addresses.some((a) => a.id === id)) setAddressChoice("US");
    }
  }, [addresses, addressChoice]);

  const [enabled, setEnabled] = useState({ quantity: true, price: true });
  const [values,  setValues]  = useState(() => {
    const init = {};
    ALL_FIELDS.forEach((f) => { init[f.key] = f.default; });
    return init;
  });

  const toggle   = (key) => setEnabled((p) => ({ ...p, [key]: !p[key] }));
  const setValue = (key, val) => setValues((p) => ({ ...p, [key]: val }));
  const get      = (key) => (enabled[key] ? values[key] : defaultOf(key));

  const buildPayload = () => {
    // Address source: either a built-in preset or a saved address (falling back to preset fields for anything missing).
    const preset = ADDRESS_PRESETS.US;
    let src;
    if (addressChoice.startsWith("saved:")) {
      const id = addressChoice.slice(6);
      src = addresses.find((a) => a.id === id) ?? preset;
    } else {
      src = ADDRESS_PRESETS[addressChoice] ?? preset;
    }
    const phone  = get("phone") || src.phone || faker.helpers.arrayElement(preset.phones);

    const address = {
      first_name: get("first_name") || src.first_name || faker.person.firstName(),
      last_name:  get("last_name")  || src.last_name  || faker.person.lastName(),
      company:    get("company")    || src.company    || faker.company.name(),
      address1:   src.address1 ?? preset.address1,
      address2:   src.address2 ?? preset.address2,
      city:       src.city     ?? preset.city,
      province:   src.province ?? preset.province,
      country:    src.country  ?? preset.country,
      zip:        src.zip      ?? preset.zip,
      phone,
    };

    const payload = {
      email:                get("email") || faker.internet.email(),
      phone,
      currency:             get("currency") || src.currency || preset.currency,
      financial_status:     get("financial_status") || "paid",
      note:                 get("note"),
      tags:                 get("tags"),
      source_name:          get("source_name"),
      send_receipt:         get("send_receipt") === "true",
      taxes_included:       get("taxes_included") === "true",
      tax_exempt:           get("tax_exempt") === "true",
      inventory_behaviour:  get("inventory_behaviour"),
      shipping_address:     address,
      billing_address:      address,
      line_items: [(() => {
        const item = {
          variant_id:        Number(variantId),
          quantity:          Number(get("quantity")),
          price:             get("price"),
          requires_shipping: get("requires_shipping") === "true",
          taxable:           get("taxable") === "true",
        };
        if (enabled["weight_value"]) {
          const g = toGrams(get("weight_value"), get("weight_unit"));
          if (g != null) item.grams = g;
        }
        return item;
      })()],
    };

    const hasTxn = ["txn_gateway","txn_kind","txn_status","txn_amount"].some((k) => enabled[k]);
    if (hasTxn) {
      payload.transactions = [{
        kind:    get("txn_kind")    || "sale",
        gateway: get("txn_gateway") || "bogus",
        status:  get("txn_status")  || "success",
        amount:  get("txn_amount")  || get("price"),
      }];
    }

    if (enabled["shipping_title"] || enabled["shipping_price"]) {
      payload.shipping_lines = [{
        title: get("shipping_title") || "Standard Shipping",
        price: get("shipping_price") || "0.00",
        code:  "CUSTOM",
      }];
    }

    const fs = get("fulfillment_status");
    if (enabled["fulfillment_status"] && fs && fs !== "null") {
      payload.fulfillment_status = fs;
    }

    return payload;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    runCustomBatch(buildPayload(), orderCount);
  };

  const inputCls = "bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 focus:border-purple-500 outline-none rounded-lg py-1.5 px-2.5 text-sm text-gray-800 dark:text-slate-100 transition-colors w-full";

  const renderInput = (field) => {
    if (field.type === "select") {
      return (
        <select value={values[field.key]} onChange={(e) => setValue(field.key, e.target.value)} className={`${inputCls} cursor-pointer`}>
          {field.options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
      );
    }
    return (
      <input
        type={field.type === "number" ? "number" : "text"}
        placeholder={field.placeholder ?? ""}
        value={values[field.key]}
        onChange={(e) => setValue(field.key, e.target.value)}
        className={inputCls}
      />
    );
  };

  return (
    <div className="grid grid-cols-3 gap-6">

      {/* Store credentials */}
      <div className="col-span-3 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Custom Order</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-0.5 text-sm">
            Check fields to override — unchecked fields use their defaults
          </p>
        </div>

        <form id="custom-order-form" onSubmit={handleSubmit} className="space-y-4">
          <SavedStorePicker onPick={({ storeUrl: u, token: t }) => { setStoreUrl(u); setToken(t); }} />

          <OrderModeNotice />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">Store URL</label>
              <input type="text" placeholder="your-store.myshopify.com" value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 focus:border-purple-500 outline-none rounded-xl py-2.5 px-3 text-sm text-gray-800 dark:text-slate-100 transition-colors"
                required />
            </div>
            <div>
              <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">Access Token</label>
              <input type="text" placeholder="shpat_..." value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 focus:border-purple-500 outline-none rounded-xl py-2.5 px-3 text-sm text-gray-800 dark:text-slate-100 transition-colors"
                required />
            </div>
            <div>
              <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">Shipping Address</label>
              <select value={addressChoice} onChange={(e) => setAddressChoice(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 focus:border-purple-500 outline-none rounded-xl py-2.5 px-3 text-sm text-gray-800 dark:text-slate-100 transition-colors cursor-pointer">
                <optgroup label="Built-in presets">
                  {Object.entries(ADDRESS_PRESETS).map(([key, p]) => (
                    <option key={key} value={key}>{p.label} — {p.address1}, {p.city}</option>
                  ))}
                </optgroup>
                {addresses.length > 0 && (
                  <optgroup label="Saved addresses">
                    {addresses.map((a) => (
                      <option key={a.id} value={`saved:${a.id}`}>
                        {a.name} — {[a.address1, a.city, a.zip].filter(Boolean).join(", ")}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div>
              <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">
                Number of Orders
                <span className="ml-2 font-normal text-gray-400 dark:text-slate-500 text-xs">(&gt;5 paced at 16s)</span>
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-2.5 text-gray-400 dark:text-slate-500" size={16} />
                <input type="number" min={1} max={500} value={orderCount}
                  onChange={(e) => setOrderCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 focus:border-purple-500 outline-none rounded-xl py-2.5 pl-9 pr-3 text-sm text-gray-800 dark:text-slate-100 transition-colors" />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
            <VariantPicker
              storeUrl={storeUrl}
              token={token}
              value={variantId}
              onChange={setVariantId}
            />
          </div>
        </form>
      </div>

      {/* Field groups */}
      {FIELD_GROUPS.map((group) => (
        <div key={group.label} className="col-span-1 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40">
            <p className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wide">{group.label}</p>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {group.fields.map((field) => (
              <div key={field.key}>
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="checkbox"
                    id={`chk-${field.key}`}
                    checked={!!enabled[field.key]}
                    onChange={() => !field.required && toggle(field.key)}
                    disabled={field.required}
                    className="w-3.5 h-3.5 accent-purple-600 cursor-pointer disabled:cursor-default"
                  />
                  <label
                    htmlFor={`chk-${field.key}`}
                    className={`text-xs font-medium select-none ${enabled[field.key] ? "text-gray-800 dark:text-slate-100" : "text-gray-400 dark:text-slate-500"} ${!field.required ? "cursor-pointer" : ""}`}
                  >
                    {field.label}
                    {field.required && <span className="ml-1 text-purple-500">*</span>}
                  </label>
                </div>
                {enabled[field.key] && (
                  <div className="pl-5">
                    {renderInput(field)}
                  </div>
                )}
                {!enabled[field.key] && (
                  <p className="pl-5 text-[11px] text-gray-400 dark:text-slate-600">
                    default: <span className="font-mono">{defaultOf(field.key) || "auto"}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Submit bar */}
      <div className="col-span-3 flex gap-3">
        <button type="submit" form="custom-order-form" disabled={loading}
          className={`flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2 ${loading ? "opacity-80 cursor-not-allowed pointer-events-none" : "hover:opacity-90"}`}>
          {loading ? (
            <>
              <Loader2 className="btn-spinner shrink-0" size={20} />
              <span>{progress ? `Creating ${progress.done + 1} of ${progress.total}...` : "Creating..."}</span>
            </>
          ) : (
            <>
              <Sliders size={18} />
              <span>Create {orderCount > 1 ? `${orderCount} Custom Orders` : "Custom Order"}</span>
            </>
          )}
        </button>
        {loading && (
          <button type="button" onClick={() => cancelOp("custom")}
            className="px-5 py-3 rounded-xl text-base font-semibold border-2 border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center gap-2 shrink-0">
            <XCircle size={18} />
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="col-span-3">
          <ErrorBanner
            error={error}
            context={errorContext}
            onRetry={() => { clearError("custom"); handleSubmit({ preventDefault: () => {} }); }}
            onDismiss={() => clearError("custom")}
          />
        </div>
      )}

      <OrderResultsPanel progress={progress} loading={loading} orders={orders} verb="created" droppedFields={droppedFields} />
    </div>
  );
}

export default CustomOrderForm;
