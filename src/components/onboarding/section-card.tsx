import { cn } from '@/lib/utils';

interface SectionCardProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ title, description, action, children, className }: SectionCardProps) {
  return (
    <div className={cn('rounded-xl border border-[#E2E8F0] bg-white p-6', className)}>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#253859]">{title}</h3>
          {description && (
            <p className="mt-1 text-xs text-[#94A3B8]">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}
