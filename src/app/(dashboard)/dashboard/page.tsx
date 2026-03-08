'use client';

import {
  ArrowRightLeft,
  TrendingUp,
  Users,
  AlertTriangle,
  DollarSign,
  BarChart3,
} from 'lucide-react';

// Placeholder — full management dashboard with charts built in Phase 5
export default function DashboardPage() {
  const kpiCards = [
    { label: 'Volume Traded', value: '—', icon: DollarSign, iconColor: 'text-[#01A0FF]', bgClass: 'stat-card-blue' },
    { label: 'Revenue', value: '—', icon: TrendingUp, iconColor: 'text-[#059669]', bgClass: 'stat-card-emerald' },
    { label: 'Deals Completed', value: '—', icon: ArrowRightLeft, iconColor: 'text-[#7c3aed]', bgClass: 'stat-card-purple' },
    { label: 'New Clients', value: '—', icon: Users, iconColor: 'text-[#0891b2]', bgClass: 'stat-card-cyan' },
    { label: 'Avg Margin', value: '—', icon: BarChart3, iconColor: 'text-[#d97706]', bgClass: 'stat-card-amber' },
    { label: 'Open Alerts', value: '—', icon: AlertTriangle, iconColor: 'text-[#dc2626]', bgClass: 'stat-card-red' },
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
    </div>
  );
}
