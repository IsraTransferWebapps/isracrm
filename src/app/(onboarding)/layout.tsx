import Image from 'next/image';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'IsraTransfer - Client Onboarding',
  description: 'Complete your account setup with IsraTransfer',
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]" dir="ltr" lang="en">
      {/* Minimal header */}
      <header className="border-b border-[#E2E8F0] bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center">
          <Image
            src="/logo-isratransfer.svg"
            alt="IsraTransfer"
            width={140}
            height={24}
            priority
          />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {children}
      </main>

      {/* Footer */}
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
