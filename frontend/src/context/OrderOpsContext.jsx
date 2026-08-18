import { createContext, useContext, useRef, useState } from "react";
import {
  createOrderApi,
  duplicateOrderApi,
  fetchOrderApi,
} from "../api/orderApi";
import { useActivity } from "./ActivityContext";
import { useToast } from "./ToastContext";
import { useOrderSettings } from "./OrderSettingsContext";
import { classifyError } from "../utils/errorClassifier";

const OrderOpsContext = createContext(null);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_RETRIABLE_ATTEMPTS = 5;
const ORDER_INTERVAL_MS = 16_000;

const idleBatch = {
  loading: false,
  progress: null,       // { done, total, currentAttempt? }
  orders: [],
  error: null,          // classified error object
  errorContext: "",     // e.g. "on order 3 of 10"
  cancelled: false,
  droppedFields: [],    // order-only fields the draft-order path couldn't carry
};

const idleFetch = { loading: false, order: null, error: null };

export function OrderOpsProvider({ children }) {
  const { addActivity } = useActivity();
  const { showToast } = useToast();
  const { editableOrders } = useOrderSettings();

  const [storeUrl, setStoreUrlState] = useState(
    () => localStorage.getItem("order_storeUrl") ?? ""
  );
  const [token, setTokenState] = useState(
    () => localStorage.getItem("order_token") ?? ""
  );

  const setStoreUrl = (v) => {
    setStoreUrlState(v);
    localStorage.setItem("order_storeUrl", v);
  };
  const setToken = (v) => {
    setTokenState(v);
    localStorage.setItem("order_token", v);
  };

  const [createOp, setCreateOp]       = useState(idleBatch);
  const [duplicateOp, setDuplicateOp] = useState(idleBatch);
  const [customOp, setCustomOp]       = useState(idleBatch);
  const [fetchOp, setFetchOp]         = useState(idleFetch);

  const cancelRefs = {
    create:    useRef(false),
    duplicate: useRef(false),
    custom:    useRef(false),
  };

  const setters = {
    create:    setCreateOp,
    duplicate: setDuplicateOp,
    custom:    setCustomOp,
  };

  const runBatch = async (opKey, count, singleRunner, activityLabel, verb) => {
    const setOp = setters[opKey];
    const cancelRef = cancelRefs[opKey];

    setOp({ ...idleBatch, loading: true, progress: { done: 0, total: count } });
    cancelRef.current = false;

    let done = 0;
    let stopped = null; // classified error if we bail

    try {
      for (let i = 0; i < count; i++) {
        if (cancelRef.current) break;

        if (count > 5 && i > 0) await sleep(ORDER_INTERVAL_MS);
        if (cancelRef.current) break;

        let result;
        let lastError;
        for (let attempt = 1; attempt <= MAX_RETRIABLE_ATTEMPTS; attempt++) {
          if (cancelRef.current) break;
          try {
            result = await singleRunner();
            lastError = null;
            break;
          } catch (err) {
            lastError = err;
            const classified = classifyError(err);
            if (!classified.retriable) {
              // Non-transient — stop the whole batch and surface the error
              stopped = { classified, at: i + 1 };
              break;
            }
            if (attempt === MAX_RETRIABLE_ATTEMPTS) {
              // Exhausted retries on a transient error — treat as terminal
              stopped = { classified, at: i + 1 };
              break;
            }
            const backoff = classified.kind === "rate_limit" ? 65_000 : 3_000 * attempt;
            await sleep(backoff);
          }
        }

        if (stopped) break;
        if (!result) break;

        const order = result.order ?? result;
        const entry = {
          id: order.id,
          name: order.name,
          source: result.source?.name,
          status: order.financial_status,
          total: order.total_price,
          currency: order.currency,
          createdAt: new Date(order.created_at ?? Date.now()).toLocaleTimeString(),
          editable: Boolean(result.viaDraftOrder),
        };
        done += 1;
        setOp((prev) => ({
          ...prev,
          orders: [entry, ...prev.orders],
          progress: { done, total: count },
          droppedFields: result.droppedFields?.length ? result.droppedFields : prev.droppedFields,
        }));
        if (activityLabel) addActivity("order", activityLabel(order, result));
      }

      if (stopped) {
        setOp((prev) => ({
          ...prev,
          loading: false,
          error: stopped.classified,
          errorContext: count > 1 ? `stopped at order ${stopped.at} of ${count} — ${done} succeeded` : "",
        }));
        showToast(stopped.classified.title, "error");
      } else {
        showToast(`${done} order${done !== 1 ? "s" : ""} ${verb}!`, "success");
        setOp((prev) => ({ ...prev, loading: false, cancelled: cancelRef.current }));
      }
    } catch (err) {
      // Should be unreachable — errors are caught above. Guard anyway.
      const classified = classifyError(err);
      setOp((prev) => ({ ...prev, loading: false, error: classified }));
      showToast(classified.title, "error");
    } finally {
      cancelRef.current = false;
    }
  };

  const runCreateBatch = (payload, count) =>
    runBatch(
      "create",
      count,
      () => createOrderApi({ ...payload, storeUrl, token, viaDraftOrder: editableOrders }),
      (order) => `${order.name} on ${storeUrl}`,
      "created"
    );

  const runDuplicateBatch = (orderName, count) =>
    runBatch(
      "duplicate",
      count,
      () => duplicateOrderApi(storeUrl, token, orderName, editableOrders),
      (order, result) => `Duplicated ${result.source?.name ?? orderName} → ${order.name} on ${storeUrl}`,
      "duplicated"
    );

  const runCustomBatch = (payload, count) =>
    runBatch(
      "custom",
      count,
      () => createOrderApi({ ...payload, storeUrl, token, viaDraftOrder: editableOrders }),
      (order) => `Custom ${order.name} on ${storeUrl}`,
      "created"
    );

  const cancelOp = (opKey) => {
    if (cancelRefs[opKey]) cancelRefs[opKey].current = true;
  };

  const clearError = (opKey) => {
    const setOp = setters[opKey];
    if (setOp) setOp((prev) => ({ ...prev, error: null, errorContext: "" }));
    if (opKey === "fetch") setFetchOp((prev) => ({ ...prev, error: null }));
  };

  const runFetch = async (orderId) => {
    if (fetchOp.loading) return;
    setFetchOp({ loading: true, order: null, error: null });
    try {
      const order = await fetchOrderApi(storeUrl, token, orderId);
      setFetchOp({ loading: false, order, error: null });
      showToast(`Fetched order ${order.name ?? orderId}`, "success");
    } catch (err) {
      const classified = classifyError(err);
      setFetchOp({ loading: false, order: null, error: classified });
      showToast(classified.title, "error");
    }
  };

  return (
    <OrderOpsContext.Provider
      value={{
        storeUrl, setStoreUrl, token, setToken,
        createOp,    runCreateBatch,
        duplicateOp, runDuplicateBatch,
        customOp,    runCustomBatch,
        fetchOp,     runFetch,
        cancelOp, clearError,
      }}
    >
      {children}
    </OrderOpsContext.Provider>
  );
}

export const useOrderOps = () => useContext(OrderOpsContext);
