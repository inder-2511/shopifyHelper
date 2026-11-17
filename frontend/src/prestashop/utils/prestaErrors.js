/**
 * Classify an axios error from our /api/presta/* endpoints.
 * Returns the same shape ErrorBanner already renders for Shopify:
 *   { kind, retriable, status, title, message, action, sentPayload }
 *
 * The backend sends { error, errors: [{code, message}], sentPayload }.
 */
export function classifyPrestaError(err) {
  if (!err.response) {
    return {
      kind: "network",
      retriable: true,
      status: null,
      title: "Can't reach the Helper backend",
      message: err.message ?? "No response from server",
      action: "Is the backend running? Locally: `npm run dev` in /backend. On Render, the free tier can take ~30s to wake up.",
    };
  }

  const status = err.response.status;
  const body = err.response.data ?? {};
  const list = Array.isArray(body.errors) ? body.errors : [];
  const message = list.length
    ? list.map((e) => (e.code ? `[${e.code}] ${e.message}` : e.message)).join(" • ")
    : typeof body.error === "string"
      ? body.error
      : JSON.stringify(body.error ?? body);
  const sentPayload = body.sentPayload ?? null;
  const base = { retriable: false, status, message, sentPayload };

  switch (status) {
    case 400:
    case 422:
      return {
        ...base,
        kind: "validation",
        title: "PrestaShop rejected the request",
        action: "Fix what the message points at and retry. If it says a parameter is \"not writable\" or required, check the sent XML below.",
      };
    case 401:
      return {
        ...base,
        kind: "auth",
        title: "API key invalid or disabled",
        action: "Back Office → Advanced Parameters → Webservice: check the key is copied exactly and its status is Enabled.",
      };
    case 403:
      return {
        ...base,
        kind: "forbidden",
        title: "API key lacks permission",
        action: "In Advanced Parameters → Webservice, open this key and tick the GET / POST / PUT / DELETE boxes for the resource named in the message.",
      };
    case 404:
      return {
        ...base,
        kind: "not_found",
        title: "Not found",
        action: "Check the ID / reference you entered. If every call returns 404, check the Shop URL points at the store root (the one containing /api).",
      };
    case 405:
      return {
        ...base,
        kind: "forbidden",
        title: "Method not allowed for this key",
        action: "The key can read this resource but not write it. Enable POST / PUT / DELETE for it in Advanced Parameters → Webservice.",
      };
    case 502:
      return {
        ...base,
        kind: "network",
        retriable: true,
        title: "Can't reach the PrestaShop store",
        action: "Check the Shop URL and that the store is online. http vs https matters — for local stores use http://localhost:PORT.",
      };
    case 503:
      return {
        ...base,
        kind: "server",
        retriable: true,
        title: "Webservice disabled or store in maintenance",
        action: "Enable it in Back Office → Advanced Parameters → Webservice → \"Enable PrestaShop's webservice\".",
      };
    default:
      if (status >= 500) {
        return {
          ...base,
          kind: "server",
          retriable: true,
          title: `PrestaShop server error (${status})`,
          action: "The store threw an error. Check the store's var/logs and the sent request below.",
        };
      }
      return { ...base, kind: "unknown", title: `Request failed (${status})`, action: "Check the request and try again." };
  }
}
