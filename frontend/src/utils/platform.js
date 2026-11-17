import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const STORAGE_KEY = "platform";

/**
 * The two stores the helper can drive. PrestaShop lives entirely under /presta/*,
 * so the URL is the source of truth: deep links and the back button just work.
 */
export const PLATFORMS = {
  shopify: {
    id: "shopify",
    name: "Shopify",
    home: "/",
    adminTitle: "Shopify Admin Panel",
    // Tailwind classes (written out in full so Tailwind can see them).
    activeCls: "bg-gradient-to-r from-purple-600 to-purple-500",
    accentText: "text-purple-400",
    logoFrom: "#a855f7",
    logoTo: "#6366f1",
  },
  prestashop: {
    id: "prestashop",
    name: "PrestaShop",
    home: "/presta",
    adminTitle: "PrestaShop Admin Panel",
    activeCls: "bg-gradient-to-r from-pink-600 to-rose-500",
    accentText: "text-pink-400",
    logoFrom: "#ec4899",
    logoTo: "#e11d48",
  },
};

export const platformFromPath = (pathname) =>
  pathname === "/presta" || pathname.startsWith("/presta/") ? "prestashop" : "shopify";

export const lastPlatform = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "prestashop" ? "prestashop" : "shopify";
  } catch {
    return "shopify";
  }
};

const remember = (id) => {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* private mode — switching still works, it just isn't remembered */
  }
};

export function usePlatform() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const platform = platformFromPath(pathname);

  useEffect(() => {
    remember(platform);
    document.title = `${PLATFORMS[platform].name} Helper`;
  }, [platform]);

  const setPlatform = (id) => {
    if (id === platform) return;
    remember(id); // before navigating, so the "/" redirect doesn't bounce us back
    navigate(PLATFORMS[id].home);
  };

  return { platform, config: PLATFORMS[platform], setPlatform };
}
