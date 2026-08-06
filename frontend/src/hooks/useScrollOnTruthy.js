import { useEffect, useRef } from "react";

/**
 * Smoothly scrolls the element referenced by `ref` into view the first time
 * `value` transitions from falsy to truthy. Doesn't fire on subsequent
 * truthy → truthy re-renders (e.g. when only a nested field changes).
 *
 * Usage:
 *   const resultsRef = useRef(null);
 *   useScrollOnTruthy(resultsRef, loading || orders.length > 0);
 *   ...
 *   <div ref={resultsRef}> ... </div>
 */
export function useScrollOnTruthy(ref, value, options = {}) {
  const { behavior = "smooth", block = "start" } = options;
  const wasTruthy = useRef(!!value);

  useEffect(() => {
    const nowTruthy = !!value;
    if (nowTruthy && !wasTruthy.current && ref.current) {
      // Defer to next paint so any layout shifts settle first.
      requestAnimationFrame(() => {
        ref.current?.scrollIntoView({ behavior, block });
      });
    }
    wasTruthy.current = nowTruthy;
  }, [value, ref, behavior, block]);
}
