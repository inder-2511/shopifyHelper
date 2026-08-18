import { Link } from "react-router-dom";
import { FilePenLine, Zap } from "lucide-react";
import { useOrderSettings } from "../../context/OrderSettingsContext";

/**
 * Shows which creation path the order forms will take, so the Settings toggle
 * isn't invisible from the page where it actually changes behavior.
 */
function OrderModeNotice() {
  const { editableOrders } = useOrderSettings();

  return (
    <div
      className={`rounded-xl border px-3.5 py-2.5 flex items-start gap-2.5 ${
        editableOrders
          ? "border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-900/20"
          : "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/30"
      }`}
    >
      {editableOrders ? (
        <FilePenLine size={14} className="text-purple-500 shrink-0 mt-0.5" />
      ) : (
        <Zap size={14} className="text-gray-400 dark:text-slate-500 shrink-0 mt-0.5" />
      )}
      <p className="text-[11px] text-gray-600 dark:text-slate-400 leading-relaxed">
        {editableOrders ? (
          <>
            <span className="font-semibold text-purple-700 dark:text-purple-300">
              Admin-editable orders on
            </span>{" "}
            — each order is created as a draft order, then completed. Slower (3 API calls
            each) but editable in the Shopify admin.
          </>
        ) : (
          <>
            <span className="font-semibold text-gray-700 dark:text-slate-300">Direct create</span>{" "}
            — fastest path, but Shopify won't let the admin edit these orders.
          </>
        )}{" "}
        <Link to="/settings" className="text-purple-600 dark:text-purple-400 hover:underline font-medium">
          Change in Settings
        </Link>
      </p>
    </div>
  );
}

export default OrderModeNotice;
