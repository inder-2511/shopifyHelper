import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Settings,
  Store,
  ChevronRight,
  ChevronDown,
  Wrench,
} from "lucide-react";

import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

const orderItems = [
  { name: "Create Order",    path: "/orders" },
  { name: "Duplicate Order", path: "/orders/duplicate" },
  { name: "Custom Order",    path: "/orders/custom" },
  { name: "Fetch Order",     path: "/orders/fetch" },
];

const storeSetupItems = [
  { name: "Setup Markets",    path: "/store-setup/markets" },
  { name: "Setup Shipping",   path: "/store-setup/shipping" },
  { name: "Import Products",  path: "/store-setup/products" },
  { name: "Activate Payment", path: "/store-setup/payment" },
];

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

const HIDE_LOCAL_FEATURES = import.meta.env.VITE_HIDE_LOCAL_FEATURES === "true";

function Sidebar() {
  const location = useLocation();

  const isOrdersPath    = location.pathname.startsWith("/orders");
  const isStoreSetupPath = location.pathname.startsWith("/store-setup/");

  const [ordersOpen,     setOrdersOpen]     = useState(isOrdersPath);
  const [storeSetupOpen, setStoreSetupOpen] = useState(isStoreSetupPath);

  useEffect(() => {
    if (isOrdersPath)     setOrdersOpen(true);
    if (isStoreSetupPath) setStoreSetupOpen(true);
  }, [location.pathname]);

  const topItems = [
    { name: "Dashboard",    path: "/",            icon: <LayoutDashboard size={20} /> },
    { name: "Create Store", path: "/create-store", icon: <Store size={20} /> },
  ];

  const bottomItems = [
    { name: "Products", path: "/products", icon: <Package size={20} /> },
    { name: "Settings", path: "/settings", icon: <Settings size={20} /> },
  ];

  return (
    <div className="w-[280px] min-h-screen bg-[#060B27] text-white flex flex-col justify-between">
      <div>
        <div className="px-8 py-8">
          <h1 className="text-4xl font-bold leading-tight">
            Shopify
            <br />
            <span className="text-purple-500">Helper</span>
          </h1>
        </div>

        <nav className="px-4 flex flex-col gap-3">
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

          {/* Create Store — local only (Playwright) */}
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

          {/* Store Setup collapsible — local only (Playwright) */}
          {!HIDE_LOCAL_FEATURES && (
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

      <div className="p-5">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="font-semibold">version 1.0.26</h3>
          <p className="text-sm text-gray-400">by Inderbir Singh</p>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
