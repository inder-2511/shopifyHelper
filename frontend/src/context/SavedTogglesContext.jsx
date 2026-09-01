import { createContext, useContext, useEffect, useState } from "react";

const SavedTogglesContext = createContext(null);
const STORAGE_KEY = "saved_toggles";
export const UUID_PLACEHOLDER = "{{UUID}}";

/**
 * Default toggle catalog. Each entry is a full JSON object-entry line (key + value + trailing comma)
 * with the store UUID replaced by `{{UUID}}`. On generate, that placeholder is swapped for the
 * user's account UUID.
 */
export const DEFAULT_TOGGLES = [
  `"${UUID_PLACEHOLDER}.tag.search.enabled": true,`,
  `"${UUID_PLACEHOLDER}.cancel.fulfilment.on.shopify.cancel.enabled": true,`,
  `"${UUID_PLACEHOLDER}.package.edit.enabled": true,`,
  `"${UUID_PLACEHOLDER}.order.presets.enabled": true,`,
  `"${UUID_PLACEHOLDER}.carrier.search.enabled": true,`,
  `"${UUID_PLACEHOLDER}.storepep.orders.pagesize": 100,`,
  `"${UUID_PLACEHOLDER}.new.carrier.page.enabled": true,`,
  `"${UUID_PLACEHOLDER}.touchless.printing.enabled": true,`,
  `"${UUID_PLACEHOLDER}.new.order.summary.page.enabled": true,`,
  `"${UUID_PLACEHOLDER}.config.for.order.search.enabled": true,`,
  `"${UUID_PLACEHOLDER}.sticky.header.all.orders.enabled": true,`,
  `"${UUID_PLACEHOLDER}.async.document.generation.enabled": true,`,
  `"${UUID_PLACEHOLDER}.search.in.order.summary.page.enabled": true,`,
  `"${UUID_PLACEHOLDER}.fulfilling.non.physical.products.enabled": true,`,
  `"${UUID_PLACEHOLDER}.remove.initial.status.and.refresh.on.change.enabled": true,`,
  `"${UUID_PLACEHOLDER}.show.and.edit.signature.on.quick.summary.details.section.enabled": true,`,
  `"${UUID_PLACEHOLDER}.quick.label.generation.and.order.fulfillment.on.summary.page.enabled": true,`,
  `"${UUID_PLACEHOLDER}.product.concepts.enabled": true,`,
  `"${UUID_PLACEHOLDER}.contextual.socket.notification.enabled": true,`,
  `"${UUID_PLACEHOLDER}.skip.order.webhook.postpone.enabled": true,`,
  `"${UUID_PLACEHOLDER}.partial.fulfilment.enabled": true,`,
  `"${UUID_PLACEHOLDER}.packing.view.enabled": true,`,
  `"${UUID_PLACEHOLDER}.auto.order.update.enabled": true,`,
  `"${UUID_PLACEHOLDER}.auto.order.update.status": ["INITIAL"],`,
  `"${UUID_PLACEHOLDER}.batch.retry.enabled": true,`,
  `"${UUID_PLACEHOLDER}.order.status.update.enabled": true,`,
  `"${UUID_PLACEHOLDER}.order.maxQuantityInLineItem.enabled": 350,`,
  `"${UUID_PLACEHOLDER}.order.update.notification.on.slgp.enabled": true,`,
  `"${UUID_PLACEHOLDER}.bulk.print.option.for.manifest.enabled": true,`,
  `"${UUID_PLACEHOLDER}.search.in.label.batch.page.enabled": true,`,
  `"${UUID_PLACEHOLDER}.batch.renaming.enabled": true,`,
  `"${UUID_PLACEHOLDER}.shipping.method.search.enabled.after.store.createdAt.greater.than": "2025-09-30",`,
  `"${UUID_PLACEHOLDER}.shipping.method.search.enabled": true,`,
  `"${UUID_PLACEHOLDER}.packing.slip.customise.enabled": true,`,
  `"${UUID_PLACEHOLDER}.cod.check.enabled": true,`,
  `"${UUID_PLACEHOLDER}.shipments.bluedart.use.orderDisplayIdAsRefId.enabled": true,`,
  `"${UUID_PLACEHOLDER}.print.documents.sorted.by.sku.enabled": true,`,
  `"${UUID_PLACEHOLDER}.orders.sort.by.sku.enabled": true,`,
  `"${UUID_PLACEHOLDER}.preferred.carrier.service.enabled": true,`,
  `"${UUID_PLACEHOLDER}.pick.list.batch.creation.enabled": true,`,
  `"${UUID_PLACEHOLDER}.advanced.batch.creation.enabled": true,`,
];

const makeRecord = (line) => ({
  id: `toggle_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
  line: line.trim(),
});

/** Any 8-4-4-4-12 hex UUID. Used to auto-substitute placeholders when the user pastes a full line. */
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Turn a pasted toggle line into template form (replace any hardcoded UUID with the placeholder). */
export const templatize = (line) => line.replace(UUID_RE, UUID_PLACEHOLDER);

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TOGGLES.map(makeRecord);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_TOGGLES.map(makeRecord);
    return parsed.filter((r) => r && typeof r.line === "string");
  } catch {
    return DEFAULT_TOGGLES.map(makeRecord);
  }
};

export function SavedTogglesProvider({ children }) {
  const [toggles, setToggles] = useState(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toggles));
  }, [toggles]);

  /**
   * Accepts a single line OR a block of many lines (split on newlines). Each non-empty line
   * becomes one record with its UUIDs templatized.
   */
  const addToggles = (rawInput) => {
    const lines = String(rawInput ?? "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map(templatize);
    if (!lines.length) return 0;
    const records = lines.map(makeRecord);
    setToggles((prev) => [...prev, ...records]);
    return records.length;
  };

  const removeToggle = (id) => {
    setToggles((prev) => prev.filter((t) => t.id !== id));
  };

  const clearToggles = () => setToggles([]);

  const resetToDefaults = () => setToggles(DEFAULT_TOGGLES.map(makeRecord));

  return (
    <SavedTogglesContext.Provider
      value={{ toggles, addToggles, removeToggle, clearToggles, resetToDefaults }}
    >
      {children}
    </SavedTogglesContext.Provider>
  );
}

export const useSavedToggles = () => useContext(SavedTogglesContext);
