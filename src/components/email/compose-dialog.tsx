'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Send, Paperclip, X, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { formatFileSize } from '@/lib/format';

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

// Max total attachment size: 25MB
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;
const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.gif,.zip';

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
  const [cc, setCc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens with new defaults
  useEffect(() => {
    if (open) {
      setTo(defaultTo);
      setCc('');
      setShowCc(false);
      // Add "Re: " prefix for replies if subject doesn't already have it
      const subj = defaultSubject || '';
      setSubject(inReplyTo && subj && !subj.startsWith('Re: ') ? `Re: ${subj}` : subj);
      setBody('');
      setAttachments([]);
      setError('');
    }
  }, [open, defaultTo, defaultSubject, inReplyTo]);

  /** Calculate total size of all attachments */
  const totalAttachmentSize = attachments.reduce((sum, f) => sum + f.size, 0);

  /** Handle file selection from the hidden input */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check total size with new files
    const newTotal = totalAttachmentSize + files.reduce((s, f) => s + f.size, 0);
    if (newTotal > MAX_TOTAL_SIZE) {
      setError(`Total attachments exceed 25 MB limit (current: ${formatFileSize(newTotal)})`);
      return;
    }

    setAttachments((prev) => [...prev, ...files]);
    setError('');

    // Reset the file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /** Remove an attachment by index */
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

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

    // Validate CC emails if provided
    if (cc.trim()) {
      const ccAddresses = cc.split(',').map((e) => e.trim()).filter(Boolean);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalid = ccAddresses.find((addr) => !emailRegex.test(addr));
      if (invalid) {
        setError(`Invalid CC email address: ${invalid}`);
        return;
      }
    }

    setSending(true);
    setError('');

    try {
      // Build FormData to support file attachments
      const formData = new FormData();
      formData.append('to', to.trim());
      formData.append('subject', subject.trim());
      formData.append('body', body.trim());

      if (cc.trim()) {
        formData.append('cc', cc.trim());
      }
      if (threadId) formData.append('threadId', threadId);
      if (clientId) formData.append('clientId', clientId);
      if (inReplyTo) formData.append('inReplyTo', inReplyTo);

      // Append each file attachment
      for (const file of attachments) {
        formData.append('attachments', file);
      }

      const response = await fetch('/api/emails/send', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type — browser sets it with boundary for FormData
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send email');
      }

      // Success — close dialog and notify parent
      onOpenChange(false);
      onSent?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
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

          {/* To + CC toggle */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-medium text-[#717D93] uppercase tracking-wider">
                To <span className="text-[#dc2626]">*</span>
              </Label>
              <button
                type="button"
                onClick={() => setShowCc(!showCc)}
                className="text-[11px] text-[#01A0FF] hover:text-[#0090e6] font-medium flex items-center gap-0.5 transition-colors"
              >
                CC
                {showCc ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            </div>
            <Input
              type="email"
              placeholder="recipient@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={inputClasses}
            />
          </div>

          {/* CC field — collapsible */}
          {showCc && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-[#717D93] uppercase tracking-wider">
                CC
              </Label>
              <Input
                type="text"
                placeholder="cc1@example.com, cc2@example.com"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className={inputClasses}
              />
              <p className="text-[10px] text-[#94A3B8]">
                Separate multiple addresses with commas
              </p>
            </div>
          )}

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

          {/* Attachments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-medium text-[#717D93] uppercase tracking-wider">
                Attachments
              </Label>
              {attachments.length > 0 && (
                <span className="text-[10px] text-[#94A3B8]">
                  {attachments.length} file{attachments.length !== 1 ? 's' : ''} · {formatFileSize(totalAttachmentSize)}
                </span>
              )}
            </div>

            {/* File list */}
            {attachments.length > 0 && (
              <div className="space-y-1.5">
                {attachments.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-[#717D93] flex-shrink-0" />
                      <span className="text-[12px] text-[#253859] truncate">{file.name}</span>
                      <span className="text-[10px] text-[#94A3B8] flex-shrink-0">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-[#94A3B8] hover:text-[#dc2626] transition-colors ml-2 flex-shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES}
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Attach button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="border-[#E2E8F0] text-[#717D93] hover:bg-[#F4F5F7] text-[11px] h-8"
            >
              <Paperclip className="h-3 w-3 mr-1.5" />
              Attach Files
            </Button>

            {totalAttachmentSize > 0 && (
              <div className="w-full bg-[#E2E8F0] rounded-full h-1">
                <div
                  className="bg-[#01A0FF] h-1 rounded-full transition-all"
                  style={{ width: `${Math.min((totalAttachmentSize / MAX_TOTAL_SIZE) * 100, 100)}%` }}
                />
              </div>
            )}
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
