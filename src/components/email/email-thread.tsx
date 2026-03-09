'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDateTime, formatFileSize } from '@/lib/format';
import {
  ArrowDown,
  ArrowUp,
  Reply,
  Paperclip,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Email, EmailAttachment } from '@/types/database';

interface EmailThreadProps {
  threadId: string;
  staffUserId: string;
  onReply?: (email: Email) => void;
}

export function EmailThread({ threadId, staffUserId, onReply }: EmailThreadProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchThread = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('emails')
        .select('*, attachments:email_attachments(*)')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (data) setEmails(data as Email[]);
      setLoading(false);
    };

    fetchThread();
  }, [threadId]);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div
              className="h-4 w-48 rounded skeleton-brand"
              style={{ animationDelay: `${i * 100}ms` }}
            />
            <div
              className="h-32 w-full rounded-xl skeleton-brand"
              style={{ animationDelay: `${i * 100 + 50}ms` }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[#717D93] text-[13px]">No messages in this thread</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {emails.map((email) => {
        const isInbound = email.direction === 'inbound';
        const attachments = (email.attachments || []) as EmailAttachment[];

        return (
          <div
            key={email.id}
            className={cn(
              'flex',
              isInbound ? 'justify-start' : 'justify-end'
            )}
          >
            <div
              className={cn(
                'rounded-xl border border-[#E2E8F0] p-4 shadow-sm max-w-[85%] w-full',
                isInbound ? 'bg-[#F8FAFC]' : 'bg-[#EFF6FF]'
              )}
            >
              {/* Header: direction indicator, from name + address, timestamp */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {isInbound ? (
                    <ArrowDown className="h-3.5 w-3.5 text-[#059669]" />
                  ) : (
                    <ArrowUp className="h-3.5 w-3.5 text-[#01A0FF]" />
                  )}
                  <span className="text-[13px] font-semibold text-[#253859]">
                    {email.from_name || email.from_address}
                  </span>
                  <span className="text-[11px] text-[#94A3B8]">
                    &lt;{email.from_address}&gt;
                  </span>
                </div>
                <span className="text-[11px] text-[#94A3B8] flex-shrink-0 ml-3">
                  {formatDateTime(email.created_at)}
                </span>
              </div>

              {/* Body */}
              {email.body_html ? (
                <div
                  className="text-[13px] text-[#42526E] leading-relaxed prose prose-sm max-w-none prose-a:text-[#01A0FF] prose-a:no-underline hover:prose-a:underline"
                  dangerouslySetInnerHTML={{ __html: email.body_html }}
                />
              ) : (
                <div className="text-[13px] text-[#42526E] leading-relaxed whitespace-pre-wrap">
                  {email.body_text || '(No content)'}
                </div>
              )}

              {/* Tracking info for outbound */}
              {!isInbound && (
                <div className="flex items-center gap-3 mt-3 pt-2 border-t border-[#E2E8F0]">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
                    <CheckCircle2 className="h-3 w-3 text-[#059669]" />
                    <span>Delivered</span>
                  </div>
                  {email.opened_at && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
                      <Eye className="h-3 w-3 text-[#01A0FF]" />
                      <span>Opened {formatDateTime(email.opened_at)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="mt-3 pt-2 border-t border-[#E2E8F0]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Paperclip className="h-3 w-3 text-[#94A3B8]" />
                    <span className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wider">
                      Attachments ({attachments.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center gap-2 text-[12px] text-[#42526E] bg-white rounded-md px-2.5 py-1.5 border border-[#E2E8F0]"
                      >
                        <Paperclip className="h-3 w-3 text-[#94A3B8] flex-shrink-0" />
                        <span className="truncate">{att.filename}</span>
                        {att.size_bytes && (
                          <span className="text-[#94A3B8] flex-shrink-0">
                            {formatFileSize(att.size_bytes)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reply button */}
              {onReply && (
                <div className="mt-3 pt-2 border-t border-[#E2E8F0]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReply(email)}
                    className="border-[#E2E8F0] text-[#717D93] hover:bg-[#F4F5F7] hover:text-[#253859] h-7 text-[11px]"
                  >
                    <Reply className="h-3 w-3 mr-1.5" />
                    Reply
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
