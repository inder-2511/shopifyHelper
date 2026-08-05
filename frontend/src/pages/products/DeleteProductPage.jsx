import MainLayout from "../../components/layout/MainLayout";
import DeleteProductForm from "../../components/products/DeleteProductForm";

function DeleteProductPage() {
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">Delete Product</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">
          Permanently remove a product from a Shopify store
        </p>
      </div>
      <DeleteProductForm />
    </MainLayout>
  );
}

export default DeleteProductPage;
