import MainLayout from "../../components/layout/MainLayout";
import DuplicateProductForm from "../../components/products/DuplicateProductForm";

function DuplicateProductPage() {
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">Duplicate Product</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">
          Clone an existing product as a new draft
        </p>
      </div>
      <DuplicateProductForm />
    </MainLayout>
  );
}

export default DuplicateProductPage;
