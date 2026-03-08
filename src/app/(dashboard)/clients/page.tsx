'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Download, Users } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/format';
import Link from 'next/link';
import type { ClientType, ClientStatus, RiskRating, KycStatus } from '@/types/database';

// Status badge styles — pill style with dot indicators (light theme)
const STATUS_STYLES: Record<ClientStatus, { bg: string; text: string; dot: string }> = {
  prospect: { bg: 'bg-[#F4F5F7]', text: 'text-[#717D93]', dot: 'bg-[#94A3B8]' },
  active: { bg: 'bg-[#ecfdf5]', text: 'text-[#059669]', dot: 'bg-[#10b981]' },
  dormant: { bg: 'bg-[#fffbeb]', text: 'text-[#d97706]', dot: 'bg-[#f59e0b]' },
  suspended: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', dot: 'bg-[#ef4444]' },
  closed: { bg: 'bg-[#F4F5F7]', text: 'text-[#94A3B8]', dot: 'bg-[#CBD5E1]' },
};

const KYC_STYLES: Record<KycStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-[#F4F5F7]', text: 'text-[#717D93]', dot: 'bg-[#94A3B8]' },
  in_review: { bg: 'bg-[#eff6ff]', text: 'text-[#0284c7]', dot: 'bg-[#01A0FF]' },
  approved: { bg: 'bg-[#ecfdf5]', text: 'text-[#059669]', dot: 'bg-[#10b981]' },
  expired: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', dot: 'bg-[#ef4444]' },
  rejected: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', dot: 'bg-[#ef4444]' },
};

const RISK_STYLES: Record<RiskRating, { bg: string; text: string; dot: string }> = {
  low: { bg: 'bg-[#ecfdf5]', text: 'text-[#059669]', dot: 'bg-[#10b981]' },
  medium: { bg: 'bg-[#fffbeb]', text: 'text-[#d97706]', dot: 'bg-[#f59e0b]' },
  high: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', dot: 'bg-[#ef4444]' },
  unrated: { bg: 'bg-[#F4F5F7]', text: 'text-[#717D93]', dot: 'bg-[#CBD5E1]' },
};

// Reusable pill badge component
function StatusPill({ style, label }: { style: { bg: string; text: string; dot: string }; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}

interface ClientRow {
  id: string;
  client_type: ClientType;
  status: ClientStatus;
  risk_rating: RiskRating;
  kyc_status: KycStatus;
  next_review_date: string | null;
  total_lifetime_volume: number;
  total_lifetime_deals: number;
  preferred_currency_pair: string | null;
  updated_at: string;
  individual_details: { first_name: string; last_name: string; email_primary: string | null } | null;
  corporate_details: { company_name: string } | null;
  account_manager: { full_name: string } | null;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [kycFilter, setKycFilter] = useState<string>('all');
  const supabase = createClient();
  const { role } = useUser();

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select(
          `
          *,
          individual_details (first_name, last_name, email_primary),
          corporate_details (company_name),
          account_manager:user_profiles!clients_assigned_account_manager_id_fkey (full_name)
        `
        )
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (data) {
        setClients(data as unknown as ClientRow[]);
      }
      setLoading(false);
    };

    fetchClients();
  }, []);

  const getDisplayName = (client: ClientRow): string => {
    if (client.client_type === 'corporate' && client.corporate_details) {
      return client.corporate_details.company_name;
    }
    if (client.individual_details) {
      return `${client.individual_details.first_name} ${client.individual_details.last_name}`;
    }
    return 'Unknown';
  };

  const filteredClients = clients.filter((client) => {
    const name = getDisplayName(client).toLowerCase();
    const matchesSearch = searchQuery === '' || name.includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    const matchesRisk = riskFilter === 'all' || client.risk_rating === riskFilter;
    const matchesKyc = kycFilter === 'all' || client.kyc_status === kycFilter;
    return matchesSearch && matchesStatus && matchesRisk && matchesKyc;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#253859] tracking-tight">Clients</h1>
          <p className="text-[13px] text-[#717D93] mt-0.5">
            {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
            {(statusFilter !== 'all' || riskFilter !== 'all' || kycFilter !== 'all' || searchQuery) && (
              <span className="text-[#94A3B8]"> · filtered</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-[#E2E8F0] text-[#717D93] hover:bg-[#F4F5F7] hover:text-[#253859] hover:border-[#CBD5E1] h-8 text-[12px]"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
          <Button
            size="sm"
            className="bg-[#01A0FF] hover:bg-[#0090e6] text-white h-8 text-[12px] shadow-sm shadow-[#01A0FF]/15"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Client
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-[13px] bg-white border-[#E2E8F0] text-[#253859] placeholder:text-[#94A3B8] focus:border-[#01A0FF]/40"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-[130px] h-8 text-[12px] bg-white border-[#E2E8F0] text-[#717D93]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-white border-[#E2E8F0] shadow-lg">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="dormant">Dormant</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={(v) => v && setRiskFilter(v)}>
          <SelectTrigger className="w-[120px] h-8 text-[12px] bg-white border-[#E2E8F0] text-[#717D93]">
            <SelectValue placeholder="Risk" />
          </SelectTrigger>
          <SelectContent className="bg-white border-[#E2E8F0] shadow-lg">
            <SelectItem value="all">All Risk</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="unrated">Unrated</SelectItem>
          </SelectContent>
        </Select>
        <Select value={kycFilter} onValueChange={(v) => v && setKycFilter(v)}>
          <SelectTrigger className="w-[120px] h-8 text-[12px] bg-white border-[#E2E8F0] text-[#717D93]">
            <SelectValue placeholder="KYC" />
          </SelectTrigger>
          <SelectContent className="bg-white border-[#E2E8F0] shadow-lg">
            <SelectItem value="all">All KYC</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Client Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-[#E2E8F0] hover:bg-transparent bg-[#FAFBFC]">
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Name</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Type</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Status</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Risk</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">KYC</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Manager</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] text-right">Volume</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <TableRow key={i} className="border-[#E2E8F0]">
                  {[...Array(8)].map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 rounded skeleton-brand" style={{ animationDelay: `${(i * 8 + j) * 30}ms` }} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredClients.length === 0 ? (
              <TableRow className="border-[#E2E8F0]">
                <TableCell colSpan={8} className="text-center py-16">
                  <Users className="h-10 w-10 text-[#E2E8F0] mx-auto mb-3" />
                  <p className="text-[#717D93] font-medium text-[14px]">No clients found</p>
                  <p className="text-[13px] text-[#94A3B8] mt-1">
                    {searchQuery || statusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Add your first client to get started'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow
                  key={client.id}
                  className="border-[#E2E8F0] cursor-pointer table-row-hover"
                >
                  <TableCell>
                    <Link
                      href={`/clients/${client.id}`}
                      className="text-[13px] font-medium text-[#253859] hover:text-[#01A0FF] transition-colors"
                    >
                      {getDisplayName(client)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-[#717D93] text-[12px] capitalize">
                    {client.client_type.replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell>
                    <StatusPill style={STATUS_STYLES[client.status]} label={client.status} />
                  </TableCell>
                  <TableCell>
                    <StatusPill style={RISK_STYLES[client.risk_rating]} label={client.risk_rating} />
                  </TableCell>
                  <TableCell>
                    <StatusPill style={KYC_STYLES[client.kyc_status]} label={client.kyc_status.replace(/_/g, ' ')} />
                  </TableCell>
                  <TableCell className="text-[#717D93] text-[12px]">
                    {client.account_manager?.full_name || '—'}
                  </TableCell>
                  <TableCell className="text-right text-[#42526E] font-mono text-[12px]">
                    {client.total_lifetime_volume > 0
                      ? formatCurrency(client.total_lifetime_volume, 'GBP')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-[#717D93] text-[12px]">
                    {formatDate(client.next_review_date)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
