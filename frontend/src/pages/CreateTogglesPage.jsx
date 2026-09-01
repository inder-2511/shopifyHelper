import MainLayout from "../components/layout/MainLayout";
import CreateTogglesForm from "../components/env/CreateTogglesForm";

function CreateTogglesPage() {
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">Create Toggles</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">
          Enter the target store's account UUID — every toggle in your saved catalog gets
          re-keyed with it, ready to paste into the store config.
        </p>
      </div>
      <CreateTogglesForm />
    </MainLayout>
  );
}

export default CreateTogglesPage;
