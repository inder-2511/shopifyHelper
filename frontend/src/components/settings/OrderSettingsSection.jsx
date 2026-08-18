import { FilePenLine } from "lucide-react";
import { useOrderSettings } from "../../context/OrderSettingsContext";

function OrderSettingsSection() {
  const { editableOrders, toggleEditableOrders } = useOrderSettings();

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
        <FilePenLine size={17} className="text-purple-500" />
        <h2 className="text-base font-semibold text-gray-800 dark:text-slate-100">Orders</h2>
      </header>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-700 dark:text-slate-200 font-medium">
              Create admin-editable orders
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 max-w-xl">
              Shopify only lets the app that created an order edit it, so orders we create
              directly show <span className="italic">"This order cannot be edited by this app"</span>{" "}
              in the admin. Turn this on to create each order as a draft order and immediately
              complete it — those stay editable in the admin.
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
              Currently:{" "}
              <span className="font-mono">{editableOrders ? "draft order → complete" : "direct create"}</span>
              {" — "}
              <span className="font-mono">{editableOrders ? "3" : "1"}</span> API call
              {editableOrders ? "s" : ""} per order.
            </p>
          </div>

          <button
            onClick={toggleEditableOrders}
            role="switch"
            aria-checked={editableOrders}
            aria-label="Create admin-editable orders"
            className={`relative w-12 h-6 rounded-full transition-colors shrink-0 mt-1 ${
              editableOrders ? "bg-purple-600" : "bg-gray-300 dark:bg-slate-600"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                editableOrders ? "left-6" : "left-0.5"
              }`}
            />
          </button>
        </div>

        {editableOrders && (
          <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Draft orders accept fewer fields than the order resource. These are ignored on
              this path:{" "}
              <span className="font-mono">
                financial_status, fulfillment_status, inventory_behaviour, transactions,
                send_receipt, source_name
              </span>
              . Orders still come out paid. This mainly affects the Custom Order form, which
              reports whichever of its fields were dropped after each run.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default OrderSettingsSection;
