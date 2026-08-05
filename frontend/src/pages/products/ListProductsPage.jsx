import MainLayout from "../../components/layout/MainLayout";
import ListProducts from "../../components/products/ListProducts";

function ListProductsPage() {
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">All Products</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">
          Browse and manage products across a Shopify store
        </p>
      </div>
      <ListProducts />
    </MainLayout>
  );
}

export default ListProductsPage;
