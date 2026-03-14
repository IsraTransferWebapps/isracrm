'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Message } from '@/types/database';

export default function MessagesPage() {
  const { clientId, user, loading: authLoading } = useOnboarding();
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!clientId) return;

    try {
      const res = await fetch('/api/portal/messages');
      if (res.ok) {
        const data = await res.json();
        setMessages((data.messages as Message[]) ?? []);
        if (data.conversationId) setConversationId(data.conversationId);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Subscribe to new messages via Supabase Realtime
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel('portal-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, supabase]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const body = newMessage.trim();
    if (!body || !clientId || !user) return;

    setSending(true);
    setNewMessage('');

    try {
      const res = await fetch('/api/portal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });

      if (!res.ok) {
        setNewMessage(body); // Restore on error
      } else {
        const data = await res.json();
        // If we didn't have a conversationId yet, set it now
        if (!conversationId && data.message?.conversation_id) {
          setConversationId(data.message.conversation_id);
        }
      }
    } catch {
      setNewMessage(body);
    }

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#253859]">Messages</h1>
        <p className="mt-1 text-sm text-[#717D93]">Chat with your account manager</p>
      </div>

      <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden flex flex-col" style={{ height: '500px' }}>
        {/* Message List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length > 0 ? (
            messages.map((msg) => {
              const isClient = msg.sender_type === 'client';
              const isSystem = msg.sender_type === 'system' || msg.sender_type === 'bot';

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="bg-[#F4F5F7] rounded-lg px-3 py-1.5 text-xs text-[#94A3B8]">
                      {msg.body}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={cn('flex', isClient ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[75%] rounded-xl px-4 py-2.5',
                      isClient
                        ? 'bg-[#01A0FF] text-white rounded-br-sm'
                        : 'bg-[#F4F5F7] text-[#253859] rounded-bl-sm'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                    <p
                      className={cn(
                        'text-[10px] mt-1',
                        isClient ? 'text-white/70' : 'text-[#94A3B8]'
                      )}
                    >
                      {formatRelativeTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="h-10 w-10 text-[#E2E8F0] mb-3" />
              <p className="text-sm text-[#717D93]">No messages yet</p>
              <p className="text-xs text-[#94A3B8] mt-1">
                Start a conversation with your account manager
              </p>
            </div>
          )}
        </div>

        {/* Compose Bar */}
        <div className="border-t border-[#E2E8F0] px-4 py-3 bg-[#FAFBFC]">
          <div className="flex items-end gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 resize-none rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#253859] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#01A0FF]/20 focus:border-[#01A0FF]"
              style={{ maxHeight: '80px' }}
            />
            <Button
              size="icon"
              disabled={!newMessage.trim() || sending}
              onClick={sendMessage}
              className="h-9 w-9 flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-[#94A3B8] mt-1">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
