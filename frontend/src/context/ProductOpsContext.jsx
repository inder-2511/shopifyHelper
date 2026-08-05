import { createContext, useContext, useState } from "react";
import {
  createProductApi,
  duplicateProductApi,
  deleteProductApi,
  fetchProductApi,
  listProductsApi,
} from "../api/productApi";
import { useToast } from "./ToastContext";

const ProductOpsContext = createContext(null);

const idleSlice = { loading: false, result: null, error: "" };
const listIdleSlice = {
  loading: false,
  products: [],
  nextPageInfo: null,
  previousPageInfo: null,
  error: "",
};

const errText = (err, fallback) => {
  const msg = err.response?.data?.error ?? err.message ?? fallback;
  return typeof msg === "object" ? JSON.stringify(msg) : msg;
};

export function ProductOpsProvider({ children }) {
  const { showToast } = useToast();

  const [storeUrl, setStoreUrlState] = useState(
    () => localStorage.getItem("product_storeUrl") ?? ""
  );
  const [token, setTokenState] = useState(
    () => localStorage.getItem("product_token") ?? ""
  );

  const setStoreUrl = (v) => {
    setStoreUrlState(v);
    localStorage.setItem("product_storeUrl", v);
  };
  const setToken = (v) => {
    setTokenState(v);
    localStorage.setItem("product_token", v);
  };

  const [createOp, setCreateOp]       = useState(idleSlice);
  const [duplicateOp, setDuplicateOp] = useState(idleSlice);
  const [deleteOp, setDeleteOp]       = useState(idleSlice);
  const [fetchOp, setFetchOp]         = useState(idleSlice);
  const [listOp, setListOp]           = useState(listIdleSlice);

  const runCreate = async (payload) => {
    if (createOp.loading) return;
    setCreateOp({ loading: true, result: null, error: "" });
    try {
      const data = await createProductApi({ storeUrl, token, ...payload });
      setCreateOp({ loading: false, result: data.product, error: "" });
      showToast(`Created "${data.product.title}"`, "success");
    } catch (err) {
      setCreateOp({ loading: false, result: null, error: errText(err, "Failed to create product") });
      showToast("Failed to create product", "error");
    }
  };

  const runDuplicate = async (productId) => {
    if (duplicateOp.loading) return;
    setDuplicateOp({ loading: true, result: null, error: "" });
    try {
      const data = await duplicateProductApi(storeUrl, token, productId);
      setDuplicateOp({ loading: false, result: data, error: "" });
      showToast(`Duplicated "${data.source.title}"`, "success");
    } catch (err) {
      setDuplicateOp({ loading: false, result: null, error: errText(err, "Failed to duplicate product") });
      showToast("Failed to duplicate product", "error");
    }
  };

  const runDelete = async (productId) => {
    if (deleteOp.loading) return;
    setDeleteOp({ loading: true, result: null, error: "" });
    try {
      const data = await deleteProductApi(storeUrl, token, productId);
      setDeleteOp({ loading: false, result: data, error: "" });
      showToast(`Deleted "${data.title ?? data.id}"`, "success");
      // Also drop from cached list, if present
      setListOp((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== data.id),
      }));
    } catch (err) {
      setDeleteOp({ loading: false, result: null, error: errText(err, "Failed to delete product") });
      showToast("Failed to delete product", "error");
    }
  };

  const runFetch = async (productId) => {
    if (fetchOp.loading) return;
    setFetchOp({ loading: true, result: null, error: "" });
    try {
      const data = await fetchProductApi(storeUrl, token, productId);
      setFetchOp({ loading: false, result: data.product, error: "" });
      showToast(`Fetched "${data.product.title}"`, "success");
    } catch (err) {
      setFetchOp({ loading: false, result: null, error: errText(err, "Failed to fetch product") });
      showToast("Failed to fetch product", "error");
    }
  };

  const runList = async (opts = {}) => {
    if (listOp.loading) return;
    setListOp((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const data = await listProductsApi(storeUrl, token, opts);
      setListOp({
        loading: false,
        products: data.products,
        nextPageInfo: data.nextPageInfo,
        previousPageInfo: data.previousPageInfo,
        error: "",
      });
    } catch (err) {
      setListOp((prev) => ({
        ...prev,
        loading: false,
        error: errText(err, "Failed to list products"),
      }));
      showToast("Failed to list products", "error");
    }
  };

  return (
    <ProductOpsContext.Provider
      value={{
        storeUrl, setStoreUrl, token, setToken,
        createOp,    runCreate,
        duplicateOp, runDuplicate,
        deleteOp,    runDelete,
        fetchOp,     runFetch,
        listOp,      runList,
      }}
    >
      {children}
    </ProductOpsContext.Provider>
  );
}

export const useProductOps = () => useContext(ProductOpsContext);
