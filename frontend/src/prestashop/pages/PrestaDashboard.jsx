import { Link } from "react-router-dom";
import {
  Activity, ArrowRight, Clock, Copy, Database, Inbox, Package, PackagePlus, Pencil, Search, ShoppingBag, UploadCloud,
} from "lucide-react";
import MainLayout from "../../components/layout/MainLayout";
import { useActivity } from "../../context/ActivityContext";

const tone = {
  pink: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
  cyan: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
  orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  sky: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
  gray: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400",
};

const quickActions = [
  { label: "Create Order", description: "Customer → cart → order in one go", path: "/presta/orders", icon: ShoppingBag, tone: tone.pink },
  { label: "Duplicate Order", description: "Re-create an order with a fresh cart", path: "/presta/orders/duplicate", icon: Copy, tone: tone.violet },
  { label: "Fetch Order", description: "Look up an order and view its JSON", path: "/presta/orders/fetch", icon: Search, tone: tone.cyan },
  { label: "Edit JSON Order", description: "Fetch, edit and PUT an order back", path: "/presta/orders/edit", icon: Pencil, tone: tone.orange },
  { label: "All Products", description: "Browse, duplicate and delete products", path: "/presta/products", icon: Package, tone: tone.emerald },
  { label: "Create Product", description: "Simple product with stock", path: "/presta/products/create", icon: PackagePlus, tone: tone.emerald },
  { label: "Import Products", description: "Create products from the CSV", path: "/presta/store-setup/import", icon: UploadCloud, tone: tone.sky },
  { label: "Store Info", description: "Test the key, browse countries, carriers, statuses", path: "/presta/store-setup/info", icon: Database, tone: tone.sky },
];

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}><Icon size={20} /></div>
      <div>
        <p className="text-2xl font-bold text-gray-800 dark:text-slate-100">{value}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function PrestaDashboard() {
  const { activities } = useActivity();
  const count = (t) => activities.filter((a) => a.type === t).length;

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">Dashboard</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">Overview of your PrestaShop Helper activity</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Orders" value={count("order")} icon={ShoppingBag} accent={tone.pink} />
        <StatCard label="Products" value={count("product")} icon={Package} accent={tone.emerald} />
        <StatCard label="Total Actions" value={activities.length} icon={Activity} accent={tone.gray} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <h2 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ label, description, path, icon: Icon, tone: t }) => (
              <Link key={path} to={path} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-3 hover:shadow-md dark:hover:bg-slate-700 transition-all group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t}`}><Icon size={18} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{label}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{description}</p>
                </div>
                <ArrowRight size={14} className="text-gray-300 dark:text-slate-600 group-hover:text-gray-500 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-3">Recent Activity</h2>
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-600">
                <Inbox size={32} className="mb-2 opacity-40" />
                <p className="text-sm">No activity yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-slate-700 max-h-[340px] overflow-y-auto">
                {activities.map((a) => (
                  <li key={a.id} className="px-4 py-3">
                    <p className="text-xs text-gray-700 dark:text-slate-300 leading-snug">{a.message}</p>
                    <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5 flex items-center gap-1"><Clock size={10} />{a.timestamp}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
