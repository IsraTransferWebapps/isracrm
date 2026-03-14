'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { MessageCircle, MessageSquare, Mail, Send, ExternalLink, Inbox } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { formatRelativeTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type {
  Conversation,
  Message,
  ConversationChannel,
  ConversationStatus,
  Client,
  getClientDisplayName as GetClientDisplayNameFn,
} from '@/types/database';
import { getClientDisplayName } from '@/types/database';

// --- Channel config ---

const CHANNEL_CONFIG: Record<ConversationChannel, { icon: typeof MessageCircle; color: string; label: string }> = {
  whatsapp: { icon: MessageCircle, color: '#25D366', label: 'WhatsApp' },
  live_chat: { icon: MessageSquare, color: '#01A0FF', label: 'Live Chat' },
  portal: { icon: Mail, color: '#8B5CF6', label: 'Portal' },
};

const STATUS_STYLES: Record<ConversationStatus, { bg: string; text: string; dot: string }> = {
  open: { bg: 'bg-[#ecfdf5]', text: 'text-[#059669]', dot: 'bg-[#10b981]' },
  waiting_on_client: { bg: 'bg-[#fffbeb]', text: 'text-[#d97706]', dot: 'bg-[#f59e0b]' },
  waiting_on_staff: { bg: 'bg-[#eff6ff]', text: 'text-[#0284c7]', dot: 'bg-[#01A0FF]' },
  closed: { bg: 'bg-[#F4F5F7]', text: 'text-[#94A3B8]', dot: 'bg-[#CBD5E1]' },
};

// --- Filter types ---

type ConversationFilter = 'all' | 'mine' | 'unassigned' | 'unanswered';
type ChannelFilter = 'all' | ConversationChannel;

// --- Helpers ---

function getConversationDisplayName(conversation: Conversation): string {
  if (conversation.client) {
    return getClientDisplayName(conversation.client as Client);
  }
  return conversation.visitor_name || 'Anonymous visitor';
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

// --- Status Pill ---

function StatusPill({ status }: { status: ConversationStatus }) {
  const style = STATUS_STYLES[status];
  const label = status.replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}

// --- Channel Badge ---

function ChannelBadge({ channel }: { channel: ConversationChannel }) {
  const config = CHANNEL_CONFIG[channel];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
      style={{ backgroundColor: config.color }}
    >
      <config.icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

// ============================================================
// Main Page Component
// ============================================================

export default function ConversationsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user, profile } = useUser();

  // --- Conversation list state ---
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // --- Messages state ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null;

  // --- Fetch conversations ---

  const fetchConversations = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('filter', filter);
    if (channelFilter !== 'all') params.set('channel', channelFilter);

    const res = await fetch(`/api/conversations?${params.toString()}`);
    if (res.ok) {
      const { conversations: data } = await res.json();
      setConversations(data ?? []);
    }
    setLoadingList(false);
  }, [filter, channelFilter]);

  useEffect(() => {
    setLoadingList(true);
    fetchConversations();
  }, [fetchConversations]);

  // --- Fetch messages for selected conversation ---

  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    const res = await fetch(`/api/conversations/${conversationId}/messages`);
    if (res.ok) {
      const { messages: data } = await res.json();
      setMessages(data ?? []);
    }
    setLoadingMessages(false);
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId);
    } else {
      setMessages([]);
    }
  }, [selectedId, fetchMessages]);

  // --- Auto-scroll to bottom when messages change ---

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // --- Real-time subscriptions ---

  // Subscribe to new messages for the selected conversation
  useEffect(() => {
    if (!selectedId) return;

    const channel = supabase
      .channel(`messages-${selectedId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload) => {
          setMessages((prev) => {
            // Avoid duplicates (message may already be in list from optimistic add)
            if (prev.some((m) => m.id === (payload.new as Message).id)) return prev;
            return [...prev, payload.new as Message];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedId, supabase]);

  // Subscribe to conversation updates (new messages, status changes)
  useEffect(() => {
    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          // Refetch the full list to get updated snippets/ordering
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchConversations]);

  // --- Send reply ---

  const sendReply = async () => {
    const body = messageText.trim();
    if (!body || !selectedId || sending) return;

    setSending(true);
    setMessageText('');

    try {
      const res = await fetch(`/api/conversations/${selectedId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });

      if (!res.ok) {
        console.error('Failed to send reply');
        setMessageText(body); // Restore on error
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
      setMessageText(body);
    }

    setSending(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  // --- Auto-grow textarea ---
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    // Auto-grow
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  // --- Filter tabs ---

  const FILTER_TABS: { value: ConversationFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'mine', label: 'Mine' },
    { value: 'unassigned', label: 'Unassigned' },
    { value: 'unanswered', label: 'Unanswered' },
  ];

  const CHANNEL_TABS: { value: ChannelFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'live_chat', label: 'Live Chat' },
    { value: 'portal', label: 'Portal' },
  ];

  // --- Render ---

  return (
    <div className="p-6 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Page header */}
      <div className="mb-4">
        <h1 className="text-[22px] font-semibold text-[#253859] tracking-tight">Conversations</h1>
        <p className="text-[13px] text-[#717D93] mt-0.5">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Split pane container */}
      <div className="flex flex-1 min-h-0 gap-4">
        {/* ==================== LEFT PANEL: Conversation List ==================== */}
        <div className="w-[350px] flex-shrink-0 flex flex-col rounded-xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
          {/* Filter tabs */}
          <div className="px-3 pt-3 pb-2 border-b border-[#E2E8F0] space-y-2">
            {/* Main filter row */}
            <div className="flex gap-1">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => { setFilter(tab.value); setSelectedId(null); }}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors',
                    filter === tab.value
                      ? 'bg-[#01A0FF] text-white'
                      : 'text-[#717D93] hover:bg-[#F4F5F7] hover:text-[#253859]'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Channel filter row */}
            <div className="flex gap-1">
              {CHANNEL_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => { setChannelFilter(tab.value); setSelectedId(null); }}
                  className={cn(
                    'px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
                    channelFilter === tab.value
                      ? 'bg-[#F4F5F7] text-[#253859]'
                      : 'text-[#94A3B8] hover:text-[#717D93]'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="p-3 space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-3">
                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <Inbox className="h-10 w-10 text-[#E2E8F0] mb-3" />
                <p className="text-[14px] text-[#717D93] font-medium">No conversations</p>
                <p className="text-[12px] text-[#94A3B8] mt-1">
                  No conversations match these filters
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const channelCfg = CHANNEL_CONFIG[conv.channel];
                const ChannelIcon = channelCfg.icon;
                const isSelected = conv.id === selectedId;
                const displayName = getConversationDisplayName(conv);
                // Use metadata.last_message_snippet if available, otherwise a placeholder
                const snippet = (conv.metadata?.last_message_snippet as string) || 'No messages yet';

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={cn(
                      'w-full flex items-start gap-3 px-3 py-3 text-left transition-colors border-b border-[#F4F5F7] last:border-b-0',
                      isSelected
                        ? 'bg-[#EFF8FF]'
                        : 'hover:bg-[#FAFBFC]'
                    )}
                  >
                    {/* Channel icon */}
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
                      style={{ backgroundColor: channelCfg.color + '18' }}
                    >
                      <ChannelIcon className="h-4 w-4" style={{ color: channelCfg.color }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                          'text-[13px] font-medium truncate',
                          conv.unread_count > 0 ? 'text-[#1A1F36]' : 'text-[#253859]'
                        )}>
                          {displayName}
                        </span>
                        <span className="text-[10px] text-[#94A3B8] flex-shrink-0">
                          {formatRelativeTime(conv.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className={cn(
                          'text-[12px] truncate',
                          conv.unread_count > 0 ? 'text-[#42526E] font-medium' : 'text-[#94A3B8]'
                        )}>
                          {truncate(snippet, 60)}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[#01A0FF]" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ==================== RIGHT PANEL: Message Thread ==================== */}
        <div className="flex-1 flex flex-col rounded-xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
          {!selectedConversation ? (
            /* Empty state — no conversation selected */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <MessageSquare className="h-12 w-12 text-[#E2E8F0] mb-4" />
              <p className="text-[16px] text-[#717D93] font-medium">Select a conversation</p>
              <p className="text-[13px] text-[#94A3B8] mt-1">
                Choose a conversation from the list to view messages
              </p>
            </div>
          ) : (
            <>
              {/* Header bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] bg-[#FAFBFC]">
                <div className="flex items-center gap-3 min-w-0">
                  <h2 className="text-[14px] font-semibold text-[#253859] truncate">
                    {getConversationDisplayName(selectedConversation)}
                  </h2>
                  <ChannelBadge channel={selectedConversation.channel} />
                  <StatusPill status={selectedConversation.status} />
                </div>
                {selectedConversation.client_id && (
                  <Link
                    href={`/clients/${selectedConversation.client_id}`}
                    className="flex items-center gap-1 text-[12px] text-[#01A0FF] hover:text-[#0090e6] font-medium flex-shrink-0 ml-3"
                  >
                    View client
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>

              {/* Scrollable message area */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {loadingMessages ? (
                  <div className="space-y-3 py-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                        <Skeleton className="h-12 rounded-xl" style={{ width: `${40 + Math.random() * 30}%` }} />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="h-10 w-10 text-[#E2E8F0] mb-3" />
                    <p className="text-sm text-[#717D93]">No messages yet</p>
                    <p className="text-xs text-[#94A3B8] mt-1">Send the first message to start the conversation</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isStaff = msg.sender_type === 'staff';
                    const isSystem = msg.sender_type === 'system' || msg.sender_type === 'bot';

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <div className="max-w-[80%] px-3 py-1.5 rounded-lg bg-[#F4F5F7] text-center">
                            <p className="text-[12px] text-[#94A3B8]">{msg.body}</p>
                            <p className="text-[10px] text-[#CBD5E1] mt-0.5">
                              {formatRelativeTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={cn('flex', isStaff ? 'justify-end' : 'justify-start')}
                      >
                        <div
                          className={cn(
                            'max-w-[75%] rounded-xl px-4 py-2.5',
                            isStaff
                              ? 'bg-[#01A0FF] text-white rounded-br-sm'
                              : 'bg-[#F4F5F7] text-[#253859] rounded-bl-sm'
                          )}
                        >
                          {/* Sender name */}
                          <p className={cn(
                            'text-[10px] font-medium mb-0.5',
                            isStaff ? 'text-white/70' : 'text-[#94A3B8]'
                          )}>
                            {isStaff ? 'Staff' : getConversationDisplayName(selectedConversation)}
                          </p>
                          {/* Message body */}
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                          {/* Timestamp */}
                          <p className={cn(
                            'text-[10px] mt-1',
                            isStaff ? 'text-white/70' : 'text-[#94A3B8]'
                          )}>
                            {formatRelativeTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply input area */}
              <div className="border-t border-[#E2E8F0] px-4 py-3 bg-[#FAFBFC]">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    value={messageText}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a reply..."
                    rows={2}
                    className="flex-1 resize-none rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#253859] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#01A0FF]/20 focus:border-[#01A0FF]"
                    style={{ maxHeight: '120px' }}
                  />
                  <Button
                    size="icon"
                    disabled={!messageText.trim() || sending}
                    onClick={sendReply}
                    className="h-9 w-9 flex-shrink-0 bg-[#01A0FF] hover:bg-[#0090e6]"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-[#94A3B8] mt-1">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
