import { useState } from "react";
import { Layers, Plus, Copy, Trash2, Search } from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import ListProducts from "../components/products/ListProducts";
import CreateProductForm from "../components/products/CreateProductForm";
import DuplicateProductForm from "../components/products/DuplicateProductForm";
import DeleteProductForm from "../components/products/DeleteProductForm";
import FetchProductForm from "../components/products/FetchProductForm";

const TABS = [
  { key: "list",      label: "All Products", icon: Layers },
  { key: "create",    label: "Create",       icon: Plus },
  { key: "duplicate", label: "Duplicate",    icon: Copy },
  { key: "delete",    label: "Delete",       icon: Trash2 },
  { key: "fetch",     label: "Fetch Details", icon: Search },
];

function Products() {
  const [tab, setTab] = useState("list");
  const [storeUrl, setStoreUrl] = useState(() => localStorage.getItem("product_storeUrl") ?? "");
  const [token, setToken]       = useState(() => localStorage.getItem("product_token") ?? "");

  const shared = { storeUrl, setStoreUrl, token, setToken };

  return (
    <MainLayout>
      <div className="mb-5">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">Products</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">
          Create, duplicate, delete, and fetch products via the Shopify Admin API
        </p>
      </div>

      <div className="flex gap-1.5 mb-5 border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === key
                ? "border-purple-500 text-purple-600 dark:text-purple-400"
                : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === "list"      && <ListProducts {...shared} />}
      {tab === "create"    && <CreateProductForm {...shared} />}
      {tab === "duplicate" && <DuplicateProductForm {...shared} />}
      {tab === "delete"    && <DeleteProductForm {...shared} />}
      {tab === "fetch"     && <FetchProductForm {...shared} />}
    </MainLayout>
  );
}

export default Products;
