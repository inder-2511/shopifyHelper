import { useCallback, useState } from "react";
import { useToast } from "../../context/ToastContext";
import { classifyPrestaError } from "../utils/prestaErrors";

/**
 * Wraps one async API call with { loading, result, error } state and a toast.
 *   const op = useOp(fetchProductApi);
 *   op.run(creds, "42")       // → resolves with the result, or undefined on failure
 */
export function useOp(fn, { successToast } = {}) {
  const { showToast } = useToast();
  const [state, setState] = useState({ loading: false, result: null, error: null });

  const run = useCallback(
    async (...args) => {
      setState({ loading: true, result: null, error: null });
      try {
        const result = await fn(...args);
        setState({ loading: false, result, error: null });
        const msg = typeof successToast === "function" ? successToast(result) : successToast;
        if (msg) showToast(msg, "success");
        return result;
      } catch (err) {
        const error = classifyPrestaError(err);
        setState({ loading: false, result: null, error });
        showToast(error.title, "error");
        return undefined;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn]
  );

  const clearError = () => setState((s) => ({ ...s, error: null }));
  const reset = () => setState({ loading: false, result: null, error: null });

  return { ...state, run, clearError, reset };
}
