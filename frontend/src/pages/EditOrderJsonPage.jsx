import MainLayout from "../components/layout/MainLayout";
import EditOrderJsonForm from "../components/orders/EditOrderJsonForm";

function EditOrderJsonPage() {
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">Edit JSON Order</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">
          Paste or fetch any order payload, edit any field by hand, then post it as a new order.
        </p>
      </div>
      <EditOrderJsonForm />
    </MainLayout>
  );
}

export default EditOrderJsonPage;
