import Image from 'next/image';
import { headers } from 'next/headers';
import { Toaster } from 'sonner';
import { PortalAuthShell } from '@/components/layout/portal-auth-shell';

export const metadata = {
  title: 'IsraTransfer - Client Portal',
  description: 'Manage your account with IsraTransfer',
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Check if this is a public page (login/register) or an authenticated page
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  const isPublicPage = pathname.includes('/login') || pathname.includes('/register');

  // Public pages (login/register): simple centered layout without sidebar
  if (isPublicPage) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC]" dir="ltr" lang="en">
        <header className="border-b border-[#E2E8F0] bg-white">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center">
            <Image src="/logo-isratransfer.png" alt="IsraTransfer" width={140} height={24} priority />
          </div>
        </header>
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">{children}</main>
        <footer className="border-t border-[#E2E8F0] bg-white mt-auto">
          <div className="max-w-3xl mx-auto px-4 py-4 text-center">
            <p className="text-[11px] text-[#94A3B8]">
              IsraTransfer Ltd &mdash; Licence No. 57488 &mdash; Regulated by the Israel Securities Authority
            </p>
          </div>
        </footer>
        <Toaster position="top-right" />
      </div>
    );
  }

  // Authenticated pages: sidebar layout
  return (
    <div className="min-h-screen flex bg-[#F8FAFC]" dir="ltr" lang="en">
      <PortalAuthShell>{children}</PortalAuthShell>
      <Toaster position="top-right" />
    </div>
  );
}
