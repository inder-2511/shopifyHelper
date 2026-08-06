import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Copy, CheckCircle2, PlusCircle, AlertTriangle } from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { useSavedStores } from "../context/SavedStoresContext";
import { useToast } from "../context/ToastContext";

const REQUIRED_SCOPES = [
  "read_products",
  "write_products",
  "read_inventory",
  "write_inventory",
  "read_locations",
  "read_orders",
  "write_orders",
  "read_customers",
  "write_customers",
  "read_shipping",
  "write_shipping",
  "read_markets",
  "write_markets",
];

const inputCls =
  "w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-400";

function Step({ n, title, children }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">
        {n}
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100 mb-1">{title}</h3>
        <div className="text-sm text-gray-600 dark:text-slate-300 space-y-2">{children}</div>
      </div>
    </div>
  );
}

function ExtLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline font-medium"
    >
      {children}
      <ExternalLink size={11} />
    </a>
  );
}

function AddStorePage() {
  const { addStore } = useSavedStores();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [label, setLabel] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);

  const scopesText = REQUIRED_SCOPES.join(",");

  const handleCopyScopes = () => {
    navigator.clipboard.writeText(scopesText);
    setCopied(true);
    showToast("Scopes copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const cleanUrl = storeUrl.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    const record = addStore({ name: label, storeUrl: cleanUrl, token });
    if (!record) {
      showToast("All three fields are required", "error");
      return;
    }
    showToast(`Saved "${record.name}" — you can now use it anywhere`, "success");
    navigate("/settings");
  };

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">Add Store</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">
          Connect a Shopify development store to Shopify Helper
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Instructions */}
        <section className="col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100">
            Set up in 4 steps
          </h2>

          <Step n={1} title="Create a development store">
            <p>
              Open{" "}
              <ExtLink href="https://partners.shopify.com/organizations">
                Shopify Partners → Stores
              </ExtLink>
              , click <strong>Add store</strong>, choose{" "}
              <strong>Create development store</strong>, and fill in a name.
              Shopify creates the store in ~10 seconds.
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Don't have a Partner account?{" "}
              <ExtLink href="https://www.shopify.com/partners">Sign up here</ExtLink> (free).
            </p>
          </Step>

          <Step n={2} title="Create a custom app on that store">
            <p>Inside the new store, go to:</p>
            <div className="text-xs font-mono bg-gray-50 dark:bg-slate-900/40 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-gray-700 dark:text-slate-300">
              Settings → Apps and sales channels → Develop apps → Create an app
            </div>
            <p>Name it <strong>Shopify Helper</strong> (or anything).</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              If "Develop apps" is greyed out, click <strong>Allow custom app development</strong> first.
            </p>
          </Step>

          <Step n={3} title="Grant Admin API scopes">
            <p>
              In the app → <strong>Configuration</strong> tab → <strong>Admin API access scopes</strong>{" "}
              → search and enable these scopes:
            </p>
            <div className="bg-gray-50 dark:bg-slate-900/40 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-slate-700">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400">
                  {REQUIRED_SCOPES.length} scopes
                </span>
                <button
                  type="button"
                  onClick={handleCopyScopes}
                  className="flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
                >
                  {copied ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                  {copied ? "Copied" : "Copy list"}
                </button>
              </div>
              <div className="p-3 flex flex-wrap gap-1.5">
                {REQUIRED_SCOPES.map((s) => (
                  <span
                    key={s}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <p>Click <strong>Save</strong> at the top-right of the Configuration page.</p>
          </Step>

          <Step n={4} title="Install & grab the Admin API access token">
            <p>
              Go to the <strong>API credentials</strong> tab → click <strong>Install app</strong>{" "}
              → confirm. Shopify then shows the <strong>Admin API access token</strong>{" "}
              (starts with <code className="text-xs font-mono bg-gray-100 dark:bg-slate-900/60 px-1 rounded">shpat_</code>) — this appears exactly once, so copy it.
            </p>
            <p>
              Paste the store URL and token in the form on the right → <strong>Save</strong>. The store
              will show up in the store picker on every Order and Product page.
            </p>
          </Step>

          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>
              Your access token stays in this browser's localStorage — it never touches
              our backend beyond being forwarded to Shopify on each request. Treat it like a password.
            </span>
          </div>
        </section>

        {/* Save form */}
        <section className="col-span-1 self-start bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-6 sticky top-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-1">Save store</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
            Fill this after step 4.
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                Label
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Test Store"
                required
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                Store URL
              </label>
              <input
                type="text"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                placeholder="mystore.myshopify.com"
                required
                className={inputCls}
              />
              <p className="text-[11px] text-gray-500 dark:text-slate-500 mt-1">
                The <code>*.myshopify.com</code> domain, not your custom domain.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                Admin API access token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="shpat_..."
                required
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-all"
            >
              <PlusCircle size={15} />
              Save store
            </button>
          </form>
        </section>
      </div>
    </MainLayout>
  );
}

export default AddStorePage;
