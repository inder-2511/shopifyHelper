import { createContext, useContext, useRef, useState } from "react";
import { useActivity } from "../../context/ActivityContext";
import { useToast } from "../../context/ToastContext";
import { classifyPrestaError } from "../utils/prestaErrors";

const PrestaOpsContext = createContext(null);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_ATTEMPTS = 3;
// PrestaShop has no per-minute order limit like Shopify, but each order is ~5 API calls,
// so a short gap keeps shared hosting happy during big batches.
const GAP_MS = 250;

const idleBatch = {
  loading: false,
  progress: null,   // { done, total }
  orders: [],       // newest first
  error: null,      // classified error
  errorContext: "", // e.g. "stopped at order 3 of 10 — 2 succeeded"
  cancelled: false,
  dropped: [],      // fields the store wouldn't accept (read-only / unknown)
};

/**
 * Batch state lives here (not in the pages) so a running batch survives navigating
 * to another page, exactly like the Shopify helper's OrderOpsContext.
 */
export function PrestaOpsProvider({ children }) {
  const { addActivity } = useActivity();
  const { showToast } = useToast();

  const [createOp, setCreateOp] = useState(idleBatch);
  const [customOp, setCustomOp] = useState(idleBatch);
  const [duplicateOp, setDuplicateOp] = useState(idleBatch);

  const cancelRefs = { create: useRef(false), custom: useRef(false), duplicate: useRef(false) };
  const setters = { create: setCreateOp, custom: setCustomOp, duplicate: setDuplicateOp };

  /**
   * runner()        → one API call, resolves with the endpoint's result
   * toEntry(result) → the table row: { id, name, status, total, currency, source? }
   * label(result)   → Activity-panel text
   */
  const runBatch = async (opKey, count, { runner, toEntry, label, verb = "created" }) => {
    const setOp = setters[opKey];
    const cancelRef = cancelRefs[opKey];
    setOp({ ...idleBatch, loading: true, progress: { done: 0, total: count } });
    cancelRef.current = false;

    let done = 0;
    let stopped = null;

    for (let i = 0; i < count && !stopped; i++) {
      if (cancelRef.current) break;
      if (i > 0) await sleep(GAP_MS);

      let result = null;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        if (cancelRef.current) break;
        try {
          result = await runner(i);
          break;
        } catch (err) {
          const classified = classifyPrestaError(err);
          if (!classified.retriable || attempt === MAX_ATTEMPTS) {
            stopped = { classified, at: i + 1 };
            break;
          }
          await sleep(2000 * attempt);
        }
      }
      if (stopped || !result) break;

      const entry = { ...toEntry(result), createdAt: new Date().toLocaleTimeString() };
      done += 1;
      setOp((prev) => ({
        ...prev,
        orders: [entry, ...prev.orders],
        progress: { done, total: count },
        dropped: Array.from(new Set([...prev.dropped, ...(result.dropped ?? [])])),
      }));
      addActivity("order", label(result));
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
      showToast(`${done} order${done !== 1 ? "s" : ""} ${verb}!`, done ? "success" : "error");
      setOp((prev) => ({ ...prev, loading: false, cancelled: cancelRef.current }));
    }
    cancelRef.current = false;
  };

  const cancelOp = (opKey) => {
    if (cancelRefs[opKey]) cancelRefs[opKey].current = true;
  };
  const clearError = (opKey) => setters[opKey]?.((prev) => ({ ...prev, error: null, errorContext: "" }));

  return (
    <PrestaOpsContext.Provider value={{ createOp, customOp, duplicateOp, runBatch, cancelOp, clearError }}>
      {children}
    </PrestaOpsContext.Provider>
  );
}

export const usePrestaOps = () => useContext(PrestaOpsContext);
