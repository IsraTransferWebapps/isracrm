'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Users,
  ShieldCheck,
  LayoutDashboard,
  Search,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { ROLE_LABELS } from '@/lib/roles';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useState } from 'react';
import type { UserRole } from '@/types/database';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['management'],
  },
  {
    label: 'Clients',
    href: '/clients',
    icon: Users,
    roles: ['account_manager', 'compliance_officer', 'management'],
  },
  {
    label: 'Compliance',
    href: '/compliance',
    icon: ShieldCheck,
    roles: ['compliance_officer', 'management'],
  },
  {
    label: 'Search',
    href: '/search',
    icon: Search,
    roles: ['account_manager', 'compliance_officer', 'management'],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['account_manager', 'compliance_officer', 'management'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, role, signOut } = useUser();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) => role && item.roles.includes(role)
  );

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  return (
    <aside
      className={cn(
        'flex flex-col h-screen border-r border-[#E2E8F0] transition-all duration-300 ease-out',
        'bg-[#FAFBFC]',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Brand Header — IsraTransfer Logo */}
      <div className="flex items-center h-[60px] px-4 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2.5 min-w-0">
          {!collapsed ? (
            <Image
              src="/logo-isratransfer.png"
              alt="IsraTransfer"
              width={140}
              height={24}
              className="h-6 w-auto"
              priority
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#01A0FF] to-[#094BCC] flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white tracking-tight">IT</span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-7 w-7 text-[#94A3B8] hover:text-[#253859] hover:bg-[#F4F5F7] transition-colors"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Section label */}
      {!collapsed && (
        <div className="px-4 pt-5 pb-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#94A3B8]">
            Navigation
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className={cn('flex-1 px-2 space-y-0.5 overflow-y-auto', collapsed ? 'py-3' : 'py-1')}>
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          const linkContent = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 relative group',
                isActive
                  ? 'bg-[#EFF6FF] text-[#01A0FF]'
                  : 'text-[#717D93] hover:text-[#253859] hover:bg-[#F4F5F7]',
                collapsed && 'justify-center px-2'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[#01A0FF]" />
              )}
              <Icon
                className={cn(
                  'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                  isActive ? 'text-[#01A0FF]' : 'text-[#94A3B8] group-hover:text-[#717D93]'
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#dc2626]/10 text-[#dc2626] text-[10px] font-semibold px-1.5">
                  {item.badge}
                </span>
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger render={<span />}>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="bg-white border-[#E2E8F0] text-[#253859] shadow-lg">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}
      </nav>

      <div className="mx-3 h-px bg-[#E2E8F0]" />

      {/* User Profile Footer */}
      <div className={cn('p-3', collapsed && 'flex flex-col items-center')}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border border-[#E2E8F0]">
              <AvatarFallback className="bg-gradient-to-br from-[#094BCC] to-[#01A0FF] text-white text-[10px] font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#253859] truncate">
                {profile?.full_name || 'Loading...'}
              </p>
              <p className="text-[11px] text-[#94A3B8] truncate">
                {role ? ROLE_LABELS[role] : ''}
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-[#94A3B8] hover:text-[#dc2626] hover:bg-[#fef2f2] transition-colors"
                  onClick={signOut}
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-white border-[#E2E8F0] text-[#253859] shadow-lg">
                Sign out
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-[#717D93] hover:text-[#dc2626] hover:bg-[#fef2f2] transition-colors"
                onClick={signOut}
              >
                <Avatar className="h-7 w-7 border border-[#E2E8F0]">
                  <AvatarFallback className="bg-gradient-to-br from-[#094BCC] to-[#01A0FF] text-white text-[9px] font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-white border-[#E2E8F0] text-[#253859] shadow-lg">
              {profile?.full_name} — Sign out
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}
