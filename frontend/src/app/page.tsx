import DashboardLayout from "./(dashboard)/layout";
import DashboardPage from "./(dashboard)/page";

export default function Root() {
  return (
    <DashboardLayout>
      <DashboardPage />
    </DashboardLayout>
  );
}
