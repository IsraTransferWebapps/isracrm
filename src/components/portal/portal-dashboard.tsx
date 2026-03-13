'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Wallet, ArrowRightLeft, RefreshCw, Landmark, MessageSquare } from 'lucide-react';
import { useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, formatCurrencyPair } from '@/lib/format';
import { StatusPill } from '@/components/status-pill';
import { DEAL_STATUS_STYLES } from '@/lib/status-styles';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Deal, LedgerEntry } from '@/types/database';

interface BalanceEntry {
  currency: string;
  balance: number;
}

const CURRENCY_ICONS: Record<string, string> = {
  GBP: '£',
  ILS: '₪',
  USD: '$',
  EUR: '€',
};

export function PortalDashboard() {
  const { clientName, clientId, loading: authLoading } = useOnboarding();
  const supabase = useMemo(() => createClient(), []);
  const [balances, setBalances] = useState<BalanceEntry[]>([]);
  const [recentDeals, setRecentDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!clientId) return;

    // Fetch balances (latest per currency from ledger)
    const { data: ledgerEntries } = await supabase
      .from('ledger_entries')
      .select('currency, running_balance, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (ledgerEntries) {
      const balanceMap = new Map<string, number>();
      for (const entry of ledgerEntries) {
        if (!balanceMap.has(entry.currency)) {
          balanceMap.set(entry.currency, entry.running_balance);
        }
      }
      setBalances(
        Array.from(balanceMap.entries()).map(([currency, balance]) => ({
          currency,
          balance,
        }))
      );
    }

    // Fetch recent deals
    const { data: deals } = await supabase
      .from('deals')
      .select('id, deal_reference, deal_type, status, sell_currency, sell_amount, buy_currency, buy_amount, exchange_rate, created_at')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (deals) {
      setRecentDeals(deals as Deal[]);
    }

    setLoading(false);
  }, [clientId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const firstName = clientName?.split(' ').find((_, i) => i === (clientName.split(' ')[0]?.length === (clientName.split(' ')[0]?.match(/^(Mr|Mrs|Ms|Dr|Prof)$/i) ? clientName.split(' ')[0].length : 0) ? 1 : 0)) || clientName?.split(' ')[0];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-semibold text-[#253859]">
          Welcome back{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-[#717D93]">
          Here&apos;s an overview of your account
        </p>
      </div>

      {/* Balance Cards */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8] mb-3">
          Account Balances
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {balances.length > 0 ? (
            balances.map(({ currency, balance }) => (
              <div
                key={currency}
                className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm"
              >
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
              <p className="text-xs text-[#94A3B8] mt-1">Your balances will appear here once you make your first transaction</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/portal/convert">
          <Button>
            <RefreshCw className="h-4 w-4 mr-2" />
            Convert Currency
          </Button>
        </Link>
        <Link href="/portal/beneficiaries">
          <Button variant="outline">
            <Landmark className="h-4 w-4 mr-2" />
            Manage Beneficiaries
          </Button>
        </Link>
        <Link href="/portal/messages">
          <Button variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Message
          </Button>
        </Link>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
            Recent Transactions
          </p>
          {recentDeals.length > 0 && (
            <Link href="/portal/transactions" className="text-xs font-medium text-[#01A0FF] hover:underline">
              View all
            </Link>
          )}
        </div>

        {recentDeals.length > 0 ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#FAFBFC] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
                  <th className="text-left px-4 py-3">Reference</th>
                  <th className="text-left px-4 py-3">Pair</th>
                  <th className="text-right px-4 py-3">Sell</th>
                  <th className="text-right px-4 py-3">Buy</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentDeals.map((deal) => {
                  const statusStyle = DEAL_STATUS_STYLES[deal.status];
                  return (
                    <tr key={deal.id} className="border-t border-[#E2E8F0] hover:bg-[#FAFBFC] transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-[#253859]">
                        {deal.deal_reference}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#717D93]">
                        {formatCurrencyPair(deal.sell_currency, deal.buy_currency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-[#717D93]">
                        {formatCurrency(deal.sell_amount, deal.sell_currency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-[#253859]">
                        {formatCurrency(deal.buy_amount, deal.buy_currency)}
                      </td>
                      <td className="px-4 py-3">
                        {statusStyle && <StatusPill style={statusStyle} />}
                      </td>
                      <td className="px-4 py-3 text-xs text-right text-[#94A3B8]">
                        {formatDate(deal.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-[#FAFBFC] p-8 text-center">
            <ArrowRightLeft className="h-8 w-8 text-[#E2E8F0] mx-auto mb-2" />
            <p className="text-sm text-[#717D93]">No transactions yet</p>
            <p className="text-xs text-[#94A3B8] mt-1">
              <Link href="/portal/convert" className="text-[#01A0FF] hover:underline">Convert currency</Link> to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
