import MainLayout from "../../components/layout/MainLayout";
import FetchProductForm from "../../components/products/FetchProductForm";

function FetchProductPage() {
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">Fetch Product</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">
          Look up a product by ID or title and view its full JSON
        </p>
      </div>
      <FetchProductForm />
    </MainLayout>
  );
}

export default FetchProductPage;
