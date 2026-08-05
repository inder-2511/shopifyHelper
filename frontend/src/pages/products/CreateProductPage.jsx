import MainLayout from "../../components/layout/MainLayout";
import CreateProductForm from "../../components/products/CreateProductForm";

function CreateProductPage() {
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">Create Product</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">
          Add a new product to a Shopify store
        </p>
      </div>
      <CreateProductForm />
    </MainLayout>
  );
}

export default CreateProductPage;
