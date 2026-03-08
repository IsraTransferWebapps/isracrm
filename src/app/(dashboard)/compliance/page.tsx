'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShieldCheck, AlertTriangle, Clock, FileWarning } from 'lucide-react';
import { formatDate } from '@/lib/format';
import type { AlertSeverity, AlertStatus } from '@/types/database';

const SEVERITY_STYLES: Record<AlertSeverity, { bg: string; text: string; dot: string }> = {
  info: { bg: 'bg-[#eff6ff]', text: 'text-[#0284c7]', dot: 'bg-[#01A0FF]' },
  warning: { bg: 'bg-[#fffbeb]', text: 'text-[#d97706]', dot: 'bg-[#f59e0b]' },
  critical: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', dot: 'bg-[#ef4444]' },
};

function StatusPill({ style, label }: { style: { bg: string; text: string; dot: string }; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}

export default function CompliancePage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState({ open: 0, critical: 0, kycExpiring: 0, reviewsDue: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: alertData } = await supabase
        .from('compliance_alerts')
        .select('*, client:clients!compliance_alerts_client_id_fkey (id, individual_details (first_name, last_name), corporate_details (company_name), client_type)')
        .is('deleted_at', null)
        .in('status', ['open', 'under_review'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (alertData) {
        setAlerts(alertData);
        setStats({
          open: alertData.filter((a: any) => a.status === 'open').length,
          critical: alertData.filter((a: any) => a.severity === 'critical').length,
          kycExpiring: 0,
          reviewsDue: 0,
        });
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const getClientName = (alert: any): string => {
    if (!alert.client) return 'Unknown';
    if (alert.client.client_type === 'corporate') {
      return alert.client.corporate_details?.company_name || 'Unknown';
    }
    const ind = alert.client.individual_details;
    return ind ? `${ind.first_name} ${ind.last_name}` : 'Unknown';
  };

  const statCards = [
    {
      label: 'Open Alerts',
      value: stats.open,
      icon: AlertTriangle,
      iconColor: 'text-[#d97706]',
      bgClass: 'stat-card-amber',
    },
    {
      label: 'Critical',
      value: stats.critical,
      icon: ShieldCheck,
      iconColor: 'text-[#dc2626]',
      bgClass: 'stat-card-red',
    },
    {
      label: 'KYC Expiring',
      value: stats.kycExpiring,
      icon: FileWarning,
      iconColor: 'text-[#01A0FF]',
      bgClass: 'stat-card-blue',
    },
    {
      label: 'Reviews Due',
      value: stats.reviewsDue,
      icon: Clock,
      iconColor: 'text-[#7c3aed]',
      bgClass: 'stat-card-purple',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-[#253859] tracking-tight">Compliance</h1>
        <p className="text-[13px] text-[#717D93] mt-0.5">AML monitoring, KYC tracking, and risk management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border border-[#E2E8F0] p-4 ${card.bgClass}`}
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-white/60 flex items-center justify-center shadow-sm">
                <card.icon className={`h-[18px] w-[18px] ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-[22px] font-semibold text-[#253859] leading-none">{card.value}</p>
                <p className="text-[11px] text-[#717D93] mt-0.5">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Queue */}
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8] mb-3">Alert Queue</h2>
        <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-[#E2E8F0] hover:bg-transparent bg-[#FAFBFC]">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Severity</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Type</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Client</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Description</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Status</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i} className="border-[#E2E8F0]">
                    {[...Array(6)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 rounded skeleton-brand" style={{ animationDelay: `${(i * 6 + j) * 30}ms` }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <ShieldCheck className="h-10 w-10 text-[#10b981]/30 mx-auto mb-3" />
                    <p className="text-[#717D93] font-medium text-[14px]">No open alerts</p>
                    <p className="text-[13px] text-[#94A3B8] mt-1">All clear — no compliance issues detected</p>
                  </TableCell>
                </TableRow>
              ) : (
                alerts.map((alert) => (
                  <TableRow key={alert.id} className="border-[#E2E8F0] table-row-hover">
                    <TableCell>
                      <StatusPill style={SEVERITY_STYLES[alert.severity as AlertSeverity]} label={alert.severity} />
                    </TableCell>
                    <TableCell className="text-[12px] text-[#42526E] capitalize">
                      {alert.alert_type.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell className="text-[13px] text-[#253859]">{getClientName(alert)}</TableCell>
                    <TableCell className="text-[12px] text-[#717D93] max-w-xs truncate">
                      {alert.description || '—'}
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        style={{ bg: 'bg-[#F4F5F7]', text: 'text-[#717D93]', dot: 'bg-[#94A3B8]' }}
                        label={alert.status.replace(/_/g, ' ')}
                      />
                    </TableCell>
                    <TableCell className="text-[12px] text-[#717D93]">{formatDate(alert.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
