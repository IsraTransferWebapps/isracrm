'use client';

import { useUser } from '@/hooks/use-user';
import { ROLE_LABELS, canManageOnboardingConfig } from '@/lib/roles';
import { User, Shield, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { profile, role } = useUser();

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-[#253859] tracking-tight">Settings</h1>
        <p className="text-[13px] text-[#717D93] mt-0.5">Account and system configuration</p>
      </div>

      {/* Profile Card */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-7 w-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-[#01A0FF]" />
          </div>
          <h2 className="text-[13px] font-semibold text-[#253859]">Your Profile</h2>
        </div>
        <div className="grid grid-cols-2 gap-y-5 gap-x-8">
          <div>
            <p className="text-[11px] text-[#94A3B8] mb-1">Name</p>
            <p className="text-[13px] text-[#253859]">{profile?.full_name || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] text-[#94A3B8] mb-1">Email</p>
            <p className="text-[13px] text-[#253859]">{profile?.email || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] text-[#94A3B8] mb-1">Role</p>
            <p className="text-[13px]">
              {role ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EFF6FF] text-[#01A0FF]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#01A0FF]" />
                  {ROLE_LABELS[role]}
                </span>
              ) : (
                '—'
              )}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#94A3B8] mb-1">Status</p>
            <p className="text-[13px]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#ecfdf5] text-[#059669]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                Active
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Onboarding Forms — management only */}
      {canManageOnboardingConfig(role) && (
        <Link href="/settings/onboarding-forms" className="block">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm hover:border-[#01A0FF] hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center group-hover:bg-[#01A0FF]/10 transition-colors">
                  <FileText className="h-3.5 w-3.5 text-[#01A0FF]" />
                </div>
                <div>
                  <h2 className="text-[13px] font-semibold text-[#253859] group-hover:text-[#01A0FF] transition-colors">Onboarding Forms</h2>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">
                    Configure fields, sections, and validation for client onboarding forms
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#01A0FF] transition-colors" />
            </div>
          </div>
        </Link>
      )}

      {/* System Info */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-7 w-7 rounded-lg bg-[#f5f3ff] flex items-center justify-center">
            <Shield className="h-3.5 w-3.5 text-[#7c3aed]" />
          </div>
          <h2 className="text-[13px] font-semibold text-[#253859]">System Information</h2>
        </div>
        <div className="space-y-0">
          {[
            { label: 'Application', value: 'IsraCRM v0.1.0' },
            { label: 'Licence', value: 'IsraTransfer Ltd — No. 57488' },
            { label: 'Environment', value: 'Development' },
          ].map((item, i) => (
            <div
              key={item.label}
              className="flex justify-between items-center py-3 border-b border-[#E2E8F0] last:border-0"
            >
              <span className="text-[12px] text-[#717D93]">{item.label}</span>
              <span className="text-[13px] text-[#253859]">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
