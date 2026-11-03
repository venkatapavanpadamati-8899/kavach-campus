import DashboardLayout from '@/components/layouts/DashboardLayout';

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="MANAGEMENT">
      {children}
    </DashboardLayout>
  );
}

