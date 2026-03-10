'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ClipboardList, FileUp, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { label: 'Onboarding', href: '/portal/onboard', icon: ClipboardList },
  { label: 'Documents', href: '/portal/documents', icon: FileUp },
];

export function PortalSidebar() {
  const pathname = usePathname();
  const { signOut } = useOnboarding();

  return (
    <aside className="flex flex-col w-[200px] min-h-screen border-r border-[#E2E8F0] bg-[#FAFBFC]">
      {/* Brand Header */}
      <div className="flex items-center h-[60px] px-4 border-b border-[#E2E8F0]">
        <Image
          src="/logo-isratransfer.png"
          alt="IsraTransfer"
          width={120}
          height={20}
          className="h-5 w-auto"
          priority
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 relative',
                isActive
                  ? 'bg-[#EFF6FF] text-[#01A0FF]'
                  : 'text-[#717D93] hover:text-[#253859] hover:bg-[#F4F5F7]'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[#01A0FF]" />
              )}
              <Icon
                className={cn(
                  'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                  isActive ? 'text-[#01A0FF]' : 'text-[#94A3B8]'
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-[#E2E8F0]">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-[#717D93] hover:text-[#dc2626] hover:bg-[#fef2f2] text-[13px]"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
