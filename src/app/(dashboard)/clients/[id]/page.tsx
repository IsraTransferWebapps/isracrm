'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MessageSquare,
  ArrowLeft,
  ArrowRightLeft,
  Upload,
  Wallet,
  RefreshCw,
  DollarSign,
  Landmark,
  Pencil,
  Trash2,
  Plus,
  ShieldCheck,
  Building2,
  Mail,
  ChevronLeft,
  TrendingUp,
  MessageCircle,
  Send as SendIcon,
  Save,
  FileCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatCurrency, formatRate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Beneficiary, DealStatus, Email, EmailThread, ClientMarginConfig, Conversation, Message, ConversationChannel, KycDocument } from '@/types/database';
import { BeneficiaryDialog } from '@/components/beneficiary-dialog';
import { EmailList } from '@/components/email/email-list';
import { EmailThread as EmailThreadView } from '@/components/email/email-thread';
import { ComposeDialog } from '@/components/email/compose-dialog';

// ─── Pill badge component ───
function StatusPill({ bg, text, dot, label }: { bg: string; text: string; dot: string; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// ─── Status maps ───
const STATUS_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  prospect: { bg: 'bg-[#F4F5F7]', text: 'text-[#717D93]', dot: 'bg-[#94A3B8]' },
  active: { bg: 'bg-[#ecfdf5]', text: 'text-[#059669]', dot: 'bg-[#10b981]' },
  dormant: { bg: 'bg-[#fffbeb]', text: 'text-[#d97706]', dot: 'bg-[#f59e0b]' },
  suspended: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', dot: 'bg-[#ef4444]' },
  closed: { bg: 'bg-[#F4F5F7]', text: 'text-[#94A3B8]', dot: 'bg-[#CBD5E1]' },
};

const KYC_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-[#F4F5F7]', text: 'text-[#717D93]', dot: 'bg-[#94A3B8]' },
  in_review: { bg: 'bg-[#eff6ff]', text: 'text-[#0284c7]', dot: 'bg-[#01A0FF]' },
  approved: { bg: 'bg-[#ecfdf5]', text: 'text-[#059669]', dot: 'bg-[#10b981]' },
  expired: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', dot: 'bg-[#ef4444]' },
  rejected: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', dot: 'bg-[#ef4444]' },
};

const IMPORTANCE_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  regular: { bg: 'bg-[#F4F5F7]', text: 'text-[#717D93]', dot: 'bg-[#CBD5E1]' },
  vip: { bg: 'bg-[#fffbeb]', text: 'text-[#d97706]', dot: 'bg-[#f59e0b]' },
  vvip: { bg: 'bg-[#f5f3ff]', text: 'text-[#7c3aed]', dot: 'bg-[#8b5cf6]' },
};

const RISK_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  low: { bg: 'bg-[#ecfdf5]', text: 'text-[#059669]', dot: 'bg-[#10b981]' },
  medium: { bg: 'bg-[#fffbeb]', text: 'text-[#d97706]', dot: 'bg-[#f59e0b]' },
  high: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', dot: 'bg-[#ef4444]' },
  unrated: { bg: 'bg-[#F4F5F7]', text: 'text-[#717D93]', dot: 'bg-[#CBD5E1]' },
};

const DEAL_STATUS_STYLES: Record<DealStatus, { bg: string; text: string; dot: string }> = {
  quoted: { bg: 'bg-[#F4F5F7]', text: 'text-[#717D93]', dot: 'bg-[#94A3B8]' },
  booked: { bg: 'bg-[#eff6ff]', text: 'text-[#0284c7]', dot: 'bg-[#01A0FF]' },
  funds_received: { bg: 'bg-[#f5f3ff]', text: 'text-[#7c3aed]', dot: 'bg-[#8b5cf6]' },
  funds_sent: { bg: 'bg-[#fffbeb]', text: 'text-[#d97706]', dot: 'bg-[#f59e0b]' },
  completed: { bg: 'bg-[#ecfdf5]', text: 'text-[#059669]', dot: 'bg-[#10b981]' },
  cancelled: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', dot: 'bg-[#ef4444]' },
};

const TRANSFER_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  deposit:    { bg: 'bg-[#ecfdf5]', text: 'text-[#059669]', dot: 'bg-[#10b981]', label: 'Deposit' },
  trade:      { bg: 'bg-[#eff6ff]', text: 'text-[#0284c7]', dot: 'bg-[#01A0FF]', label: 'Trade' },
  withdrawal: { bg: 'bg-[#fffbeb]', text: 'text-[#d97706]', dot: 'bg-[#f59e0b]', label: 'Withdrawal' },
};

// Determine display type based on entry_type + deal_id
function getTransferType(entry: { entry_type: string; deal_id: string | null }): string {
  if (entry.deal_id) return 'trade';
  return entry.entry_type === 'funds_received' ? 'deposit' : 'withdrawal';
}

// ─── Tab definitions ───
type TabId = 'overview' | 'trades' | 'transfers' | 'balances' | 'bank_details' | 'emails' | 'margins' | 'messages';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: MessageSquare },
  { id: 'trades', label: 'Trades', icon: ArrowRightLeft },
  { id: 'transfers', label: 'Transfers', icon: RefreshCw },
  { id: 'balances', label: 'Balances', icon: Wallet },
  { id: 'bank_details', label: 'Bank Details', icon: Landmark },
  { id: 'emails', label: 'Emails', icon: Mail },
  { id: 'margins', label: 'Margins', icon: TrendingUp },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
];

// ─── ID document types that count as "valid ID" ───
const ID_DOCUMENT_TYPES = ['passport', 'national_id', 'driving_licence'];

// ─── KYC Compliance Card ───
function KycComplianceCard({
  kycStatus,
  nextReviewDate,
  documents,
}: {
  kycStatus: string;
  nextReviewDate: string | null;
  documents: KycDocument[];
}) {
  const today = new Date();

  // Count valid IDs: approved, not expired, and is an ID-type document
  const validIds = documents.filter(
    (doc) =>
      ID_DOCUMENT_TYPES.includes(doc.document_type) &&
      doc.status === 'approved' &&
      (!doc.expiry_date || new Date(doc.expiry_date) > today)
  );

  // Count expiring IDs (within 90 days)
  const expiringIds = documents.filter(
    (doc) =>
      ID_DOCUMENT_TYPES.includes(doc.document_type) &&
      doc.status === 'approved' &&
      doc.expiry_date &&
      new Date(doc.expiry_date) > today &&
      new Date(doc.expiry_date) <= new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
  );

  // Calculate days until KYC review
  const daysUntilReview = nextReviewDate
    ? Math.ceil((new Date(nextReviewDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // KYC review urgency colour
  const reviewUrgency =
    daysUntilReview === null
      ? 'gray'
      : daysUntilReview <= 0
        ? 'red'
        : daysUntilReview <= 60
          ? 'amber'
          : 'green';

  const reviewColours = {
    green: { bg: 'bg-[#ecfdf5]', text: 'text-[#059669]', icon: CheckCircle2 },
    amber: { bg: 'bg-[#fffbeb]', text: 'text-[#d97706]', icon: AlertTriangle },
    red: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', icon: XCircle },
    gray: { bg: 'bg-[#F4F5F7]', text: 'text-[#717D93]', icon: Clock },
  };

  const idBadge =
    validIds.length >= 2
      ? { label: `${validIds.length} Valid IDs`, bg: 'bg-[#ecfdf5]', text: 'text-[#059669]', icon: CheckCircle2 }
      : validIds.length === 1
        ? { label: '1 Valid ID — needs 2nd', bg: 'bg-[#fffbeb]', text: 'text-[#d97706]', icon: AlertTriangle }
        : { label: 'No Valid IDs', bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', icon: XCircle };

  const IdIcon = idBadge.icon;
  const ReviewIcon = reviewColours[reviewUrgency].icon;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Valid ID Status */}
      <div className={`rounded-lg p-4 ${idBadge.bg}`}>
        <div className="flex items-center gap-2 mb-2">
          <IdIcon className={`h-4.5 w-4.5 ${idBadge.text}`} />
          <span className={`text-[13px] font-semibold ${idBadge.text}`}>{idBadge.label}</span>
        </div>
        <div className="space-y-1.5 mt-3">
          {validIds.length > 0 ? (
            validIds.map((doc) => (
              <div key={doc.id} className="flex justify-between items-center text-[12px]">
                <span className="text-[#42526E] capitalize">{doc.document_type.replace(/_/g, ' ')}</span>
                <span className="text-[#717D93]">
                  {doc.expiry_date ? `Exp: ${formatDate(doc.expiry_date)}` : 'No expiry'}
                </span>
              </div>
            ))
          ) : (
            <p className="text-[12px] text-[#717D93]">No approved identity documents on file</p>
          )}
          {expiringIds.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[#d97706]/20">
              <span className="text-[11px] font-medium text-[#d97706]">
                ⚠ {expiringIds.length} ID{expiringIds.length > 1 ? 's' : ''} expiring within 90 days
              </span>
            </div>
          )}
        </div>
      </div>

      {/* KYC Review Status */}
      <div className={`rounded-lg p-4 ${reviewColours[reviewUrgency].bg}`}>
        <div className="flex items-center gap-2 mb-2">
          <ReviewIcon className={`h-4.5 w-4.5 ${reviewColours[reviewUrgency].text}`} />
          <span className={`text-[13px] font-semibold ${reviewColours[reviewUrgency].text}`}>
            {daysUntilReview === null
              ? 'No review date set'
              : daysUntilReview <= 0
                ? 'KYC Review Overdue'
                : `Review in ${daysUntilReview} days`}
          </span>
        </div>
        <div className="space-y-1.5 mt-3">
          <div className="flex justify-between text-[12px]">
            <span className="text-[#717D93]">KYC Status</span>
            <span className="text-[#42526E] capitalize font-medium">{kycStatus.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex justify-between text-[12px]">
            <span className="text-[#717D93]">Next Review</span>
            <span className="text-[#42526E]">{nextReviewDate ? formatDate(nextReviewDate) : '—'}</span>
          </div>
          <div className="flex justify-between text-[12px]">
            <span className="text-[#717D93]">Review Cycle</span>
            <span className="text-[#42526E]">Every 18 months</span>
          </div>
        </div>
      </div>

      {/* Document Summary */}
      <div className="rounded-lg p-4 bg-[#F4F5F7]">
        <div className="flex items-center gap-2 mb-2">
          <FileCheck className="h-4.5 w-4.5 text-[#717D93]" />
          <span className="text-[13px] font-semibold text-[#42526E]">Documents on File</span>
        </div>
        <div className="space-y-1.5 mt-3">
          {(() => {
            // Group documents by type and show count + status
            const byType = documents.reduce<Record<string, { approved: number; pending: number; total: number }>>((acc, doc) => {
              const type = doc.document_type;
              if (!acc[type]) acc[type] = { approved: 0, pending: 0, total: 0 };
              acc[type].total++;
              if (doc.status === 'approved') acc[type].approved++;
              if (doc.status === 'pending_review') acc[type].pending++;
              return acc;
            }, {});

            const entries = Object.entries(byType);
            if (entries.length === 0) {
              return <p className="text-[12px] text-[#717D93]">No documents uploaded</p>;
            }

            return entries.map(([type, counts]) => (
              <div key={type} className="flex justify-between items-center text-[12px]">
                <span className="text-[#42526E] capitalize">{type.replace(/_/g, ' ')}</span>
                <span className="text-[#717D93]">
                  {counts.approved} approved
                  {counts.pending > 0 && <span className="text-[#d97706]"> · {counts.pending} pending</span>}
                </span>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [trades, setTrades] = useState<any[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [balances, setBalances] = useState<{ currency: string; balance: number }[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [beneficiariesLoading, setBeneficiariesLoading] = useState(false);
  const [beneficiaryDialogOpen, setBeneficiaryDialogOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [emailThreads, setEmailThreads] = useState<EmailThread[]>([]);
  const [emailThreadsLoading, setEmailThreadsLoading] = useState(false);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [composeDialogOpen, setComposeDialogOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Email | null>(null);
  const [marginConfigs, setMarginConfigs] = useState<ClientMarginConfig[]>([]);
  const [marginsLoading, setMarginsLoading] = useState(false);
  const [clientConversations, setClientConversations] = useState<Conversation[]>([]);
  const [selectedConvMessages, setSelectedConvMessages] = useState<Message[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newStaffMessage, setNewStaffMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [newMargin, setNewMargin] = useState({ currency_pair: '', margin_percentage: '' });
  const [savingMargin, setSavingMargin] = useState(false);
  const [kycDocuments, setKycDocuments] = useState<KycDocument[]>([]);
  const supabase = createClient();
  const { role, profile } = useUser();

  // Fetch client data
  useEffect(() => {
    const fetchClient = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('clients')
        .select(
          `
          *,
          individual_details (*),
          corporate_details (*),
          account_manager:user_profiles!clients_assigned_account_manager_id_fkey (id, full_name, email),
          salesperson:user_profiles!clients_assigned_salesperson_id_fkey (id, full_name, email)
        `
        )
        .eq('id', clientId)
        .single();

      if (data) setClient(data);
      setLoading(false);
    };

    // Fetch KYC documents for the compliance card
    const fetchKycDocs = async () => {
      const { data } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('client_id', clientId)
        .is('deleted_at', null)
        .order('upload_date', { ascending: false });

      if (data) setKycDocuments(data);
    };

    fetchClient();
    fetchKycDocs();
  }, [clientId]);

  // Fetch trades (deals) when tab is activated
  useEffect(() => {
    if (activeTab !== 'trades' || trades.length > 0) return;

    const fetchTrades = async () => {
      setTradesLoading(true);
      const { data } = await supabase
        .from('deals')
        .select('*')
        .eq('client_id', clientId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (data) setTrades(data);
      setTradesLoading(false);
    };

    fetchTrades();
  }, [activeTab, clientId]);

  // Fetch transfers (ledger entries) when tab is activated
  useEffect(() => {
    if (activeTab !== 'transfers' || transfers.length > 0) return;

    const fetchTransfers = async () => {
      setTransfersLoading(true);
      const { data } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (data) setTransfers(data);
      setTransfersLoading(false);
    };

    fetchTransfers();
  }, [activeTab, clientId]);

  // Fetch balances when tab is activated
  useEffect(() => {
    if (activeTab !== 'balances' || balances.length > 0) return;

    const fetchBalances = async () => {
      setBalancesLoading(true);
      // Get the latest ledger entry per currency to read running_balance
      const { data } = await supabase
        .from('ledger_entries')
        .select('currency, running_balance, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        // Group by currency, take latest entry for each
        const latestByCurrency = new Map<string, number>();
        for (const entry of data) {
          if (!latestByCurrency.has(entry.currency)) {
            latestByCurrency.set(entry.currency, entry.running_balance);
          }
        }
        setBalances(
          Array.from(latestByCurrency.entries())
            .filter(([, balance]) => balance !== 0)
            .map(([currency, balance]) => ({
              currency,
              balance,
            }))
        );
      }
      setBalancesLoading(false);
    };

    fetchBalances();
  }, [activeTab, clientId]);

  // Fetch beneficiaries when tab is activated
  const fetchBeneficiaries = async () => {
    setBeneficiariesLoading(true);
    const { data } = await supabase
      .from('beneficiaries')
      .select('*')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (data) setBeneficiaries(data as Beneficiary[]);
    setBeneficiariesLoading(false);
  };

  useEffect(() => {
    if (activeTab !== 'bank_details' || beneficiaries.length > 0) return;
    fetchBeneficiaries();
  }, [activeTab, clientId]);

  // Fetch email threads when emails tab is activated
  const fetchEmailThreads = async () => {
    if (!profile?.id) return;
    setEmailThreadsLoading(true);
    const { data } = await supabase
      .from('email_threads')
      .select('*, emails(*)')
      .eq('client_id', clientId)
      .eq('staff_user_id', profile.id)
      .order('last_message_at', { ascending: false });

    if (data) setEmailThreads(data as EmailThread[]);
    setEmailThreadsLoading(false);
  };

  useEffect(() => {
    if (activeTab !== 'emails' || emailThreads.length > 0) return;
    fetchEmailThreads();
  }, [activeTab, clientId, profile?.id]);

  // Fetch margin configs when margins tab is activated
  const fetchMarginConfigs = async () => {
    setMarginsLoading(true);
    const { data } = await supabase
      .from('client_margin_configs')
      .select('*')
      .eq('client_id', clientId)
      .order('currency_pair');
    if (data) setMarginConfigs(data as ClientMarginConfig[]);
    setMarginsLoading(false);
  };

  useEffect(() => {
    if (activeTab !== 'margins' || marginConfigs.length > 0) return;
    fetchMarginConfigs();
  }, [activeTab, clientId]);

  // Fetch client conversations when messages tab is activated
  const fetchClientConversations = async () => {
    setMessagesLoading(true);
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('client_id', clientId)
      .neq('status', 'closed')
      .order('last_message_at', { ascending: false });
    if (data) {
      setClientConversations(data as Conversation[]);
      // Auto-select first conversation
      if (data.length > 0 && !selectedConversationId) {
        setSelectedConversationId(data[0].id);
        fetchConversationMessages(data[0].id);
      }
    }
    setMessagesLoading(false);
  };

  const fetchConversationMessages = async (convId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (data) setSelectedConvMessages(data as Message[]);
  };

  useEffect(() => {
    if (activeTab !== 'messages' || clientConversations.length > 0) return;
    fetchClientConversations();
  }, [activeTab, clientId]);

  const handleSaveMargin = async () => {
    if (!newMargin.currency_pair || !newMargin.margin_percentage) return;
    setSavingMargin(true);
    await supabase.from('client_margin_configs').upsert({
      client_id: clientId,
      currency_pair: newMargin.currency_pair,
      margin_percentage: parseFloat(newMargin.margin_percentage),
      updated_by: profile?.id,
    }, { onConflict: 'client_id,currency_pair' });
    setNewMargin({ currency_pair: '', margin_percentage: '' });
    setSavingMargin(false);
    setMarginConfigs([]);
    fetchMarginConfigs();
  };

  const handleDeleteMargin = async (id: string) => {
    await supabase.from('client_margin_configs').delete().eq('id', id);
    setMarginConfigs((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSendStaffMessage = async () => {
    const body = newStaffMessage.trim();
    if (!body || !selectedConversationId) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/conversations/${selectedConversationId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        setNewStaffMessage('');
        fetchConversationMessages(selectedConversationId);
      }
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteBeneficiary = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this bank account?')) return;
    await supabase.from('beneficiaries').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-4 w-28 rounded skeleton-brand" />
        <div className="h-[120px] w-full rounded-xl skeleton-brand" style={{ animationDelay: '100ms' }} />
        <div className="h-10 w-full rounded skeleton-brand" style={{ animationDelay: '200ms' }} />
        <div className="h-[300px] w-full rounded-xl skeleton-brand" style={{ animationDelay: '300ms' }} />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <p className="text-[#717D93]">Client not found.</p>
        <Link href="/clients" className="text-[#01A0FF] hover:underline text-sm mt-2 block">
          ← Back to clients
        </Link>
      </div>
    );
  }

  const displayName =
    client.client_type === 'corporate'
      ? client.corporate_details?.company_name
      : `${client.individual_details?.first_name || ''} ${client.individual_details?.last_name || ''}`.trim();

  return (
    <div className="p-6 space-y-6">
      {/* Back link */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-[13px] text-[#717D93] hover:text-[#01A0FF] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to clients
      </Link>

      {/* Header bar */}
      <div className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-[20px] font-semibold text-[#253859] tracking-tight">{displayName}</h1>
            <StatusPill {...(STATUS_MAP[client.status] || STATUS_MAP.prospect)} label={client.status} />
            <StatusPill {...(KYC_MAP[client.kyc_status] || KYC_MAP.pending)} label={`KYC: ${client.kyc_status.replace(/_/g, ' ')}`} />
            <StatusPill {...(RISK_MAP[client.risk_rating] || RISK_MAP.unrated)} label={`Risk: ${client.risk_rating}`} />
            {client.importance && client.importance !== 'regular' && (
              <StatusPill {...(IMPORTANCE_MAP[client.importance] || IMPORTANCE_MAP.regular)} label={client.importance.toUpperCase()} />
            )}
          </div>
          <p className="text-[13px] text-[#717D93]">
            <span className="capitalize">{client.client_type.replace(/_/g, ' ')}</span>
            {' · Managed by '}
            <span className="text-[#42526E]">{client.account_manager?.full_name || 'Unassigned'}</span>
            {client.salesperson && (
              <>
                {' · Sales: '}
                <span className="text-[#42526E]">{client.salesperson.full_name}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-[#01A0FF] hover:bg-[#0090e6] text-white h-8 text-[12px] shadow-sm shadow-[#01A0FF]/15">
            <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
            New Trade
          </Button>
          <Button size="sm" variant="outline" className="border-[#E2E8F0] text-[#717D93] hover:bg-[#F4F5F7] hover:text-[#253859] h-8 text-[12px]">
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Upload Doc
          </Button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-[#E2E8F0]">
        <div className="flex gap-0 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-all -mb-px whitespace-nowrap shrink-0',
                  isActive
                    ? 'border-[#01A0FF] text-[#01A0FF]'
                    : 'border-transparent text-[#717D93] hover:text-[#253859] hover:border-[#CBD5E1]'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overview Card */}
          <div className="lg:col-span-2 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8] mb-4">
              Client Details
            </h2>
            {client.client_type === 'corporate' ? (
              <div className="grid grid-cols-2 gap-y-5 gap-x-8">
                {[
                  { label: 'Company', value: client.corporate_details?.company_name },
                  { label: 'Registration', value: client.corporate_details?.company_registration_number || '—' },
                  { label: 'Country', value: client.corporate_details?.country_of_incorporation || '—' },
                  { label: 'Industry', value: client.corporate_details?.industry || '—' },
                ].map((field) => (
                  <div key={field.label}>
                    <p className="text-[11px] text-[#94A3B8] mb-1">{field.label}</p>
                    <p className="text-[13px] text-[#253859]">{field.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-y-5 gap-x-8">
                {[
                  { label: 'Full Name', value: `${client.individual_details?.title || ''} ${client.individual_details?.first_name} ${client.individual_details?.last_name}`.trim() },
                  { label: 'Date of Birth', value: formatDate(client.individual_details?.date_of_birth) },
                  { label: 'Email', value: client.individual_details?.email_primary || '—' },
                  { label: 'Phone', value: client.individual_details?.phone_primary || '—' },
                  { label: 'Nationality', value: client.individual_details?.nationality || '—' },
                  { label: 'Occupation', value: client.individual_details?.occupation || '—' },
                ].map((field) => (
                  <div key={field.label}>
                    <p className="text-[11px] text-[#94A3B8] mb-1">{field.label}</p>
                    <p className="text-[13px] text-[#253859]">{field.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary Card */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8] mb-4">
              Summary
            </h2>
            <div className="space-y-0">
              {[
                { label: 'Lifetime Volume', value: client.total_lifetime_volume > 0 ? formatCurrency(client.total_lifetime_volume, 'GBP') : '—', mono: true },
                { label: 'Total Trades', value: String(client.total_lifetime_deals), mono: true },
                { label: 'Preferred Pair', value: client.preferred_currency_pair || '—' },
                { label: 'Importance', value: (client.importance || 'regular').toUpperCase() },
                { label: 'Salesperson', value: client.salesperson?.full_name || 'Unassigned' },
                { label: 'Onboarded', value: formatDate(client.onboarding_date) },
                { label: 'Next Review', value: formatDate(client.next_review_date) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex justify-between items-center py-3 border-b border-[#E2E8F0] last:border-0"
                >
                  <span className="text-[12px] text-[#717D93]">{stat.label}</span>
                  <span className={`text-[13px] text-[#253859] ${stat.mono ? 'font-mono' : ''}`}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* KYC & Compliance Card — full width row below */}
          <div className="lg:col-span-3 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8] mb-4">
              KYC & Compliance
            </h2>
            <KycComplianceCard
              kycStatus={client.kyc_status}
              nextReviewDate={client.next_review_date}
              documents={kycDocuments}
            />
          </div>
        </div>
      )}

      {activeTab === 'trades' && (
        <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-[#E2E8F0] hover:bg-transparent bg-[#FAFBFC]">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Deal Ref</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Type</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Sell</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Buy</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Rate</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Status</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tradesLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i} className="border-[#E2E8F0]">
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 rounded skeleton-brand" style={{ animationDelay: `${(i * 7 + j) * 30}ms` }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : trades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <ArrowRightLeft className="h-10 w-10 text-[#E2E8F0] mx-auto mb-3" />
                    <p className="text-[#717D93] font-medium text-[14px]">No trades yet</p>
                    <p className="text-[13px] text-[#94A3B8] mt-1">Create a new trade to get started</p>
                  </TableCell>
                </TableRow>
              ) : (
                trades.map((trade) => (
                  <TableRow key={trade.id} className="border-[#E2E8F0] table-row-hover">
                    <TableCell className="font-mono text-[12px] text-[#01A0FF] font-medium">{trade.deal_reference}</TableCell>
                    <TableCell className="text-[#717D93] text-[12px] capitalize">{trade.deal_type.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="font-mono text-[12px] text-[#42526E]">
                      {formatCurrency(trade.sell_amount, trade.sell_currency)}
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-[#42526E]">
                      {formatCurrency(trade.buy_amount, trade.buy_currency)}
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-[#717D93]">{formatRate(Number(trade.exchange_rate))}</TableCell>
                    <TableCell>
                      <StatusPill {...(DEAL_STATUS_STYLES[trade.status as DealStatus] || DEAL_STATUS_STYLES.quoted)} label={trade.status.replace(/_/g, ' ')} />
                    </TableCell>
                    <TableCell className="text-[#717D93] text-[12px]">{formatDate(trade.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === 'transfers' && (
        <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-[#E2E8F0] hover:bg-transparent bg-[#FAFBFC]">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Date</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Type</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Currency</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] text-right">Amount</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Reference</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] text-right">Running Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfersLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i} className="border-[#E2E8F0]">
                    {[...Array(6)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 rounded skeleton-brand" style={{ animationDelay: `${(i * 6 + j) * 30}ms` }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <RefreshCw className="h-10 w-10 text-[#E2E8F0] mx-auto mb-3" />
                    <p className="text-[#717D93] font-medium text-[14px]">No transfers yet</p>
                    <p className="text-[13px] text-[#94A3B8] mt-1">Transfers will appear here when funds are received or sent</p>
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((entry) => {
                  const tType = getTransferType(entry);
                  const style = TRANSFER_STYLES[tType] || TRANSFER_STYLES.trade;
                  const isCredit = entry.entry_type === 'funds_received';
                  return (
                    <TableRow key={entry.id} className="border-[#E2E8F0] table-row-hover">
                      <TableCell className="text-[#717D93] text-[12px]">{formatDate(entry.value_date || entry.created_at)}</TableCell>
                      <TableCell>
                        <StatusPill bg={style.bg} text={style.text} dot={style.dot} label={style.label} />
                      </TableCell>
                      <TableCell className="font-mono text-[12px] text-[#253859] font-medium">{entry.currency}</TableCell>
                      <TableCell className={`font-mono text-[12px] text-right ${isCredit ? 'text-[#059669]' : 'text-[#dc2626]'}`}>
                        {isCredit ? '+' : '−'}{formatCurrency(Math.abs(entry.amount), entry.currency)}
                      </TableCell>
                      <TableCell className="text-[11px] text-[#94A3B8] max-w-[200px] truncate">{entry.notes || '—'}</TableCell>
                      <TableCell className="font-mono text-[12px] text-[#42526E] text-right">
                        {formatCurrency(entry.running_balance, entry.currency)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === 'balances' && (
        <div>
          {balancesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl skeleton-brand" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
          ) : balances.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#E2E8F0] rounded-xl">
              <Wallet className="h-10 w-10 text-[#E2E8F0] mx-auto mb-3" />
              <p className="text-[#717D93] font-medium text-[14px]">No balances</p>
              <p className="text-[13px] text-[#94A3B8] mt-1">Account balances will appear once transfers are recorded</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {balances.map((bal) => (
                <div
                  key={bal.currency}
                  className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm stat-card-blue"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-white/60 flex items-center justify-center shadow-sm">
                      <DollarSign className="h-5 w-5 text-[#01A0FF]" />
                    </div>
                    <div>
                      <p className="text-[24px] font-semibold text-[#253859] leading-none font-mono">
                        {formatCurrency(bal.balance, bal.currency)}
                      </p>
                      <p className="text-[12px] text-[#717D93] mt-1">{bal.currency} Balance</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'bank_details' && (
        <div>
          {/* Header with Add button */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] text-[#717D93]">
              {beneficiaries.length} bank account{beneficiaries.length !== 1 ? 's' : ''}
            </p>
            <Button
              size="sm"
              onClick={() => {
                setEditingBeneficiary(null);
                setBeneficiaryDialogOpen(true);
              }}
              className="bg-[#01A0FF] hover:bg-[#0090e6] text-white h-8 text-[12px] shadow-sm shadow-[#01A0FF]/15"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Bank Account
            </Button>
          </div>

          {beneficiariesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-40 rounded-xl skeleton-brand" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
          ) : beneficiaries.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#E2E8F0] rounded-xl">
              <Landmark className="h-10 w-10 text-[#E2E8F0] mx-auto mb-3" />
              <p className="text-[#717D93] font-medium text-[14px]">No bank accounts</p>
              <p className="text-[13px] text-[#94A3B8] mt-1">Add a bank account to enable fund transfers</p>
              <Button
                size="sm"
                onClick={() => {
                  setEditingBeneficiary(null);
                  setBeneficiaryDialogOpen(true);
                }}
                className="mt-4 bg-[#01A0FF] hover:bg-[#0090e6] text-white h-8 text-[12px] shadow-sm shadow-[#01A0FF]/15"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Bank Account
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {beneficiaries.map((ben) => (
                <div
                  key={ben.id}
                  className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm hover:border-[#CBD5E1] transition-colors"
                >
                  {/* Card header: nickname + actions */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-[14px] font-semibold text-[#253859] truncate">
                          {ben.nickname || ben.beneficiary_name}
                        </h3>
                        {ben.verified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#ecfdf5] text-[#059669]">
                            <ShieldCheck className="h-3 w-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F4F5F7] text-[#94A3B8]">
                            Unverified
                          </span>
                        )}
                      </div>
                      {ben.nickname && (
                        <p className="text-[12px] text-[#717D93]">{ben.beneficiary_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                      <button
                        onClick={() => {
                          setEditingBeneficiary(ben);
                          setBeneficiaryDialogOpen(true);
                        }}
                        className="h-7 w-7 rounded-md flex items-center justify-center text-[#94A3B8] hover:text-[#01A0FF] hover:bg-[#EFF6FF] transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteBeneficiary(ben.id)}
                        className="h-7 w-7 rounded-md flex items-center justify-center text-[#94A3B8] hover:text-[#dc2626] hover:bg-[#fef2f2] transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Bank info */}
                  <div className="space-y-2">
                    {(ben.bank_name || ben.bank_country) && (
                      <div className="flex items-center gap-2 text-[12px]">
                        <Building2 className="h-3.5 w-3.5 text-[#94A3B8] flex-shrink-0" />
                        <span className="text-[#42526E]">
                          {[ben.bank_name, ben.bank_country].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    )}
                    {ben.iban && (
                      <div className="flex items-center gap-2 text-[12px]">
                        <span className="text-[#94A3B8] text-[10px] font-semibold uppercase tracking-wider w-10 flex-shrink-0">IBAN</span>
                        <span className="font-mono text-[#253859] text-[11px]">{ben.iban}</span>
                      </div>
                    )}
                    {(ben.account_number || ben.sort_code) && (
                      <div className="flex items-center gap-2 text-[12px]">
                        <span className="text-[#94A3B8] text-[10px] font-semibold uppercase tracking-wider w-10 flex-shrink-0">Acct</span>
                        <span className="font-mono text-[#253859] text-[11px]">
                          {[ben.account_number, ben.sort_code ? `SC: ${ben.sort_code}` : null].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    )}
                    {ben.bic_swift && (
                      <div className="flex items-center gap-2 text-[12px]">
                        <span className="text-[#94A3B8] text-[10px] font-semibold uppercase tracking-wider w-10 flex-shrink-0">SWIFT</span>
                        <span className="font-mono text-[#253859] text-[11px]">{ben.bic_swift}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer: currency + relationship */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E2E8F0]">
                    {ben.currency && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EFF6FF] text-[#01A0FF]">
                        {ben.currency}
                      </span>
                    )}
                    {ben.relationship_to_client && (
                      <span className="text-[11px] text-[#94A3B8]">{ben.relationship_to_client}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bank Account Dialog (Add/Edit) */}
          <BeneficiaryDialog
            open={beneficiaryDialogOpen}
            onOpenChange={setBeneficiaryDialogOpen}
            clientId={clientId}
            beneficiary={editingBeneficiary}
            onSaved={() => {
              setBeneficiaries([]);
              fetchBeneficiaries();
            }}
          />
        </div>
      )}

      {activeTab === 'emails' && (
        <div>
          {/* Header with Compose button */}
          <div className="flex items-center justify-between mb-4">
            {selectedThread ? (
              <button
                onClick={() => setSelectedThread(null)}
                className="inline-flex items-center gap-1.5 text-[13px] text-[#717D93] hover:text-[#01A0FF] transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back to threads
              </button>
            ) : (
              <p className="text-[13px] text-[#717D93]">
                {emailThreads.length} conversation{emailThreads.length !== 1 ? 's' : ''}
              </p>
            )}
            <Button
              size="sm"
              onClick={() => {
                setReplyTo(null);
                setComposeDialogOpen(true);
              }}
              className="bg-[#01A0FF] hover:bg-[#0090e6] text-white h-8 text-[12px] shadow-sm shadow-[#01A0FF]/15"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Compose
            </Button>
          </div>

          {selectedThread && profile?.id ? (
            /* Thread detail view */
            <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E2E8F0] bg-[#FAFBFC]">
                <h3 className="text-[14px] font-semibold text-[#253859]">{selectedThread.subject}</h3>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">{selectedThread.message_count} message{selectedThread.message_count !== 1 ? 's' : ''}</p>
              </div>
              <EmailThreadView
                threadId={selectedThread.id}
                staffUserId={profile.id}
                onReply={(email) => {
                  setReplyTo(email);
                  setComposeDialogOpen(true);
                }}
              />
            </div>
          ) : (
            /* Thread list view */
            <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
              {emailThreadsLoading ? (
                <div className="divide-y divide-[#E2E8F0]">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-52 rounded skeleton-brand" style={{ animationDelay: `${i * 60}ms` }} />
                        <div className="h-3 w-72 rounded skeleton-brand" style={{ animationDelay: `${i * 60 + 30}ms` }} />
                      </div>
                      <div className="h-3 w-14 rounded skeleton-brand flex-shrink-0" style={{ animationDelay: `${i * 60 + 60}ms` }} />
                    </div>
                  ))}
                </div>
              ) : emailThreads.length === 0 ? (
                <div className="text-center py-16">
                  <Mail className="h-10 w-10 text-[#E2E8F0] mx-auto mb-3" />
                  <p className="text-[#717D93] font-medium text-[14px]">No email conversations</p>
                  <p className="text-[13px] text-[#94A3B8] mt-1">Send an email to start a conversation with this client</p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setReplyTo(null);
                      setComposeDialogOpen(true);
                    }}
                    className="mt-4 bg-[#01A0FF] hover:bg-[#0090e6] text-white h-8 text-[12px] shadow-sm shadow-[#01A0FF]/15"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Compose
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-[#E2E8F0]">
                  {emailThreads.map((thread) => {
                    // Get the latest email in the thread for snippet display
                    const threadEmails = (thread.emails || []) as Email[];
                    const latestEmail = threadEmails.sort(
                      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )[0];
                    const hasUnread = threadEmails.some((e) => !e.is_read && e.direction === 'inbound');

                    return (
                      <div
                        key={thread.id}
                        onClick={() => setSelectedThread(thread)}
                        className={cn(
                          'flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-[#F8FAFC]',
                          hasUnread && 'bg-[#FAFBFE]'
                        )}
                      >
                        <div className="w-2 pt-1.5 flex-shrink-0">
                          {hasUnread && (
                            <span className="w-2 h-2 rounded-full bg-[#01A0FF] block" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'text-[13px] truncate',
                                hasUnread ? 'font-semibold text-[#253859]' : 'font-medium text-[#42526E]'
                              )}
                            >
                              {thread.subject}
                            </span>
                            <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded text-[10px] font-medium bg-[#F4F5F7] text-[#717D93] flex-shrink-0">
                              {thread.message_count}
                            </span>
                          </div>
                          {latestEmail?.snippet && (
                            <p className="text-[12px] text-[#94A3B8] truncate mt-0.5">
                              {latestEmail.snippet}
                            </p>
                          )}
                        </div>
                        <span className="text-[11px] text-[#94A3B8] flex-shrink-0 pt-0.5">
                          {formatDate(thread.last_message_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Compose Dialog */}
          <ComposeDialog
            open={composeDialogOpen}
            onOpenChange={setComposeDialogOpen}
            defaultTo={
              replyTo
                ? (replyTo.direction === 'inbound' ? replyTo.from_address : replyTo.to_address)
                : (client.individual_details?.email_primary || '')
            }
            defaultSubject={replyTo?.subject || ''}
            threadId={replyTo?.thread_id || selectedThread?.id || undefined}
            clientId={clientId}
            inReplyTo={replyTo?.message_id || undefined}
            onSent={() => {
              setEmailThreads([]);
              fetchEmailThreads();
            }}
          />
        </div>
      )}

      {/* ─── Margins Tab ─── */}
      {activeTab === 'margins' && (
        <div className="space-y-4">
          {/* Add margin form */}
          <div className="flex items-end gap-3 bg-[#FAFBFC] rounded-xl border border-[#E2E8F0] p-4">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8] mb-1">Currency Pair</label>
              <select
                value={newMargin.currency_pair}
                onChange={(e) => setNewMargin((p) => ({ ...p, currency_pair: e.target.value }))}
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#253859]"
              >
                <option value="">Select pair</option>
                {['GBP/ILS', 'GBP/USD', 'GBP/EUR', 'USD/ILS', 'USD/EUR', 'EUR/ILS', 'ILS/GBP', 'ILS/USD', 'ILS/EUR', 'USD/GBP', 'EUR/GBP', 'EUR/USD'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8] mb-1">Margin %</label>
              <input
                type="number"
                step="0.01"
                value={newMargin.margin_percentage}
                onChange={(e) => setNewMargin((p) => ({ ...p, margin_percentage: e.target.value }))}
                placeholder="1.00"
                className="w-full h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#253859]"
              />
            </div>
            <Button size="sm" onClick={handleSaveMargin} disabled={savingMargin || !newMargin.currency_pair || !newMargin.margin_percentage}>
              <Save className="h-3.5 w-3.5 mr-1" />
              {savingMargin ? 'Saving...' : 'Save'}
            </Button>
          </div>

          {/* Margin configs table */}
          {marginsLoading ? (
            <div className="h-32 rounded-xl skeleton-brand" />
          ) : marginConfigs.length > 0 ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#FAFBFC]">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Pair</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Margin %</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Status</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Updated</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marginConfigs.map((m) => (
                    <TableRow key={m.id} className="hover:bg-[#FAFBFC]">
                      <TableCell className="font-medium text-[#253859]">{m.currency_pair}</TableCell>
                      <TableCell className="font-mono text-sm">{m.margin_percentage}%</TableCell>
                      <TableCell>
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium',
                          m.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500'
                        )}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', m.is_active ? 'bg-emerald-400' : 'bg-gray-400')} />
                          {m.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-[#94A3B8]">{formatDate(m.updated_at)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon-xs" onClick={() => handleDeleteMargin(m.id)} className="text-[#94A3B8] hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-[#FAFBFC] p-8 text-center">
              <TrendingUp className="h-8 w-8 text-[#E2E8F0] mx-auto mb-2" />
              <p className="text-sm text-[#717D93]">No margin configs yet</p>
              <p className="text-xs text-[#94A3B8] mt-1">Add a currency pair above to set custom margins for this client</p>
            </div>
          )}
        </div>
      )}

      {/* ─── Messages Tab (Unified Conversations) ─── */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          {/* Conversation selector (if multiple) */}
          {clientConversations.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {clientConversations.map((conv) => {
                const channelConfig: Record<ConversationChannel, { icon: React.ElementType; color: string; label: string }> = {
                  whatsapp: { icon: MessageCircle, color: '#25D366', label: 'WhatsApp' },
                  live_chat: { icon: MessageSquare, color: '#01A0FF', label: 'Live Chat' },
                  portal: { icon: Mail, color: '#8B5CF6', label: 'Portal' },
                };
                const cfg = channelConfig[conv.channel];
                const Icon = cfg.icon;
                return (
                  <button
                    key={conv.id}
                    onClick={() => { setSelectedConversationId(conv.id); fetchConversationMessages(conv.id); }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm whitespace-nowrap transition-colors',
                      selectedConversationId === conv.id
                        ? 'border-[#01A0FF] bg-[#EFF8FF] text-[#01A0FF]'
                        : 'border-[#E2E8F0] bg-white text-[#717D93] hover:bg-[#F9FAFB]'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                    {cfg.label}
                    {conv.unread_count > 0 && (
                      <span className="ml-1 w-5 h-5 rounded-full bg-[#EF4444] text-white text-[10px] flex items-center justify-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden flex flex-col" style={{ height: '450px' }}>
            {/* Message List */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messagesLoading ? (
                <div className="h-32 rounded-xl skeleton-brand" />
              ) : selectedConvMessages.length > 0 ? (
                selectedConvMessages.map((msg) => {
                  const isStaff = msg.sender_type === 'staff';
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
                    <div key={msg.id} className={cn('flex', isStaff ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        'max-w-[75%] rounded-xl px-4 py-2.5',
                        isStaff
                          ? 'bg-[#01A0FF] text-white rounded-br-sm'
                          : 'bg-[#F4F5F7] text-[#253859] rounded-bl-sm'
                      )}>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                        <p className={cn('text-[10px] mt-1', isStaff ? 'text-white/70' : 'text-[#94A3B8]')}>
                          {isStaff ? 'You' : 'Client'} &middot; {formatDate(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : clientConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="h-8 w-8 text-[#E2E8F0] mb-2" />
                  <p className="text-sm text-[#717D93]">No conversations</p>
                  <p className="text-xs text-[#94A3B8] mt-1">Messages from all channels will appear here</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="h-8 w-8 text-[#E2E8F0] mb-2" />
                  <p className="text-sm text-[#717D93]">No messages in this conversation</p>
                </div>
              )}
            </div>

            {/* Compose Bar */}
            {selectedConversationId && (
              <div className="border-t border-[#E2E8F0] px-4 py-3 bg-[#FAFBFC]">
                <div className="flex items-end gap-2">
                  <textarea
                    value={newStaffMessage}
                    onChange={(e) => setNewStaffMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendStaffMessage(); } }}
                    placeholder="Reply to client..."
                    rows={1}
                    className="flex-1 resize-none rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#253859] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#01A0FF]/20 focus:border-[#01A0FF]"
                    style={{ maxHeight: '80px' }}
                  />
                  <Button
                    size="sm"
                    disabled={!newStaffMessage.trim() || sendingMessage}
                    onClick={handleSendStaffMessage}
                  >
                    <SendIcon className="h-3.5 w-3.5 mr-1" />
                    Send
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
