import { Link } from "react-router-dom";
import {
  ShoppingBag,
  Store,
  Globe,
  Truck,
  Package,
  CreditCard,
  Clock,
  Activity,
  ArrowRight,
  Inbox,
  Copy,
  Sliders,
  Search,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { useActivity } from "../context/ActivityContext";

const HIDE_LOCAL_FEATURES = import.meta.env.VITE_HIDE_LOCAL_FEATURES === "true";

const quickActionsAll = [
  {
    label: "Create Order",
    description: "Place a new Shopify order",
    path: "/orders",
    icon: ShoppingBag,
    iconBg: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
  },
  {
    label: "Duplicate Order",
    description: "Re-create an existing order",
    path: "/orders/duplicate",
    icon: Copy,
    iconBg: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  },
  {
    label: "Custom Order",
    description: "Build an order with full field control",
    path: "/orders/custom",
    icon: Sliders,
    iconBg: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  },
  {
    label: "Fetch Order",
    description: "Look up any order and view its JSON",
    path: "/orders/fetch",
    icon: Search,
    iconBg: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
  },
  {
    label: "All Products",
    description: "Browse products across a store",
    path: "/products",
    icon: Package,
    iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  {
    label: "Create Store",
    description: "Spin up a dev store automatically",
    path: "/create-store",
    icon: Store,
    iconBg: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
    localOnly: true,
  },
  {
    label: "Setup Markets",
    description: "Configure Domestic + International",
    path: "/store-setup/markets",
    icon: Globe,
    iconBg: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
  },
  {
    label: "Setup Shipping",
    description: "US Warehouse + delivery zones",
    path: "/store-setup/shipping",
    icon: Truck,
    iconBg: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
  },
  {
    label: "Import Products",
    description: "Import from CSV with inventory",
    path: "/store-setup/products",
    icon: Package,
    iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  {
    label: "Activate Payment",
    description: "Enable third-party payment provider",
    path: "/store-setup/payment",
    icon: CreditCard,
    iconBg: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
    localOnly: true,
  },
];

const quickActions = quickActionsAll.filter((a) => !(HIDE_LOCAL_FEATURES && a.localOnly));

const TYPE_ICON_STYLE = {
  order: { icon: ShoppingBag, style: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" },
  store: { icon: Store, style: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" },
};

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800 dark:text-slate-100">{value}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function Dashboard() {
  const { activities } = useActivity();

  const orderCount = activities.filter((a) => a.type === "order").length;
  const storeCount = activities.filter((a) => a.type === "store").length;

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">Dashboard</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">Overview of your Shopify Helper activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Orders Created"
          value={orderCount}
          icon={ShoppingBag}
          accent="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
        />
        <StatCard
          label="Stores Created"
          value={storeCount}
          icon={Store}
          accent="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
        />
        <StatCard
          label="Total Actions"
          value={activities.length}
          icon={Activity}
          accent="bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="col-span-2">
          <h2 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.path}
                  to={action.path}
                  className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-3 hover:shadow-md dark:hover:bg-slate-700 transition-all group`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${action.iconBg}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{action.label}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{action.description}</p>
                  </div>
                  <ArrowRight size={14} className="text-gray-300 dark:text-slate-600 group-hover:text-gray-500 dark:group-hover:text-slate-400 transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-3">Recent Activity</h2>
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-600">
                <Inbox size={32} className="mb-2 opacity-40" />
                <p className="text-sm">No activity yet</p>
                <p className="text-xs mt-0.5">Actions will appear here</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-slate-700 max-h-[340px] overflow-y-auto">
                {activities.map((a) => {
                  const entry = TYPE_ICON_STYLE[a.type];
                  const Icon = entry?.icon ?? Activity;
                  const style = entry?.style ?? "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400";
                  return (
                    <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${style}`}>
                        <Icon size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 dark:text-slate-300 leading-snug">{a.message}</p>
                        <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                          <Clock size={10} />
                          {a.timestamp}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default Dashboard;
