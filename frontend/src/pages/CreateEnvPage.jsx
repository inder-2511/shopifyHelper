import MainLayout from "../components/layout/MainLayout";
import CreateEnvForm from "../components/env/CreateEnvForm";

function CreateEnvPage() {
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">Create ENV</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">
          Fetch products from a store, pick one or more of each type (simple / variable / digital),
          and copy the resulting ENV block for use elsewhere.
        </p>
      </div>
      <CreateEnvForm />
    </MainLayout>
  );
}

export default CreateEnvPage;
