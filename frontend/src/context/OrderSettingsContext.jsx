import { createContext, useContext, useEffect, useState } from "react";

const OrderSettingsContext = createContext(null);

const EDITABLE_ORDERS_KEY = "settings_editableOrders";

export function OrderSettingsProvider({ children }) {
  // Off by default: the direct POST /orders.json path is one API call instead of
  // three, which matters for large batches.
  const [editableOrders, setEditableOrders] = useState(
    () => localStorage.getItem(EDITABLE_ORDERS_KEY) === "true"
  );

  useEffect(() => {
    localStorage.setItem(EDITABLE_ORDERS_KEY, String(editableOrders));
  }, [editableOrders]);

  return (
    <OrderSettingsContext.Provider
      value={{
        editableOrders,
        setEditableOrders,
        toggleEditableOrders: () => setEditableOrders((v) => !v),
      }}
    >
      {children}
    </OrderSettingsContext.Provider>
  );
}

export const useOrderSettings = () => useContext(OrderSettingsContext);
