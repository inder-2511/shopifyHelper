import { useEffect, useState } from "react";
import { Hash, Loader2, XCircle, Plus, Trash2 } from "lucide-react";
import { buildOrderPayload, ADDRESS_PRESETS, WEIGHT_UNITS } from "../../utils/orderPayload";
import { useOrderOps } from "../../context/OrderOpsContext";
import { useSavedAddresses } from "../../context/SavedAddressesContext";
import OrderResultsPanel from "./OrderResultsPanel";
import OrderModeNotice from "./OrderModeNotice";
import SavedStorePicker from "../common/SavedStorePicker";
import ErrorBanner from "../common/ErrorBanner";
import VariantPicker from "./VariantPicker";

const LINE_ITEMS_KEY = "order_lineItems";

let rowSeq = 0;
const makeRow = (overrides = {}) => ({
  key: `row-${rowSeq++}`,
  variantId: "",
  quantity: 1,
  price: 10,
  weight: "",       // blank = use variant's default weight
  weightUnit: "g",
  ...overrides,
});

// Restore the saved product rows, falling back to the older single-variant key.
const initialRows = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(LINE_ITEMS_KEY) ?? "null");
    if (Array.isArray(saved) && saved.length) return saved.map((r) => makeRow(r));
  } catch {
    // malformed cache — fall through to the legacy key
  }
  return [makeRow({ variantId: localStorage.getItem("order_variantId") ?? "" })];
};

function OrderForm() {
  const { storeUrl, setStoreUrl, token, setToken, createOp, runCreateBatch, cancelOp, clearError } = useOrderOps();
  const { loading, progress, orders, error, errorContext, droppedFields } = createOp;
  const { addresses } = useSavedAddresses();

  const [items, setItems] = useState(initialRows);
  // "US" / "IN" / ... for built-in presets, or "saved:<id>" for a user-saved address.
  const [addressChoice, setAddressChoice] = useState("US");
  const [orderCount, setOrderCount]       = useState(1);

  // If the user deletes the saved address that was selected, fall back to US.
  useEffect(() => {
    if (addressChoice.startsWith("saved:")) {
      const id = addressChoice.slice(6);
      if (!addresses.some((a) => a.id === id)) setAddressChoice("US");
    }
  }, [addresses, addressChoice]);

  const resolveAddress = () => {
    if (addressChoice.startsWith("saved:")) {
      const id = addressChoice.slice(6);
      const saved = addresses.find((a) => a.id === id);
      return saved ? { addressPreset: "US", address: saved } : { addressPreset: "US" };
    }
    return { addressPreset: addressChoice };
  };

  useEffect(() => {
    const bare = items.map(({ variantId, quantity, price, weight, weightUnit }) => ({
      variantId, quantity, price, weight, weightUnit,
    }));
    localStorage.setItem(LINE_ITEMS_KEY, JSON.stringify(bare));
  }, [items]);

  const updateItem = (key, patch) =>
    setItems((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const addItem = () => setItems((prev) => [...prev, makeRow()]);

  const removeItem = (key) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((row) => row.key !== key) : prev));

  const incomplete = items.some((row) => String(row.variantId ?? "").trim() === "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (incomplete) return;
    const orderData = buildOrderPayload({ lineItems: items, ...resolveAddress() });
    runCreateBatch(orderData, orderCount);
  };

  const inputCls = "w-full bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 focus:border-purple-500 dark:focus:border-purple-500 outline-none rounded-xl py-2.5 px-3 text-sm text-gray-800 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-colors disabled:opacity-60";

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-3 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Create New Order</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-0.5 text-sm">Fill order details below</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <SavedStorePicker onPick={({ storeUrl: u, token: t }) => { setStoreUrl(u); setToken(t); }} />

          <OrderModeNotice />

          <div>
            <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">Store URL</label>
            <input type="text" placeholder="your-store.myshopify.com" value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              className={inputCls} required />
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">Access Token</label>
            <input type="text" placeholder="shpat_..." value={token}
              onChange={(e) => setToken(e.target.value)}
              className={inputCls} required />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-gray-700 dark:text-slate-300 text-sm">
                Products
                <span className="ml-2 font-normal text-gray-400 dark:text-slate-500 text-xs">
                  {items.length} line item{items.length !== 1 && "s"} per order
                </span>
              </label>
              <button type="button" onClick={addItem} disabled={loading}
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 disabled:opacity-50">
                <Plus size={13} />
                Add product
              </button>
            </div>

            <div className="space-y-3">
              {items.map((row, idx) => (
                <div key={row.key}
                  className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-900/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                      Product {idx + 1}
                    </span>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(row.key)} disabled={loading}
                        title="Remove this product"
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <VariantPicker
                        storeUrl={storeUrl}
                        token={token}
                        value={row.variantId}
                        onChange={(id) => updateItem(row.key, { variantId: id })}
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">Quantity</label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-2.5 text-gray-400 dark:text-slate-500" size={16} />
                        <input type="number" min={1} value={row.quantity} disabled={loading}
                          onChange={(e) => updateItem(row.key, { quantity: e.target.value })}
                          className={`${inputCls} pl-9`} />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">Price</label>
                      <input type="number" value={row.price} disabled={loading}
                        onChange={(e) => updateItem(row.key, { price: e.target.value })}
                        className={inputCls} />
                    </div>

                    <div className="col-span-2">
                      <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">
                        Weight
                        <span className="ml-2 font-normal text-gray-400 dark:text-slate-500 text-xs">
                          (optional — blank uses the variant's stored weight)
                        </span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={row.weight}
                          disabled={loading}
                          onChange={(e) => updateItem(row.key, { weight: e.target.value })}
                          placeholder="e.g. 500"
                          className={`${inputCls} flex-1`}
                        />
                        <select
                          value={row.weightUnit}
                          disabled={loading}
                          onChange={(e) => updateItem(row.key, { weightUnit: e.target.value })}
                          className={`${inputCls} w-24 cursor-pointer`}
                        >
                          {WEIGHT_UNITS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {incomplete && (
              <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                Pick a product (or enter a variant ID) for every line item before creating the order.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">Shipping Address</label>
              <select value={addressChoice} onChange={(e) => setAddressChoice(e.target.value)}
                className={`${inputCls} cursor-pointer`}>
                <optgroup label="Built-in presets">
                  {Object.entries(ADDRESS_PRESETS).map(([key, preset]) => (
                    <option key={key} value={key}>
                      {preset.label} — {preset.address1}, {preset.city}, {preset.zip}
                    </option>
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
              <p className="text-[11px] text-gray-500 dark:text-slate-500 mt-1">
                Add more in <a href="/settings" className="text-purple-600 dark:text-purple-400 hover:underline">Settings</a>.
              </p>
            </div>

            <div className="col-span-2">
              <label className="font-semibold text-gray-700 dark:text-slate-300 block mb-1.5 text-sm">
                Number of Orders
                <span className="ml-2 font-normal text-gray-400 dark:text-slate-500 text-xs">(&gt;5 orders paced at 16s each)</span>
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-2.5 text-gray-400 dark:text-slate-500" size={16} />
                <input type="number" min={1} max={500} value={orderCount}
                  onChange={(e) => setOrderCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className={`${inputCls} pl-9`} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading || incomplete}
              className={`flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2 ${loading || incomplete ? "opacity-80 cursor-not-allowed pointer-events-none" : "hover:opacity-90"}`}>
              {loading ? (
                <>
                  <Loader2 className="btn-spinner shrink-0" size={20} />
                  <span>{progress ? `Creating ${progress.done + 1} of ${progress.total}...` : "Creating..."}</span>
                </>
              ) : (
                `Create ${orderCount > 1 ? `${orderCount} Orders` : "Order"}${items.length > 1 ? ` · ${items.length} products` : ""}`
              )}
            </button>

            {loading && (
              <button type="button" onClick={() => cancelOp("create")}
                className="px-5 py-3 rounded-xl text-base font-semibold border-2 border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center gap-2 shrink-0">
                <XCircle size={18} />
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {error && (
        <div className="col-span-3">
          <ErrorBanner
            error={error}
            context={errorContext}
            onRetry={() => { clearError("create"); handleSubmit({ preventDefault: () => {} }); }}
            onDismiss={() => clearError("create")}
          />
        </div>
      )}

      <OrderResultsPanel progress={progress} loading={loading} orders={orders} verb="created" droppedFields={droppedFields} />
    </div>
  );
}

export default OrderForm;
