'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { User, Mail, Phone, MapPin, Briefcase, Building2, Globe, MessageSquare } from 'lucide-react';
import { useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { IndividualDetails, CorporateDetails, Client } from '@/types/database';

/** Mask sensitive values — show only last 4 chars */
function mask(value: string | null): string {
  if (!value || value.length <= 4) return value || '—';
  return '••••' + value.slice(-4);
}

interface ProfileRow {
  label: string;
  value: string | null | undefined;
  icon?: React.ComponentType<{ className?: string }>;
  masked?: boolean;
}

export default function ProfilePage() {
  const { clientId, clientType, loading: authLoading } = useOnboarding();
  const supabase = useMemo(() => createClient(), []);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!clientId) return;

    const { data } = await supabase
      .from('clients')
      .select(`
        *,
        individual_details (*),
        corporate_details (*)
      `)
      .eq('id', clientId)
      .single();

    if (data) {
      setClient(data as Client);
    }
    setLoading(false);
  }, [clientId, supabase]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!client) {
    return <p className="text-sm text-[#717D93]">Profile not found.</p>;
  }

  const isCorporate = clientType === 'corporate';
  const ind = Array.isArray(client.individual_details)
    ? client.individual_details[0]
    : client.individual_details;
  const corp = Array.isArray(client.corporate_details)
    ? client.corporate_details[0]
    : client.corporate_details;

  const individualRows: ProfileRow[] = ind ? [
    { label: 'Full Name', value: [ind.title, ind.first_name, ind.last_name].filter(Boolean).join(' '), icon: User },
    { label: 'Email', value: ind.email_primary, icon: Mail },
    { label: 'Phone', value: ind.phone_primary, icon: Phone },
    { label: 'Date of Birth', value: formatDate(ind.date_of_birth) },
    { label: 'Nationality', value: ind.nationality, icon: Globe },
    { label: 'Country of Residence', value: ind.country_of_residence },
    { label: 'Address', value: [ind.address_line_1, ind.address_line_2, ind.address_city, ind.address_region, ind.address_postal_code, ind.address_country].filter(Boolean).join(', '), icon: MapPin },
    { label: 'Occupation', value: ind.occupation, icon: Briefcase },
    { label: 'Employer', value: ind.employer },
    { label: 'Passport Number', value: mask(ind.passport_number), masked: true },
    { label: 'Israeli ID', value: ind.israeli_id_number ? mask(ind.israeli_id_number) : null, masked: true },
  ] : [];

  const corporateRows: ProfileRow[] = corp ? [
    { label: 'Company Name', value: corp.company_name, icon: Building2 },
    { label: 'Registration Number', value: corp.company_registration_number },
    { label: 'Country of Incorporation', value: corp.country_of_incorporation, icon: Globe },
    { label: 'Industry', value: corp.industry, icon: Briefcase },
    { label: 'Registered Address', value: [corp.registered_address_line_1, corp.registered_address_city, corp.registered_address_country].filter(Boolean).join(', '), icon: MapPin },
    { label: 'Website', value: corp.website },
    { label: 'VAT Number', value: corp.vat_number },
  ] : [];

  const rows = isCorporate ? corporateRows : individualRows;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#253859]">Profile</h1>
        <p className="mt-1 text-sm text-[#717D93]">Your account details</p>
      </div>

      <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
        <div className="px-5 py-4 bg-[#FAFBFC] border-b border-[#E2E8F0]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
            {isCorporate ? 'Company Details' : 'Personal Details'}
          </p>
        </div>
        <div className="divide-y divide-[#E2E8F0]">
          {rows.map((row) => {
            if (!row.value || row.value === '—') return null;
            const Icon = row.icon;
            return (
              <div key={row.label} className="flex items-center px-5 py-3.5">
                <div className="flex items-center gap-3 w-48 flex-shrink-0">
                  {Icon && <Icon className="h-4 w-4 text-[#94A3B8]" />}
                  <span className="text-xs font-medium text-[#94A3B8]">{row.label}</span>
                </div>
                <span className={`text-sm text-[#253859] ${row.masked ? 'font-mono' : ''}`}>
                  {row.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Account Info */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
        <div className="px-5 py-4 bg-[#FAFBFC] border-b border-[#E2E8F0]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
            Account Information
          </p>
        </div>
        <div className="divide-y divide-[#E2E8F0]">
          <div className="flex items-center px-5 py-3.5">
            <span className="text-xs font-medium text-[#94A3B8] w-48">Account Status</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Active
            </span>
          </div>
          <div className="flex items-center px-5 py-3.5">
            <span className="text-xs font-medium text-[#94A3B8] w-48">Member Since</span>
            <span className="text-sm text-[#253859]">
              {formatDate(client.onboarding_date || client.created_at)}
            </span>
          </div>
          <div className="flex items-center px-5 py-3.5">
            <span className="text-xs font-medium text-[#94A3B8] w-48">Account Type</span>
            <span className="text-sm text-[#253859] capitalize">
              {clientType?.replace(/_/g, ' ') || 'Individual'}
            </span>
          </div>
        </div>
      </div>

      {/* Update notice */}
      <div className="rounded-lg bg-[#EFF6FF] border border-[#01A0FF]/20 px-4 py-3">
        <p className="text-xs text-[#717D93]">
          Need to update your details? Contact your account manager for assistance.
        </p>
        <Link href="/portal/messages" className="inline-flex items-center text-xs text-[#01A0FF] hover:underline mt-1">
          <MessageSquare className="h-3 w-3 mr-1" />
          Send a message
        </Link>
      </div>
    </div>
  );
}
