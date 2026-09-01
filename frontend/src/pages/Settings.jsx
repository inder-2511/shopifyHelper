import MainLayout from "../components/layout/MainLayout";
import SavedStoresSection from "../components/settings/SavedStoresSection";
import SavedAddressesSection from "../components/settings/SavedAddressesSection";
import SavedTogglesSection from "../components/settings/SavedTogglesSection";
import ThemeSection from "../components/settings/ThemeSection";
import OrderSettingsSection from "../components/settings/OrderSettingsSection";
import BackendInfoSection from "../components/settings/BackendInfoSection";
import DangerZoneSection from "../components/settings/DangerZoneSection";

function Settings() {
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">Settings</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">
          App preferences and saved credentials
        </p>
      </div>

      <div className="space-y-5">
        <SavedStoresSection />
        <SavedAddressesSection />
        <SavedTogglesSection />
        <OrderSettingsSection />
        <ThemeSection />
        <BackendInfoSection />
        <DangerZoneSection />
      </div>
    </MainLayout>
  );
}

export default Settings;
