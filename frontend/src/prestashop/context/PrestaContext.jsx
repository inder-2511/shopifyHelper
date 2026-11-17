import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { referenceDataApi } from "../api/prestaApi";

const PrestaContext = createContext(null);

const STORES_KEY = "presta_saved_stores";
const CREDS_KEY = "presta_creds";

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

/** "https://shop.com/" → "https://shop.com". Bare hosts are left as typed; the backend picks http/https. */
export const cleanShopUrl = (raw) =>
  String(raw ?? "").trim().replace(/\/+$/, "").replace(/\/api$/i, "");

export function PrestaProvider({ children }) {
  const [stores, setStores] = useState(() => read(STORES_KEY, []));
  const [creds, setCreds] = useState(() => read(CREDS_KEY, { shopUrl: "", apiKey: "" }));
  const [reference, setReference] = useState({ loading: false, data: null, error: null, forShop: null });

  useEffect(() => {
    localStorage.setItem(STORES_KEY, JSON.stringify(stores));
  }, [stores]);
  useEffect(() => {
    localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
  }, [creds]);

  const setShopUrl = (shopUrl) => setCreds((c) => ({ ...c, shopUrl }));
  const setApiKey = (apiKey) => setCreds((c) => ({ ...c, apiKey }));
  const pickStore = (s) => setCreds({ shopUrl: s.shopUrl, apiKey: s.apiKey });

  const addStore = ({ name, shopUrl, apiKey }) => {
    const record = {
      id: `ps_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
      name: (name ?? "").trim(),
      shopUrl: cleanShopUrl(shopUrl),
      apiKey: (apiKey ?? "").trim(),
    };
    if (!record.name || !record.shopUrl || !record.apiKey) return null;
    setStores((prev) => [...prev, record]);
    return record;
  };
  const updateStore = (id, patch) =>
    setStores((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              ...(patch.name !== undefined && { name: patch.name.trim() }),
              ...(patch.shopUrl !== undefined && { shopUrl: cleanShopUrl(patch.shopUrl) }),
              ...(patch.apiKey !== undefined && { apiKey: patch.apiKey.trim() }),
            }
          : s
      )
    );
  const removeStore = (id) => setStores((prev) => prev.filter((s) => s.id !== id));

  /** Countries, carriers, order states, currencies… needed by the order/product forms. */
  const loadReference = useCallback(async () => {
    setReference((r) => ({ ...r, loading: true, error: null }));
    try {
      const data = await referenceDataApi(creds);
      setReference({ loading: false, data, error: null, forShop: creds.shopUrl });
      return data;
    } catch (error) {
      setReference((r) => ({ ...r, loading: false, error }));
      throw error;
    }
  }, [creds]);

  const value = useMemo(
    () => ({
      stores, addStore, updateStore, removeStore,
      creds, setShopUrl, setApiKey, pickStore,
      reference, loadReference,
    }),
    [stores, creds, reference, loadReference]
  );

  return <PrestaContext.Provider value={value}>{children}</PrestaContext.Provider>;
}

export const usePresta = () => useContext(PrestaContext);
