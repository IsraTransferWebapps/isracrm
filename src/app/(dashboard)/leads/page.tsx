'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, UserPlus } from 'lucide-react';
import { formatDate } from '@/lib/format';
import Link from 'next/link';
import type { ClientType, KycStatus, OnboardingStatus } from '@/types/database';

// Onboarding status badge styles
const ONBOARDING_STATUS_STYLES: Record<OnboardingStatus, { bg: string; text: string; dot: string }> = {
  in_progress: { bg: 'bg-[#F4F5F7]', text: 'text-[#717D93]', dot: 'bg-[#94A3B8]' },
  submitted: { bg: 'bg-[#eff6ff]', text: 'text-[#0284c7]', dot: 'bg-[#01A0FF]' },
  under_review: { bg: 'bg-[#f5f3ff]', text: 'text-[#7c3aed]', dot: 'bg-[#8b5cf6]' },
  approved: { bg: 'bg-[#ecfdf5]', text: 'text-[#059669]', dot: 'bg-[#10b981]' },
  rejected: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', dot: 'bg-[#ef4444]' },
  returned: { bg: 'bg-[#fffbeb]', text: 'text-[#d97706]', dot: 'bg-[#f59e0b]' },
};

const KYC_STYLES: Record<KycStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-[#F4F5F7]', text: 'text-[#717D93]', dot: 'bg-[#94A3B8]' },
  in_review: { bg: 'bg-[#eff6ff]', text: 'text-[#0284c7]', dot: 'bg-[#01A0FF]' },
  approved: { bg: 'bg-[#ecfdf5]', text: 'text-[#059669]', dot: 'bg-[#10b981]' },
  expired: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', dot: 'bg-[#ef4444]' },
  rejected: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', dot: 'bg-[#ef4444]' },
};

function StatusPill({ style, label }: { style: { bg: string; text: string; dot: string }; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}

interface LeadRow {
  id: string;
  client_type: ClientType;
  kyc_status: KycStatus;
  created_at: string;
  individual_details: { first_name: string; last_name: string; email_primary: string | null } | null;
  corporate_details: { company_name: string } | null;
  onboarding_sessions: {
    id: string;
    status: OnboardingStatus;
    submitted_at: string | null;
    current_step: string;
    review_notes: string | null;
  }[] | null;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const supabase = createClient();

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('clients')
        .select(`
          id, client_type, kyc_status, created_at,
          individual_details (first_name, last_name, email_primary),
          corporate_details (company_name),
          onboarding_sessions (id, status, submitted_at, current_step, review_notes)
        `)
        .is('deleted_at', null)
        .eq('status', 'prospect')
        .order('created_at', { ascending: false });

      if (data) {
        setLeads(data as unknown as LeadRow[]);
      }
      setLoading(false);
    };

    fetchLeads();
  }, []);

  const getDisplayName = (lead: LeadRow): string => {
    if (lead.client_type === 'corporate' && lead.corporate_details) {
      return lead.corporate_details.company_name;
    }
    if (lead.individual_details) {
      return `${lead.individual_details.first_name} ${lead.individual_details.last_name}`;
    }
    return 'Unknown';
  };

  const getEmail = (lead: LeadRow): string => {
    return lead.individual_details?.email_primary || '—';
  };

  const getSession = (lead: LeadRow) => {
    // Get the most recent onboarding session
    if (!lead.onboarding_sessions || lead.onboarding_sessions.length === 0) return null;
    return lead.onboarding_sessions[0];
  };

  const filteredLeads = leads.filter((lead) => {
    const name = getDisplayName(lead).toLowerCase();
    const email = getEmail(lead).toLowerCase();
    const matchesSearch = searchQuery === '' || name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
    const session = getSession(lead);
    const matchesStatus = statusFilter === 'all' || session?.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Count by status for the subtitle
  const submittedCount = leads.filter((l) => {
    const s = getSession(l);
    return s?.status === 'submitted' || s?.status === 'under_review';
  }).length;

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#253859] tracking-tight">Leads</h1>
          <p className="text-[13px] text-[#717D93] mt-0.5">
            {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
            {submittedCount > 0 && (
              <span className="text-[#0284c7]"> · {submittedCount} pending review</span>
            )}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-[13px] bg-white border-[#E2E8F0] text-[#253859] placeholder:text-[#94A3B8] focus:border-[#01A0FF]/40"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-[150px] h-8 text-[12px] bg-white border-[#E2E8F0] text-[#717D93]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-white border-[#E2E8F0] shadow-lg">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Leads Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-[#E2E8F0] hover:bg-transparent bg-[#FAFBFC]">
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Name</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Email</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Type</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Onboarding</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">KYC</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <TableRow key={i} className="border-[#E2E8F0]">
                  {[...Array(6)].map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 rounded skeleton-brand" style={{ animationDelay: `${(i * 6 + j) * 30}ms` }} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredLeads.length === 0 ? (
              <TableRow className="border-[#E2E8F0]">
                <TableCell colSpan={6} className="text-center py-16">
                  <UserPlus className="h-10 w-10 text-[#E2E8F0] mx-auto mb-3" />
                  <p className="text-[#717D93] font-medium text-[14px]">No leads found</p>
                  <p className="text-[13px] text-[#94A3B8] mt-1">
                    {searchQuery || statusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Leads will appear here when clients register through the onboarding portal'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => {
                const session = getSession(lead);
                return (
                  <TableRow
                    key={lead.id}
                    className="border-[#E2E8F0] cursor-pointer table-row-hover"
                  >
                    <TableCell>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-[13px] font-medium text-[#253859] hover:text-[#01A0FF] transition-colors"
                      >
                        {getDisplayName(lead)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-[#717D93] text-[12px]">
                      {getEmail(lead)}
                    </TableCell>
                    <TableCell className="text-[#717D93] text-[12px] capitalize">
                      {lead.client_type.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell>
                      {session ? (
                        <StatusPill
                          style={ONBOARDING_STATUS_STYLES[session.status]}
                          label={session.status.replace(/_/g, ' ')}
                        />
                      ) : (
                        <span className="text-[12px] text-[#94A3B8]">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        style={KYC_STYLES[lead.kyc_status]}
                        label={lead.kyc_status.replace(/_/g, ' ')}
                      />
                    </TableCell>
                    <TableCell className="text-[#717D93] text-[12px]">
                      {session?.submitted_at ? formatDate(session.submitted_at) : '—'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
