'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { AuthProvider } from '@/components/providers/auth-provider';
import { useUser } from '@/hooks/use-user';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { loading, user } = useUser();

  if (loading) {
    return (
      <div className="flex h-screen bg-white">
        {/* Sidebar skeleton */}
        <div className="w-[240px] border-r border-[#E2E8F0] bg-[#FAFBFC] p-4 space-y-4">
          {/* Brand */}
          <div className="h-8 w-24 rounded-md skeleton-brand" />
          {/* Nav section label */}
          <div className="h-3 w-16 rounded skeleton-brand mt-6" />
          {/* Nav items */}
          <div className="space-y-2 mt-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-9 w-full rounded-lg skeleton-brand" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        </div>
        {/* Main content skeleton */}
        <div className="flex-1 flex flex-col">
          <div className="h-[60px] border-b border-[#E2E8F0] bg-white flex items-center px-6 gap-4">
            <div className="h-4 w-40 rounded skeleton-brand" />
            <div className="ml-auto h-8 w-56 rounded-lg skeleton-brand" />
          </div>
          <div className="flex-1 p-6 space-y-6">
            <div className="space-y-2">
              <div className="h-7 w-36 rounded skeleton-brand" />
              <div className="h-4 w-24 rounded skeleton-brand" style={{ animationDelay: '100ms' }} />
            </div>
            <div className="h-[400px] w-full rounded-xl skeleton-brand" style={{ animationDelay: '200ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Middleware will redirect to login
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-[#253859] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
