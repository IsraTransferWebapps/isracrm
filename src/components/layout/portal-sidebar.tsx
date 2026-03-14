'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  ArrowRightLeft,
  RefreshCw,
  Landmark,
  MessageSquare,
  FileUp,
  User,
  ClipboardList,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { Button } from '@/components/ui/button';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const ACTIVE_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/portal', icon: LayoutDashboard },
  { label: 'Balances', href: '/portal/balances', icon: Wallet },
  { label: 'Transactions', href: '/portal/transactions', icon: ArrowRightLeft },
  { label: 'Convert', href: '/portal/convert', icon: RefreshCw },
  { label: 'Beneficiaries', href: '/portal/beneficiaries', icon: Landmark },
  { label: 'Messages', href: '/portal/messages', icon: MessageSquare },
  { label: 'Documents', href: '/portal/documents', icon: FileUp },
  { label: 'Profile', href: '/portal/profile', icon: User },
];

const ONBOARDING_NAV_ITEMS: NavItem[] = [
  { label: 'Onboarding', href: '/portal/onboard', icon: ClipboardList },
  { label: 'Documents', href: '/portal/documents', icon: FileUp },
];

export function PortalSidebar() {
  const pathname = usePathname();
  const { signOut, clientStatus, clientId } = useOnboarding();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const supabase = useMemo(() => createClient(), []);

  const isActive = clientStatus === 'active';
  const navItems = isActive ? ACTIVE_NAV_ITEMS : ONBOARDING_NAV_ITEMS;

  // Fetch unread message count for active clients
  useEffect(() => {
    if (!isActive || !clientId) return;

    let portalConversationId: string | null = null;

    const fetchUnread = async () => {
      // Find the portal conversation for this client
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', clientId)
        .eq('channel', 'portal')
        .neq('status', 'closed')
        .limit(1)
        .maybeSingle();

      if (conv) {
        portalConversationId = conv.id;
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('sender_type', 'staff')
          .eq('is_read', false);
        setUnreadMessages(count ?? 0);
      } else {
        setUnreadMessages(0);
      }
    };

    fetchUnread();

    // Subscribe to message changes for real-time badge updates
    const channel = supabase
      .channel('portal-messages-badge')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const row = payload.new as Record<string, unknown> | undefined;
          if (row && row.conversation_id === portalConversationId) {
            fetchUnread();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isActive, clientId, supabase]);

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
        {navItems.map((item) => {
          // Dashboard is exact match only (to avoid /portal/xxx matching)
          const isItemActive =
            item.href === '/portal'
              ? pathname === '/portal'
              : pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          const badge =
            item.label === 'Messages' && unreadMessages > 0
              ? unreadMessages
              : undefined;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 relative',
                isItemActive
                  ? 'bg-[#EFF6FF] text-[#01A0FF]'
                  : 'text-[#717D93] hover:text-[#253859] hover:bg-[#F4F5F7]'
              )}
            >
              {isItemActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[#01A0FF]" />
              )}
              <Icon
                className={cn(
                  'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                  isItemActive ? 'text-[#01A0FF]' : 'text-[#94A3B8]'
                )}
              />
              <span className="flex-1">{item.label}</span>
              {badge !== undefined && (
                <span className="flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-[#01A0FF] text-white text-[10px] font-semibold">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
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
