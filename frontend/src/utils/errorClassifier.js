/**
 * Classify an axios error from a Shopify Admin API call.
 * Returns:
 *   {
 *     kind:        one of "network" | "auth" | "forbidden" | "not_found" |
 *                  "validation" | "rate_limit" | "server" | "cors" | "unknown",
 *     retriable:   boolean — whether it's worth retrying (429 or transient server errors)
 *     status:      HTTP status if any
 *     title:       short label for UI (e.g. "Access token invalid")
 *     message:     detail line
 *     action:      what the user should do about it
 *   }
 */
export function classifyError(err) {
  // Axios network error (no response)
  if (!err.response) {
    // CORS shows up as a network error in browsers
    if (err.message?.includes("Network Error")) {
      return {
        kind: "network",
        retriable: true,
        status: null,
        title: "Can't reach the backend",
        message: err.message,
        action: "Backend may be waking up (Render free tier sleeps at 15min idle). Retry in ~30s. If it persists, check the backend URL in Settings.",
      };
    }
    return {
      kind: "network",
      retriable: true,
      status: null,
      title: "Network error",
      message: err.message ?? "No response from server",
      action: "Check your internet connection, then retry.",
    };
  }

  const status = err.response.status;
  const body = err.response.data;
  const shopifyErr = body?.error ?? body?.errors ?? body;
  const detail = typeof shopifyErr === "string" ? shopifyErr : JSON.stringify(shopifyErr);

  if (status === 401) {
    return {
      kind: "auth",
      retriable: false,
      status,
      title: "Access token invalid or expired",
      message: detail,
      action: "Update the Admin API token in Settings. Retrying won't help — the token needs to be fixed.",
    };
  }

  if (status === 403) {
    return {
      kind: "forbidden",
      retriable: false,
      status,
      title: "Missing required scope",
      message: detail,
      action: "The Admin token doesn't have permission for this operation. In Shopify admin → Apps → your app → Configuration, grant the required scope (e.g. write_orders, write_products) and reinstall the app to refresh the token.",
    };
  }

  if (status === 404) {
    return {
      kind: "not_found",
      retriable: false,
      status,
      title: "Not found",
      message: detail,
      action: "Check the store URL and the resource ID / name you entered. Retrying won't help.",
    };
  }

  if (status === 422) {
    // Try to pull out the Shopify field errors for a friendlier line
    let friendlyList = null;
    if (typeof shopifyErr === "object" && shopifyErr) {
      const parts = [];
      for (const [field, msgs] of Object.entries(shopifyErr)) {
        const arr = Array.isArray(msgs) ? msgs : [msgs];
        parts.push(`${field}: ${arr.join(", ")}`);
      }
      if (parts.length) friendlyList = parts.join(" • ");
    }
    return {
      kind: "validation",
      retriable: false,
      status,
      title: "Shopify rejected the payload",
      message: friendlyList ?? detail,
      action: "Fix the flagged fields (e.g. invalid variant ID, missing required field, wrong data type) and retry manually.",
    };
  }

  if (status === 429) {
    return {
      kind: "rate_limit",
      retriable: true,
      status,
      title: "Rate limit hit",
      message: detail,
      action: "Shopify is throttling you. The app is waiting 65s before retrying.",
    };
  }

  if (status >= 500 && status < 600) {
    return {
      kind: "server",
      retriable: true,
      status,
      title: `Shopify server error (${status})`,
      message: detail,
      action: "Shopify's servers had a hiccup. The app will retry a few times.",
    };
  }

  if (status === 501) {
    // Our own DISABLE_LOCAL_FEATURES gate
    return {
      kind: "not_supported",
      retriable: false,
      status,
      title: "Not available in production",
      message: detail,
      action: "This feature relies on browser automation and is disabled on the deployed backend. Run the app locally to use it.",
    };
  }

  return {
    kind: "unknown",
    retriable: false,
    status,
    title: `Request failed (${status})`,
    message: detail,
    action: "Check the payload and try again.",
  };
}
