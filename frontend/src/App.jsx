import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import DuplicateOrderPage from "./pages/DuplicateOrderPage";
import FetchOrderPage from "./pages/FetchOrderPage";
import CustomOrderPage from "./pages/CustomOrderPage";
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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />

        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/duplicate" element={<DuplicateOrderPage />} />
        <Route path="/orders/custom" element={<CustomOrderPage />} />
        <Route path="/orders/fetch" element={<FetchOrderPage />} />

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
      </Routes>
    </BrowserRouter>
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
