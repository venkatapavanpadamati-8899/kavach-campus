import DashboardLayout from '@/components/layouts/DashboardLayout';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="STAFF">
      {children}
    </DashboardLayout>
  );
}
