'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRightLeft,
  TrendingUp,
  Users,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Mail,
  Plus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { EmailList } from '@/components/email/email-list';
import { ComposeDialog } from '@/components/email/compose-dialog';
import type { Email } from '@/types/database';

// Placeholder -- full management dashboard with charts built in Phase 5
export default function DashboardPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const { profile } = useUser();
  const supabase = createClient();

  // Fetch recent emails for the current staff user
  useEffect(() => {
    if (!profile?.id) return;

    const fetchEmails = async () => {
      setEmailsLoading(true);
      const { data } = await supabase
        .from('emails')
        .select('*, client:clients(id, client_type, individual_details(first_name, last_name), corporate_details(company_name))')
        .eq('staff_user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) setEmails(data as Email[]);
      setEmailsLoading(false);
    };

    fetchEmails();
  }, [profile?.id]);

  const unreadCount = emails.filter((e) => !e.is_read).length;

  const kpiCards = [
    { label: 'Volume Traded', value: '\u2014', icon: DollarSign, iconColor: 'text-[#01A0FF]', bgClass: 'stat-card-blue' },
    { label: 'Revenue', value: '\u2014', icon: TrendingUp, iconColor: 'text-[#059669]', bgClass: 'stat-card-emerald' },
    { label: 'Deals Completed', value: '\u2014', icon: ArrowRightLeft, iconColor: 'text-[#7c3aed]', bgClass: 'stat-card-purple' },
    { label: 'New Clients', value: '\u2014', icon: Users, iconColor: 'text-[#0891b2]', bgClass: 'stat-card-cyan' },
    { label: 'Avg Margin', value: '\u2014', icon: BarChart3, iconColor: 'text-[#d97706]', bgClass: 'stat-card-amber' },
    { label: 'Open Alerts', value: '\u2014', icon: AlertTriangle, iconColor: 'text-[#dc2626]', bgClass: 'stat-card-red' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-[#253859] tracking-tight">Dashboard</h1>
        <p className="text-[13px] text-[#717D93] mt-0.5">Management overview and analytics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-xl border border-[#E2E8F0] p-4 ${kpi.bgClass}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
              <span className="text-[11px] text-[#717D93] font-medium">{kpi.label}</span>
            </div>
            <p className="text-[20px] font-semibold text-[#253859]">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-dashed border-[#E2E8F0] rounded-xl p-14 text-center bg-white">
          <BarChart3 className="h-10 w-10 text-[#E2E8F0] mx-auto mb-3" />
          <p className="text-[#94A3B8] text-[13px]">Volume &amp; Revenue charts will be built in Phase 5</p>
        </div>
        <div className="border border-dashed border-[#E2E8F0] rounded-xl p-14 text-center bg-white">
          <TrendingUp className="h-10 w-10 text-[#E2E8F0] mx-auto mb-3" />
          <p className="text-[#94A3B8] text-[13px]">Currency pair breakdown &amp; pipeline will be built in Phase 5</p>
        </div>
      </div>

      {/* Recent Emails */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        {/* Section header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <Mail className="h-4.5 w-4.5 text-[#01A0FF]" />
            <h2 className="text-[14px] font-semibold text-[#253859]">Recent Emails</h2>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold bg-[#01A0FF] text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => setComposeOpen(true)}
            className="bg-[#01A0FF] hover:bg-[#0090e6] text-white h-8 text-[12px] shadow-sm shadow-[#01A0FF]/15"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Compose
          </Button>
        </div>

        {/* Email list content */}
        {emailsLoading ? (
          <div className="space-y-0 divide-y divide-[#E2E8F0]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="h-3.5 w-3.5 rounded skeleton-brand flex-shrink-0" style={{ animationDelay: `${i * 60}ms` }} />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-48 rounded skeleton-brand" style={{ animationDelay: `${i * 60 + 20}ms` }} />
                  <div className="h-3 w-72 rounded skeleton-brand" style={{ animationDelay: `${i * 60 + 40}ms` }} />
                </div>
                <div className="h-3 w-14 rounded skeleton-brand flex-shrink-0" style={{ animationDelay: `${i * 60 + 60}ms` }} />
              </div>
            ))}
          </div>
        ) : (
          <EmailList emails={emails} compact={true} showClient={true} />
        )}
      </div>

      {/* Compose Dialog */}
      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onSent={() => {
          // Refresh emails after sending
          if (profile?.id) {
            supabase
              .from('emails')
              .select('*, client:clients(id, client_type, individual_details(first_name, last_name), corporate_details(company_name))')
              .eq('staff_user_id', profile.id)
              .order('created_at', { ascending: false })
              .limit(10)
              .then(({ data }) => {
                if (data) setEmails(data as Email[]);
              });
          }
        }}
      />
    </div>
  );
}
