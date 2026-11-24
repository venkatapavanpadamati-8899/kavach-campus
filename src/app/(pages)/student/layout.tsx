import DashboardLayout from '@/components/layouts/DashboardLayout';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="STUDENT">
      {children}
    </DashboardLayout>
  );
}
