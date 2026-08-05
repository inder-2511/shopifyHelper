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

export function SavedStoresProvider({ children }) {
  const [stores, setStores] = useState(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stores));
  }, [stores]);

  const addStore = ({ name, storeUrl, token }) => {
    const trimmed = {
      name: name.trim(),
      storeUrl: storeUrl.trim(),
      token: token.trim(),
    };
    if (!trimmed.name || !trimmed.storeUrl || !trimmed.token) return null;
    const id = `store_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const record = { id, ...trimmed };
    setStores((prev) => [...prev, record]);
    return record;
  };

  const updateStore = (id, patch) => {
    setStores((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
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
