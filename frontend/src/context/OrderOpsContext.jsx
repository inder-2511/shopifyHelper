import { createContext, useContext, useRef, useState } from "react";
import {
  createOrderApi,
  duplicateOrderApi,
  fetchOrderApi,
} from "../api/orderApi";
import { useActivity } from "./ActivityContext";
import { useToast } from "./ToastContext";

const OrderOpsContext = createContext(null);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_RETRIES = 50;
const ORDER_INTERVAL_MS = 16_000;

const idleBatch = {
  loading: false,
  progress: null,       // { done, total }
  orders: [],           // shape: { id, name, source?, status, total, currency, createdAt }
  error: "",
  cancelled: false,
};

const idleFetch = { loading: false, order: null, error: "" };

const errText = (err, fallback) => {
  const msg = err.response?.data?.error ?? err.message ?? fallback;
  return typeof msg === "object" ? JSON.stringify(msg) : msg;
};

export function OrderOpsProvider({ children }) {
  const { addActivity } = useActivity();
  const { showToast } = useToast();

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

  const runBatch = async (opKey, count, singleRunner, activityLabel) => {
    const setOp = setters[opKey];
    const cancelRef = cancelRefs[opKey];

    setOp({ ...idleBatch, loading: true, progress: { done: 0, total: count } });
    cancelRef.current = false;

    let done = 0;
    const collected = [];

    try {
      for (let i = 0; i < count; i++) {
        if (cancelRef.current) break;

        if (count > 5 && i > 0) await sleep(ORDER_INTERVAL_MS);
        if (cancelRef.current) break;

        let result;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          if (cancelRef.current) break;
          try {
            result = await singleRunner();
            break;
          } catch (err) {
            if (attempt === MAX_RETRIES) throw err;
            await sleep(err.response?.status === 429 ? 65_000 : 3_000);
          }
        }
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
        };
        collected.unshift(entry);
        done += 1;
        setOp((prev) => ({
          ...prev,
          orders: [entry, ...prev.orders],
          progress: { done, total: count },
        }));
        if (activityLabel) addActivity("order", activityLabel(order, result));
      }
      showToast(`${done} order${done !== 1 ? "s" : ""} ${opKey === "duplicate" ? "duplicated" : "created"}!`, "success");
      setOp((prev) => ({ ...prev, loading: false, cancelled: cancelRef.current }));
    } catch (err) {
      const msg = errText(err, "Failed to run batch");
      showToast(msg, "error");
      setOp((prev) => ({ ...prev, loading: false, error: msg }));
    } finally {
      cancelRef.current = false;
    }
  };

  const runCreateBatch = (payload, count) =>
    runBatch(
      "create",
      count,
      () => createOrderApi({ ...payload, storeUrl, token }),
      (order) => `${order.name} on ${storeUrl}`
    );

  const runDuplicateBatch = (orderName, count) =>
    runBatch(
      "duplicate",
      count,
      () => duplicateOrderApi(storeUrl, token, orderName),
      (order, result) => `Duplicated ${result.source?.name ?? orderName} → ${order.name} on ${storeUrl}`
    );

  const runCustomBatch = (payload, count) =>
    runBatch(
      "custom",
      count,
      () => createOrderApi({ ...payload, storeUrl, token }),
      (order) => `Custom ${order.name} on ${storeUrl}`
    );

  const cancelOp = (opKey) => {
    if (cancelRefs[opKey]) cancelRefs[opKey].current = true;
  };

  const clearOp = (opKey) => {
    const setOp = setters[opKey];
    if (setOp) setOp(idleBatch);
    if (opKey === "fetch") setFetchOp(idleFetch);
  };

  const runFetch = async (orderId) => {
    if (fetchOp.loading) return;
    setFetchOp({ loading: true, order: null, error: "" });
    try {
      const order = await fetchOrderApi(storeUrl, token, orderId);
      setFetchOp({ loading: false, order, error: "" });
      showToast(`Fetched order ${order.name ?? orderId}`, "success");
    } catch (err) {
      setFetchOp({ loading: false, order: null, error: errText(err, "Failed to fetch order") });
      showToast("Failed to fetch order", "error");
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
        cancelOp, clearOp,
      }}
    >
      {children}
    </OrderOpsContext.Provider>
  );
}

export const useOrderOps = () => useContext(OrderOpsContext);
