'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Wallet } from 'lucide-react';
import { useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/format';
import { StatusPill } from '@/components/status-pill';
import { TRANSFER_TYPE_STYLES } from '@/lib/status-styles';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LedgerEntry } from '@/types/database';

interface BalanceEntry {
  currency: string;
  balance: number;
}

const CURRENCY_ICONS: Record<string, string> = {
  GBP: '£', ILS: '₪', USD: '$', EUR: '€',
};

export default function BalancesPage() {
  const { clientId, loading: authLoading } = useOnboarding();
  const supabase = useMemo(() => createClient(), []);
  const [balances, setBalances] = useState<BalanceEntry[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!clientId) return;

    const { data: entries } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (entries) {
      setLedger(entries as LedgerEntry[]);
      // Derive balances from latest entry per currency
      const balanceMap = new Map<string, number>();
      for (const entry of entries) {
        if (!balanceMap.has(entry.currency)) {
          balanceMap.set(entry.currency, entry.running_balance);
        }
      }
      setBalances(Array.from(balanceMap.entries()).map(([currency, balance]) => ({ currency, balance })));
    }

    setLoading(false);
  }, [clientId, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredLedger = currencyFilter === 'all'
    ? ledger
    : ledger.filter((e) => e.currency === currencyFilter);

  const currencies = [...new Set(ledger.map((e) => e.currency))];

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-[#253859]">Balances</h1>
        <p className="mt-1 text-sm text-[#717D93]">Your account balances and transaction history</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {balances.length > 0 ? (
          balances.map(({ currency, balance }) => (
            <div key={currency} className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#717D93]">{currency}</span>
                <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#EFF6FF] text-[#01A0FF] text-sm font-semibold">
                  {CURRENCY_ICONS[currency] || currency[0]}
                </span>
              </div>
              <p className="text-lg font-semibold text-[#253859] font-mono">
                {formatCurrency(balance, currency)}
              </p>
            </div>
          ))
        ) : (
          <div className="col-span-full rounded-xl border border-dashed border-[#E2E8F0] bg-[#FAFBFC] p-8 text-center">
            <Wallet className="h-8 w-8 text-[#E2E8F0] mx-auto mb-2" />
            <p className="text-sm text-[#717D93]">No balances yet</p>
          </div>
        )}
      </div>

      {/* Ledger History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
            Ledger History
          </p>
          {currencies.length > 1 && (
            <Select value={currencyFilter} onValueChange={(v) => setCurrencyFilter(v ?? 'all')}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="All currencies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All currencies</SelectItem>
                {currencies.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {filteredLedger.length > 0 ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#FAFBFC] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Currency</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-right px-4 py-3">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.map((entry) => {
                  const typeStyle = TRANSFER_TYPE_STYLES[entry.entry_type];
                  const isPositive = entry.amount > 0;
                  return (
                    <tr key={entry.id} className="border-t border-[#E2E8F0] hover:bg-[#FAFBFC] transition-colors">
                      <td className="px-4 py-3 text-xs text-[#94A3B8]">{formatDate(entry.created_at)}</td>
                      <td className="px-4 py-3">
                        {typeStyle && <StatusPill style={typeStyle} />}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#717D93]">{entry.currency}</td>
                      <td className={`px-4 py-3 text-sm text-right font-mono ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : ''}{formatCurrency(entry.amount, entry.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-[#253859]">
                        {formatCurrency(entry.running_balance, entry.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-[#FAFBFC] p-8 text-center">
            <p className="text-sm text-[#717D93]">No ledger entries yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
