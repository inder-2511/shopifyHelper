import { createContext, useContext, useEffect, useState } from "react";

const SavedStoresContext = createContext(null);
const STORAGE_KEY = "saved_stores";

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Take whatever the user typed and produce a canonical Shopify store URL.
 *   "mystore"                     → "mystore.myshopify.com"
 *   "  MyStore  "                 → "mystore.myshopify.com"
 *   "mystore.myshopify.com"       → "mystore.myshopify.com"
 *   "https://mystore.myshopify.com/" → "mystore.myshopify.com"
 */
export const normalizeStoreUrl = (raw) => {
  if (!raw) return "";
  let v = String(raw).trim().toLowerCase();
  v = v.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!v) return "";
  if (!v.endsWith(".myshopify.com")) v = `${v}.myshopify.com`;
  return v;
};

export function SavedStoresProvider({ children }) {
  const [stores, setStores] = useState(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stores));
  }, [stores]);

  const addStore = ({ name, storeUrl, token }) => {
    const trimmed = {
      name: (name ?? "").trim(),
      storeUrl: normalizeStoreUrl(storeUrl),
      token: (token ?? "").trim(),
    };
    if (!trimmed.name || !trimmed.storeUrl || !trimmed.token) return null;
    const id = `store_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const record = { id, ...trimmed };
    setStores((prev) => [...prev, record]);
    return record;
  };

  const updateStore = (id, patch) => {
    const normalized = { ...patch };
    if (typeof normalized.name === "string") normalized.name = normalized.name.trim();
    if (typeof normalized.storeUrl === "string") normalized.storeUrl = normalizeStoreUrl(normalized.storeUrl);
    if (typeof normalized.token === "string") normalized.token = normalized.token.trim();
    setStores((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...normalized } : s))
    );
  };

  const removeStore = (id) => {
    setStores((prev) => prev.filter((s) => s.id !== id));
  };

  const clearStores = () => setStores([]);

  return (
    <SavedStoresContext.Provider
      value={{ stores, addStore, updateStore, removeStore, clearStores }}
    >
      {children}
    </SavedStoresContext.Provider>
  );
}

export const useSavedStores = () => useContext(SavedStoresContext);
