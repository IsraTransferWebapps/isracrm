'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTo?: string;
  defaultSubject?: string;
  threadId?: string;
  clientId?: string;
  inReplyTo?: string;
  onSent?: () => void;
}

export function ComposeDialog({
  open,
  onOpenChange,
  defaultTo = '',
  defaultSubject = '',
  threadId,
  clientId,
  inReplyTo,
  onSent,
}: ComposeDialogProps) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Reset form when dialog opens with new defaults
  useEffect(() => {
    if (open) {
      setTo(defaultTo);
      // Add "Re: " prefix for replies if subject doesn't already have it
      const subj = defaultSubject || '';
      setSubject(inReplyTo && subj && !subj.startsWith('Re: ') ? `Re: ${subj}` : subj);
      setBody('');
      setError('');
    }
  }, [open, defaultTo, defaultSubject, inReplyTo]);

  const handleSend = async () => {
    if (!to.trim()) {
      setError('Recipient email is required');
      return;
    }
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (!body.trim()) {
      setError('Message body is required');
      return;
    }

    setSending(true);
    setError('');

    try {
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          body: body.trim(),
          threadId: threadId || null,
          clientId: clientId || null,
          inReplyTo: inReplyTo || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send email');
      }

      // Success
      onOpenChange(false);
      onSent?.();
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const inputClasses =
    'bg-white border-[#E2E8F0] text-[#253859] placeholder:text-[#94A3B8] focus:border-[#01A0FF]/40 text-[13px] h-9';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#253859]">
            {inReplyTo ? 'Reply' : 'Compose Email'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <p className="text-[12px] text-[#dc2626] bg-[#fef2f2] px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* To */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-[#717D93] uppercase tracking-wider">
              To <span className="text-[#dc2626]">*</span>
            </Label>
            <Input
              type="email"
              placeholder="recipient@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={inputClasses}
            />
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-[#717D93] uppercase tracking-wider">
              Subject <span className="text-[#dc2626]">*</span>
            </Label>
            <Input
              placeholder="Email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={inputClasses}
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-[#717D93] uppercase tracking-wider">
              Message <span className="text-[#dc2626]">*</span>
            </Label>
            <Textarea
              placeholder="Write your message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="bg-white border-[#E2E8F0] text-[#253859] placeholder:text-[#94A3B8] focus:border-[#01A0FF]/40 text-[13px] min-h-[200px] resize-y"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#E2E8F0] text-[#717D93] hover:bg-[#F4F5F7] text-[12px]"
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="bg-[#01A0FF] hover:bg-[#0090e6] text-white text-[12px] shadow-sm shadow-[#01A0FF]/15"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
