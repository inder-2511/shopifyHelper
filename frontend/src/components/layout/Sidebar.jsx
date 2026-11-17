import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Settings,
  Store,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  Check,
  ExternalLink,
  Wrench,
  FileCode,
} from "lucide-react";

import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { PLATFORMS, usePlatform } from "../../utils/platform";

const HIDE_LOCAL_FEATURES = import.meta.env.VITE_HIDE_LOCAL_FEATURES === "true";

// ---------------------------------------------------------------------------
// Navigation per platform. `match` decides which collapsible opens for a URL.
// ---------------------------------------------------------------------------
const under = (prefix) => (p) => p === prefix || p.startsWith(`${prefix}/`);

const shopifyNav = [
  { type: "link", name: "Dashboard", path: "/", icon: LayoutDashboard },
  {
    type: "menu", key: "orders", label: "Orders", icon: ShoppingBag, match: under("/orders"),
    items: [
      { name: "Create Order",    path: "/orders" },
      { name: "Duplicate Order", path: "/orders/duplicate" },
      { name: "Custom Order",    path: "/orders/custom" },
      { name: "Fetch Order",     path: "/orders/fetch" },
      { name: "Edit JSON Order", path: "/orders/edit-json" },
    ],
  },
  {
    type: "menu", key: "products", label: "Products", icon: Package, match: under("/products"),
    items: [
      { name: "All Products",      path: "/products" },
      { name: "Create Product",    path: "/products/create" },
      { name: "Duplicate Product", path: "/products/duplicate" },
      { name: "Delete Product",    path: "/products/delete" },
      { name: "Fetch Product",     path: "/products/fetch" },
    ],
  },
  {
    type: "menu", key: "create-env", label: "Create ENV", icon: FileCode, match: under("/create-env"),
    items: [
      { name: "Products", path: "/create-env/products" },
      { name: "Toggles",  path: "/create-env/toggles" },
    ],
  },
  // Create Store is automated via Playwright (local only)
  ...(HIDE_LOCAL_FEATURES ? [] : [{ type: "link", name: "Create Store", path: "/create-store", icon: Store }]),
  // Markets/Shipping/Import use the REST API and work in prod; Activate Payment is Playwright-only.
  {
    type: "menu", key: "store-setup", label: "Store Setup", icon: Wrench, match: under("/store-setup"),
    items: [
      { name: "Setup Markets",    path: "/store-setup/markets" },
      { name: "Setup Shipping",   path: "/store-setup/shipping" },
      { name: "Import Products",  path: "/store-setup/products" },
      { name: "Activate Payment", path: "/store-setup/payment", localOnly: true },
    ].filter((i) => !(HIDE_LOCAL_FEATURES && i.localOnly)),
  },
  { type: "link", name: "Settings", path: "/settings", icon: Settings },
];

const prestashopNav = [
  { type: "link", name: "Dashboard", path: "/presta", icon: LayoutDashboard },
  {
    type: "menu", key: "p-orders", label: "Orders", icon: ShoppingBag, match: under("/presta/orders"),
    items: [
      { name: "Create Order",    path: "/presta/orders" },
      { name: "Duplicate Order", path: "/presta/orders/duplicate" },
      { name: "Fetch Order",     path: "/presta/orders/fetch" },
      { name: "Edit JSON Order", path: "/presta/orders/edit" },
    ],
  },
  {
    type: "menu", key: "p-products", label: "Products", icon: Package, match: under("/presta/products"),
    items: [
      { name: "All Products",      path: "/presta/products" },
      { name: "Create Product",    path: "/presta/products/create" },
      { name: "Duplicate Product", path: "/presta/products/duplicate" },
      { name: "Delete Product",    path: "/presta/products/delete" },
      { name: "Fetch Product",     path: "/presta/products/fetch" },
    ],
  },
  {
    type: "menu", key: "p-store-setup", label: "Store Setup", icon: Wrench, match: under("/presta/store-setup"),
    items: [
      { name: "Import Products", path: "/presta/store-setup/import" },
      { name: "Store Info",      path: "/presta/store-setup/info" },
    ],
  },
  { type: "link", name: "Settings", path: "/presta/settings", icon: Settings },
];

const NAV = { shopify: shopifyNav, prestashop: prestashopNav };

// Other helpers that live in their own app. Shown in the logo dropdown and opened in a new tab.
const EXTERNAL_HELPERS = [
  { id: "woocommerce", name: "WooCommerce Helper", url: "https://woo-helper.vercel.app/", logoFrom: "#9b5c8f", logoTo: "#7f54b3" },
];

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------
function LogoMark({ platform, size = 44 }) {
  const { logoFrom, logoTo } = PLATFORMS[platform];
  const gradId = `sidebar-logo-bg-${platform}`;
  return (
    <div className="rounded-xl overflow-hidden shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={logoFrom} />
            <stop offset="1" stopColor={logoTo} />
          </linearGradient>
        </defs>
        <rect width="64" height="64" fill={`url(#${gradId})`} />
        {platform === "shopify" ? (
          <path
            d="M22 26v-2.5a10 10 0 0 1 20 0V26h4.6l-2 22.4a3.5 3.5 0 0 1-3.5 3.1H20.9a3.5 3.5 0 0 1-3.5-3.1L15.4 26H22zm4 0h12v-2.5a6 6 0 0 0-12 0V26zm-1 6.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm14 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"
            fill="white"
          />
        ) : (
          // Bold "P" for PrestaShop
          <path
            d="M23 14h13.5C44 14 49 18.6 49 25.6S44 37.2 36.5 37.2H30V50h-7V14zm7 6.2v10.8h5.9c3.6 0 5.8-2.1 5.8-5.4s-2.2-5.4-5.8-5.4H30z"
            fill="white"
          />
        )}
      </svg>
    </div>
  );
}

/** Small gradient tile with a "W" for the external WooCommerce helper. */
function ExternalMark({ from, to, size = 32 }) {
  return (
    <div
      className="rounded-xl shrink-0 flex items-center justify-center text-white font-extrabold"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${from}, ${to})`, fontSize: size * 0.5 }}
    >
      W
    </div>
  );
}

/** The logo + title doubles as the platform switcher. */
function PlatformSwitcher() {
  const { platform, config, setPlatform } = usePlatform();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative px-4 py-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Switch platform"
        className={`w-full flex items-center gap-3 px-2 py-2 rounded-2xl text-left transition-all ${open ? "bg-white/10" : "hover:bg-white/10"}`}
      >
        <LogoMark platform={platform} size={44} />
        <h1 className="text-2xl font-bold leading-tight flex-1">
          {config.name}
          <br />
          <span className={config.accentText}>Helper</span>
        </h1>
        <ChevronsUpDown size={16} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-4 right-4 top-[calc(100%-4px)] z-30 rounded-2xl bg-[#0d1438] border border-white/10 shadow-xl shadow-black/40 p-2"
        >
          <p className="px-3 pt-1 pb-2 text-[11px] uppercase tracking-wide text-gray-500">Switch platform</p>
          {Object.values(PLATFORMS).map((p) => {
            const selected = p.id === platform;
            return (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setOpen(false);
                  setPlatform(p.id);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${selected ? "bg-white/10" : "hover:bg-white/10"}`}
              >
                <LogoMark platform={p.id} size={32} />
                <span className="flex-1">
                  <span className="block text-base font-semibold">{p.name} Helper</span>
                </span>
                {selected && <Check size={16} className={p.accentText} />}
              </button>
            );
          })}

          <div className="my-1.5 border-t border-white/10" />
          {EXTERNAL_HELPERS.map((h) => (
            <a
              key={h.id}
              href={h.url}
              target="_blank"
              rel="noopener noreferrer"
              role="option"
              aria-selected={false}
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-white/10"
            >
              <ExternalMark from={h.logoFrom} to={h.logoTo} size={32} />
              <span className="flex-1 text-base font-semibold">{h.name}</span>
              <ExternalLink size={15} className="text-gray-400 shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function CollapsibleMenu({ icon, label, items, isActive, open, onToggle, location, activeCls }) {
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
                location.pathname === item.path ? `${activeCls} text-white` : "hover:bg-white/10 text-gray-400"
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
  const { platform, config } = usePlatform();
  const nav = NAV[platform];

  const [openKeys, setOpenKeys] = useState(() => new Set());

  // Open the menu that owns the current URL (and leave any the user opened).
  useEffect(() => {
    const owner = nav.find((n) => n.type === "menu" && n.match(location.pathname));
    if (owner) setOpenKeys((prev) => (prev.has(owner.key) ? prev : new Set(prev).add(owner.key)));
  }, [location.pathname, nav]);

  const toggle = (key) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <div className="w-[280px] h-screen sticky top-0 self-start bg-[#060B27] text-white flex flex-col">
      <div className="flex-1 overflow-y-auto min-h-0">
        <PlatformSwitcher />

        <nav className="px-4 pb-4 flex flex-col gap-3">
          {nav.map((entry) => {
            if (entry.type === "link") {
              const Icon = entry.icon;
              return (
                <Link
                  key={entry.path}
                  to={entry.path}
                  className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 ${
                    location.pathname === entry.path ? config.activeCls : "hover:bg-white/10"
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-lg">{entry.name}</span>
                </Link>
              );
            }
            if (entry.items.length === 0) return null;
            const Icon = entry.icon;
            return (
              <CollapsibleMenu
                key={entry.key}
                icon={<Icon size={20} />}
                label={entry.label}
                items={entry.items}
                isActive={entry.match(location.pathname)}
                open={openKeys.has(entry.key)}
                onToggle={() => toggle(entry.key)}
                location={location}
                activeCls={config.activeCls}
              />
            );
          })}
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
