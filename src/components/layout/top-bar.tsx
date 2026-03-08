'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUser } from '@/hooks/use-user';

export function TopBar() {
  const router = useRouter();
  const { profile } = useUser();

  // Cmd+K / Ctrl+K keyboard shortcut for global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        router.push('/search');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="h-[60px] border-b border-[#E2E8F0] bg-white/80 backdrop-blur-md flex items-center justify-between px-6">
      {/* Left side — Greeting */}
      <div className="flex items-center gap-4">
        <p className="text-[13px] text-[#717D93]">
          {getGreeting()},{' '}
          <span className="text-[#253859] font-medium">
            {profile?.full_name?.split(' ')[0] || '...'}
          </span>
        </p>
      </div>

      {/* Right side — Search + Notifications */}
      <div className="flex items-center gap-3">
        {/* Search trigger */}
        <button
          onClick={() => router.push('/search')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F4F5F7] border border-[#E2E8F0] text-[#717D93] text-[13px] hover:bg-[#EFF6FF] hover:border-[#CBD5E1] transition-all cursor-pointer w-56"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search...</span>
          <kbd className="ml-auto text-[10px] font-mono bg-white px-1.5 py-0.5 rounded text-[#94A3B8] border border-[#E2E8F0]">
            ⌘K
          </kbd>
        </button>

        {/* Notification bell */}
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 text-[#94A3B8] hover:text-[#253859] hover:bg-[#F4F5F7] transition-colors"
            >
              <Bell className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-white border-[#E2E8F0] text-[#253859] shadow-lg">
            Notifications
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
