'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface QuoteTimerProps {
  expiresAt: string;
  onExpired: () => void;
}

export function QuoteTimer({ expiresAt, onExpired }: QuoteTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const urgency = secondsLeft <= 5 ? 'critical' : secondsLeft <= 15 ? 'warning' : 'normal';

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'flex items-center justify-center h-8 min-w-[56px] rounded-lg px-3 text-sm font-mono font-semibold transition-colors',
          urgency === 'critical' && 'bg-red-50 text-red-700',
          urgency === 'warning' && 'bg-amber-50 text-amber-700',
          urgency === 'normal' && 'bg-[#EFF6FF] text-[#01A0FF]'
        )}
      >
        {secondsLeft}s
      </div>
      <span className="text-xs text-[#94A3B8]">until quote expires</span>
    </div>
  );
}
