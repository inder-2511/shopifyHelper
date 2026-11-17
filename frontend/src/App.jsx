import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import DuplicateOrderPage from "./pages/DuplicateOrderPage";
import FetchOrderPage from "./pages/FetchOrderPage";
import CustomOrderPage from "./pages/CustomOrderPage";
import EditOrderJsonPage from "./pages/EditOrderJsonPage";
import ListProductsPage from "./pages/products/ListProductsPage";
import CreateProductPage from "./pages/products/CreateProductPage";
import DuplicateProductPage from "./pages/products/DuplicateProductPage";
import DeleteProductPage from "./pages/products/DeleteProductPage";
import FetchProductPage from "./pages/products/FetchProductPage";
import Settings from "./pages/Settings";
import CreateStore from "./pages/CreateStore";
import CreateEnvPage from "./pages/CreateEnvPage";
import CreateTogglesPage from "./pages/CreateTogglesPage";
import SetupMarketsPage from "./pages/store-setup/SetupMarketsPage";
import SetupShippingPage from "./pages/store-setup/SetupShippingPage";
import ImportProductsPage from "./pages/store-setup/ImportProductsPage";
import ActivatePaymentPage from "./pages/store-setup/ActivatePaymentPage";
import { ActivityProvider } from "./context/ActivityContext";
import { StoreCreationProvider } from "./context/StoreCreationContext";
import { ProductOpsProvider } from "./context/ProductOpsContext";
import { OrderOpsProvider } from "./context/OrderOpsContext";
import { OrderSettingsProvider } from "./context/OrderSettingsContext";
import { SavedStoresProvider } from "./context/SavedStoresContext";
import { SavedAddressesProvider } from "./context/SavedAddressesContext";
import { SavedTogglesProvider } from "./context/SavedTogglesContext";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";
import { PrestaProvider } from "./prestashop/context/PrestaContext";
import { lastPlatform } from "./utils/platform";
import PrestaDashboard from "./prestashop/pages/PrestaDashboard";
import PrestaSettings from "./prestashop/pages/PrestaSettings";
import {
  CreateOrderPage as PrestaCreateOrder,
  DuplicateOrderPage as PrestaDuplicateOrder,
  FetchOrderPage as PrestaFetchOrder,
  EditOrderPage as PrestaEditOrder,
} from "./prestashop/pages/OrderPages";
import {
  ListProductsPage as PrestaListProducts,
  CreateProductPage as PrestaCreateProduct,
  DuplicateProductPage as PrestaDuplicateProduct,
  DeleteProductPage as PrestaDeleteProduct,
  FetchProductPage as PrestaFetchProduct,
} from "./prestashop/pages/ProductPages";
import {
  StoreInfoPage as PrestaStoreInfo,
  ImportProductsPage as PrestaImportProducts,
} from "./prestashop/pages/StorePages";

// Reopen on whichever platform was used last.
const Home = () => (lastPlatform() === "prestashop" ? <Navigate to="/presta" replace /> : <Dashboard />);

function App() {
  return (
    <ThemeProvider>
    <ToastProvider>
    <ActivityProvider>
    <SavedStoresProvider>
    <SavedAddressesProvider>
    <SavedTogglesProvider>
    <StoreCreationProvider>
    <OrderSettingsProvider>
    <OrderOpsProvider>
    <ProductOpsProvider>
    <PrestaProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/duplicate" element={<DuplicateOrderPage />} />
        <Route path="/orders/custom" element={<CustomOrderPage />} />
        <Route path="/orders/fetch" element={<FetchOrderPage />} />
        <Route path="/orders/edit-json" element={<EditOrderJsonPage />} />

        <Route path="/products" element={<ListProductsPage />} />
        <Route path="/products/create" element={<CreateProductPage />} />
        <Route path="/products/duplicate" element={<DuplicateProductPage />} />
        <Route path="/products/delete" element={<DeleteProductPage />} />
        <Route path="/products/fetch" element={<FetchProductPage />} />

        <Route path="/create-env" element={<CreateEnvPage />} />
        <Route path="/create-env/products" element={<CreateEnvPage />} />
        <Route path="/create-env/toggles" element={<CreateTogglesPage />} />

        <Route path="/settings" element={<Settings />} />

        <Route path="/create-store" element={<CreateStore />} />

        <Route path="/store-setup/markets" element={<SetupMarketsPage />} />

        <Route path="/store-setup/shipping" element={<SetupShippingPage />} />

        <Route path="/store-setup/products" element={<ImportProductsPage />} />

        <Route path="/store-setup/payment" element={<ActivatePaymentPage />} />

        {/* PrestaShop */}
        <Route path="/presta" element={<PrestaDashboard />} />
        <Route path="/presta/orders" element={<PrestaCreateOrder />} />
        <Route path="/presta/orders/duplicate" element={<PrestaDuplicateOrder />} />
        <Route path="/presta/orders/fetch" element={<PrestaFetchOrder />} />
        <Route path="/presta/orders/edit" element={<PrestaEditOrder />} />
        <Route path="/presta/products" element={<PrestaListProducts />} />
        <Route path="/presta/products/create" element={<PrestaCreateProduct />} />
        <Route path="/presta/products/duplicate" element={<PrestaDuplicateProduct />} />
        <Route path="/presta/products/delete" element={<PrestaDeleteProduct />} />
        <Route path="/presta/products/fetch" element={<PrestaFetchProduct />} />
        <Route path="/presta/store-setup/import" element={<PrestaImportProducts />} />
        <Route path="/presta/store-setup/info" element={<PrestaStoreInfo />} />
        <Route path="/presta/settings" element={<PrestaSettings />} />
      </Routes>
    </BrowserRouter>
    </PrestaProvider>
    </ProductOpsProvider>
    </OrderOpsProvider>
    </OrderSettingsProvider>
    </StoreCreationProvider>
    </SavedTogglesProvider>
    </SavedAddressesProvider>
    </SavedStoresProvider>
    </ActivityProvider>
    </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
