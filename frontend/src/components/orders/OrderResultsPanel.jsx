import { useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { useScrollOnTruthy } from "../../hooks/useScrollOnTruthy";

const PAGE_SIZE = 20;

const statusColor = (s) => {
  if (s === "paid")    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (s === "pending") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  return "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400";
};

/**
 * Shared progress + orders table used by Create, Duplicate, and Custom order forms.
 * Reads batch state (progress + orders) from parent.
 */
function OrderResultsPanel({ progress, loading, orders, verb = "created", showSource = false, droppedFields = [] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageOrders = orders.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const scrollRef = useRef(null);
  // Scroll when a batch starts (progress appears) OR when the first order lands.
  useScrollOnTruthy(scrollRef, !!progress || orders.length > 0);

  return (
    <>
      <div ref={scrollRef} className="col-span-3 scroll-mt-6" />

      {/* Progress bar */}
      {loading && progress && (
        <div className="col-span-3 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-2">
            <span>{progress.done} of {progress.total} orders {verb}</span>
            <span>{Math.round((progress.done / progress.total) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Fields the draft-order path couldn't carry */}
      {droppedFields.length > 0 && (
        <div className="col-span-3 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 px-5 py-3">
          <p className="text-xs text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Ignored on the draft-order path:</span>{" "}
            <span className="font-mono">{droppedFields.join(", ")}</span> — the Draft Order API
            doesn't accept {droppedFields.length === 1 ? "it" : "them"}. Turn off
            "Create admin-editable orders" in Settings to send {droppedFields.length === 1 ? "it" : "them"} again.
          </p>
        </div>
      )}

      {/* Orders list */}
      {orders.length > 0 && (
        <div className="col-span-3 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-800 dark:text-slate-100 capitalize">{verb} Orders</h3>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{orders.length} order{orders.length !== 1 ? "s" : ""} this session</p>
            </div>
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 size={16} />
              <span className="text-xs font-semibold">{orders.length} {verb}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">#</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Order</th>
                  {showSource && (
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Source</th>
                  )}
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Total</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Time</th>
                </tr>
              </thead>
              <tbody>
                {pageOrders.map((order, idx) => {
                  const globalIdx = (safePage - 1) * PAGE_SIZE + idx;
                  return (
                    <tr key={order.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-3 text-xs text-gray-400 dark:text-slate-500">{orders.length - globalIdx}</td>
                      <td className="px-6 py-3 font-semibold text-gray-800 dark:text-slate-100">
                        {order.name}
                        {order.editable && (
                          <span
                            title="Created via a draft order — editable in the Shopify admin"
                            className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold align-middle bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                          >
                            editable
                          </span>
                        )}
                      </td>
                      {showSource && (
                        <td className="px-6 py-3 text-gray-500 dark:text-slate-400 text-xs">{order.source ?? "—"}</td>
                      )}
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-700 dark:text-slate-300">{order.currency} {order.total}</td>
                      <td className="px-6 py-3 text-gray-400 dark:text-slate-500 text-xs">{order.createdAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <p className="text-xs text-gray-400 dark:text-slate-500">
                Page {safePage} of {totalPages} — {orders.length} total
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-purple-400 hover:text-purple-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                      p === safePage
                        ? "bg-purple-600 text-white"
                        : "border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-purple-400 hover:text-purple-500"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-purple-400 hover:text-purple-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default OrderResultsPanel;
