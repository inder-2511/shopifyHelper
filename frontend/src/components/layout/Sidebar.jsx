import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Settings,
  Store,
  ChevronRight,
  ChevronDown,
  Wrench,
  FileCode,
} from "lucide-react";

import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

const orderItems = [
  { name: "Create Order",    path: "/orders" },
  { name: "Duplicate Order", path: "/orders/duplicate" },
  { name: "Custom Order",    path: "/orders/custom" },
  { name: "Fetch Order",     path: "/orders/fetch" },
];

const productItems = [
  { name: "All Products",      path: "/products" },
  { name: "Create Product",    path: "/products/create" },
  { name: "Duplicate Product", path: "/products/duplicate" },
  { name: "Delete Product",    path: "/products/delete" },
  { name: "Fetch Product",     path: "/products/fetch" },
];

const createEnvItems = [
  { name: "Products",  path: "/create-env/products" },
  { name: "Toggles",   path: "/create-env/toggles" },
];

const HIDE_LOCAL_FEATURES = import.meta.env.VITE_HIDE_LOCAL_FEATURES === "true";

const storeSetupItemsAll = [
  { name: "Setup Markets",    path: "/store-setup/markets" },
  { name: "Setup Shipping",   path: "/store-setup/shipping" },
  { name: "Import Products",  path: "/store-setup/products" },
  { name: "Activate Payment", path: "/store-setup/payment", localOnly: true },
];

const storeSetupItems = storeSetupItemsAll.filter((i) => !(HIDE_LOCAL_FEATURES && i.localOnly));

function LogoMark({ size = 44 }) {
  return (
    <div
      className="rounded-xl overflow-hidden shrink-0"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
        <defs>
          <linearGradient id="sidebar-logo-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a855f7" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" fill="url(#sidebar-logo-bg)" />
        <path
          d="M22 26v-2.5a10 10 0 0 1 20 0V26h4.6l-2 22.4a3.5 3.5 0 0 1-3.5 3.1H20.9a3.5 3.5 0 0 1-3.5-3.1L15.4 26H22zm4 0h12v-2.5a6 6 0 0 0-12 0V26zm-1 6.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm14 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"
          fill="white"
        />
      </svg>
    </div>
  );
}

function CollapsibleMenu({ icon, label, items, isActive, open, onToggle, location }) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 text-left ${
          isActive || open ? "bg-white/10" : "hover:bg-white/10"
        }`}
      >
        {icon}
        <span className="text-lg flex-1">{label}</span>
        {open ? (
          <ChevronDown size={16} className="text-gray-400" />
        ) : (
          <ChevronRight size={16} className="text-gray-400" />
        )}
      </button>

      {open && (
        <div className="mt-1 flex flex-col gap-1 pl-4">
          {items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center pl-10 pr-4 py-3 rounded-2xl transition-all duration-200 text-base ${
                location.pathname === item.path
                  ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white"
                  : "hover:bg-white/10 text-gray-400"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Sidebar() {
  const location = useLocation();

  const isOrdersPath     = location.pathname.startsWith("/orders");
  const isProductsPath   = location.pathname === "/products" || location.pathname.startsWith("/products/");
  const isCreateEnvPath  = location.pathname === "/create-env" || location.pathname.startsWith("/create-env/");
  const isStoreSetupPath = location.pathname.startsWith("/store-setup/");

  const [ordersOpen,     setOrdersOpen]     = useState(isOrdersPath);
  const [productsOpen,   setProductsOpen]   = useState(isProductsPath);
  const [createEnvOpen,  setCreateEnvOpen]  = useState(isCreateEnvPath);
  const [storeSetupOpen, setStoreSetupOpen] = useState(isStoreSetupPath);

  useEffect(() => {
    if (isOrdersPath)     setOrdersOpen(true);
    if (isProductsPath)   setProductsOpen(true);
    if (isCreateEnvPath)  setCreateEnvOpen(true);
    if (isStoreSetupPath) setStoreSetupOpen(true);
  }, [location.pathname]);

  const bottomItems = [
    { name: "Settings", path: "/settings", icon: <Settings size={20} /> },
  ];

  return (
    <div className="w-[280px] h-screen sticky top-0 self-start bg-[#060B27] text-white flex flex-col">
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-6 py-6 flex items-center gap-3">
          <LogoMark size={44} />
          <h1 className="text-2xl font-bold leading-tight">
            Shopify
            <br />
            <span className="text-purple-400">Helper</span>
          </h1>
        </div>

        <nav className="px-4 pb-4 flex flex-col gap-3">
          {/* Dashboard */}
          <Link
            to="/"
            className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 ${
              location.pathname === "/" ? "bg-gradient-to-r from-purple-600 to-purple-500" : "hover:bg-white/10"
            }`}
          >
            <LayoutDashboard size={20} />
            <span className="text-lg">Dashboard</span>
          </Link>

          {/* Orders collapsible */}
          <CollapsibleMenu
            icon={<ShoppingBag size={20} />}
            label="Orders"
            items={orderItems}
            isActive={isOrdersPath}
            open={ordersOpen}
            onToggle={() => setOrdersOpen((p) => !p)}
            location={location}
          />

          {/* Products collapsible */}
          <CollapsibleMenu
            icon={<Package size={20} />}
            label="Products"
            items={productItems}
            isActive={isProductsPath}
            open={productsOpen}
            onToggle={() => setProductsOpen((p) => !p)}
            location={location}
          />

          {/* Create ENV collapsible */}
          <CollapsibleMenu
            icon={<FileCode size={20} />}
            label="Create ENV"
            items={createEnvItems}
            isActive={isCreateEnvPath}
            open={createEnvOpen}
            onToggle={() => setCreateEnvOpen((p) => !p)}
            location={location}
          />

          {/* Create Store — automated via Playwright (local only) */}
          {!HIDE_LOCAL_FEATURES && (
            <Link
              to="/create-store"
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 ${
                location.pathname === "/create-store" ? "bg-gradient-to-r from-purple-600 to-purple-500" : "hover:bg-white/10"
              }`}
            >
              <Store size={20} />
              <span className="text-lg">Create Store</span>
            </Link>
          )}

          {/* Store Setup collapsible — Markets/Shipping/Import use REST API and work in prod;
              Activate Payment is Playwright-only and filtered out when hidden. */}
          {storeSetupItems.length > 0 && (
            <CollapsibleMenu
              icon={<Wrench size={20} />}
              label="Store Setup"
              items={storeSetupItems}
              isActive={isStoreSetupPath}
              open={storeSetupOpen}
              onToggle={() => setStoreSetupOpen((p) => !p)}
              location={location}
            />
          )}

          {/* Bottom items */}
          {bottomItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 ${
                location.pathname === item.path ? "bg-gradient-to-r from-purple-600 to-purple-500" : "hover:bg-white/10"
              }`}
            >
              {item.icon}
              <span className="text-lg">{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="shrink-0 p-5">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="font-semibold">version 1.0.26</h3>
          <p className="text-sm text-gray-400">by Inderbir Singh</p>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
