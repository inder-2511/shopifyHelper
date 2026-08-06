import { createContext, useContext, useState } from "react";
import {
  createProductApi,
  duplicateProductApi,
  deleteProductApi,
  fetchProductApi,
  listProductsApi,
} from "../api/productApi";
import { useToast } from "./ToastContext";
import { classifyError } from "../utils/errorClassifier";

const ProductOpsContext = createContext(null);

const idleSlice = { loading: false, result: null, error: null };
const listIdleSlice = {
  loading: false,
  products: [],
  nextPageInfo: null,
  previousPageInfo: null,
  error: null,
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

  const handleFailure = (err, setOp, verb) => {
    const classified = classifyError(err);
    setOp({ loading: false, result: null, error: classified });
    showToast(`${classified.title} (${verb})`, "error");
  };

  const runCreate = async (payload) => {
    if (createOp.loading) return;
    setCreateOp({ loading: true, result: null, error: null });
    try {
      const data = await createProductApi({ storeUrl, token, ...payload });
      setCreateOp({ loading: false, result: data.product, error: null });
      showToast(`Created "${data.product.title}"`, "success");
    } catch (err) {
      handleFailure(err, setCreateOp, "create");
    }
  };

  const runDuplicate = async (productId) => {
    if (duplicateOp.loading) return;
    setDuplicateOp({ loading: true, result: null, error: null });
    try {
      const data = await duplicateProductApi(storeUrl, token, productId);
      setDuplicateOp({ loading: false, result: data, error: null });
      showToast(`Duplicated "${data.source.title}"`, "success");
    } catch (err) {
      handleFailure(err, setDuplicateOp, "duplicate");
    }
  };

  const runDelete = async (productId) => {
    if (deleteOp.loading) return;
    setDeleteOp({ loading: true, result: null, error: null });
    try {
      const data = await deleteProductApi(storeUrl, token, productId);
      setDeleteOp({ loading: false, result: data, error: null });
      showToast(`Deleted "${data.title ?? data.id}"`, "success");
      setListOp((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== data.id),
      }));
    } catch (err) {
      handleFailure(err, setDeleteOp, "delete");
    }
  };

  const runFetch = async (productId) => {
    if (fetchOp.loading) return;
    setFetchOp({ loading: true, result: null, error: null });
    try {
      const data = await fetchProductApi(storeUrl, token, productId);
      setFetchOp({ loading: false, result: data.product, error: null });
      showToast(`Fetched "${data.product.title}"`, "success");
    } catch (err) {
      handleFailure(err, setFetchOp, "fetch");
    }
  };

  const runList = async (opts = {}) => {
    if (listOp.loading) return;
    setListOp((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await listProductsApi(storeUrl, token, opts);
      setListOp({
        loading: false,
        products: data.products,
        nextPageInfo: data.nextPageInfo,
        previousPageInfo: data.previousPageInfo,
        error: null,
      });
    } catch (err) {
      const classified = classifyError(err);
      setListOp((prev) => ({ ...prev, loading: false, error: classified }));
      showToast(classified.title, "error");
    }
  };

  const clearError = (opKey) => {
    const setters = { create: setCreateOp, duplicate: setDuplicateOp, delete: setDeleteOp, fetch: setFetchOp };
    if (setters[opKey]) setters[opKey]((prev) => ({ ...prev, error: null }));
    if (opKey === "list") setListOp((prev) => ({ ...prev, error: null }));
  };

  const removeProductsFromList = (ids) => {
    const idSet = new Set(ids.map(String));
    setListOp((prev) => ({
      ...prev,
      products: prev.products.filter((p) => !idSet.has(String(p.id))),
    }));
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
        clearError,
        removeProductsFromList,
      }}
    >
      {children}
    </ProductOpsContext.Provider>
  );
}

export const useProductOps = () => useContext(ProductOpsContext);
