'use client';

import { Mail, ArrowDown, ArrowUp, Star, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import type { Email, Client } from '@/types/database';
import { getClientDisplayName } from '@/types/database';

// Relative time helper: "2m ago", "1h ago", "Yesterday", or formatted date
function relativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return formatDate(dateStr);
}

interface EmailListProps {
  emails: Email[];
  onEmailClick?: (email: Email) => void;
  showClient?: boolean;
  compact?: boolean;
}

export function EmailList({ emails, onEmailClick, showClient = false, compact = false }: EmailListProps) {
  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Mail className="h-10 w-10 text-[#E2E8F0] mb-3" />
        <p className="text-[#717D93] font-medium text-[14px]">No emails yet</p>
        <p className="text-[13px] text-[#94A3B8] mt-1">Emails will appear here once sent or received</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#E2E8F0]">
      {emails.map((email) => {
        const isUnread = !email.is_read;
        const isInbound = email.direction === 'inbound';
        // Display name: from_name for inbound, to_name or to_address for outbound
        const displayName = isInbound
          ? email.from_name || email.from_address
          : email.to_name || email.to_address;

        return (
          <div
            key={email.id}
            onClick={() => onEmailClick?.(email)}
            className={cn(
              'flex items-start gap-3 px-4 transition-colors cursor-pointer',
              compact ? 'py-2.5' : 'py-3.5',
              'hover:bg-[#F8FAFC]',
              isUnread && 'bg-[#FAFBFE]'
            )}
          >
            {/* Left: unread dot + direction arrow */}
            <div className="flex items-center gap-2 pt-0.5 flex-shrink-0">
              <div className="w-2 flex items-center justify-center">
                {isUnread && (
                  <span className="w-2 h-2 rounded-full bg-[#01A0FF]" />
                )}
              </div>
              {isInbound ? (
                <ArrowDown className="h-3.5 w-3.5 text-[#059669]" />
              ) : (
                <ArrowUp className="h-3.5 w-3.5 text-[#01A0FF]" />
              )}
            </div>

            {/* Middle: name, subject, snippet */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-[13px] truncate',
                    isUnread ? 'font-semibold text-[#253859]' : 'font-medium text-[#42526E]'
                  )}
                >
                  {displayName}
                </span>
                {showClient && email.client && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#EFF6FF] text-[#01A0FF] flex-shrink-0">
                    {getClientDisplayName(email.client as Client)}
                  </span>
                )}
                <span className="text-[12px] text-[#94A3B8] truncate hidden sm:inline">
                  {email.subject}
                </span>
              </div>
              {/* Subject on mobile */}
              <p
                className={cn(
                  'text-[12px] truncate sm:hidden',
                  isUnread ? 'text-[#253859]' : 'text-[#717D93]'
                )}
              >
                {email.subject}
              </p>
              {!compact && email.snippet && (
                <p className="text-[12px] text-[#94A3B8] truncate mt-0.5">
                  {email.snippet}
                </p>
              )}
            </div>

            {/* Right: time, star, attachment */}
            <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
              {email.has_attachments && (
                <Paperclip className="h-3.5 w-3.5 text-[#94A3B8]" />
              )}
              <Star
                className={cn(
                  'h-3.5 w-3.5',
                  email.is_starred
                    ? 'text-[#f59e0b] fill-[#f59e0b]'
                    : 'text-[#CBD5E1]'
                )}
              />
              <span className="text-[11px] text-[#94A3B8] w-16 text-right tabular-nums">
                {relativeTime(email.created_at)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
