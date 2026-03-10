import { Toaster } from 'sonner';
import { PortalAuthShell } from '@/components/layout/portal-auth-shell';

export const metadata = {
  title: 'IsraTransfer - Client Portal',
  description: 'Manage your account with IsraTransfer',
};

export default function PortalAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[#F8FAFC]" dir="ltr" lang="en">
      <PortalAuthShell>{children}</PortalAuthShell>
      <Toaster position="top-right" />
    </div>
  );
}
