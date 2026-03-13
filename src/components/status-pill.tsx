import { cn } from '@/lib/utils';
import type { StatusStyle } from '@/lib/status-styles';

interface StatusPillProps {
  style: StatusStyle;
  className?: string;
}

export function StatusPill({ style, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
        style.bg,
        style.text,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      {style.label}
    </span>
  );
}
