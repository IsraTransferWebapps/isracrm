'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, formatCurrencyPair, formatRate } from '@/lib/format';
import { StatusPill } from '@/components/status-pill';
import { DEAL_STATUS_STYLES, DEAL_TYPE_STYLES } from '@/lib/status-styles';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Deal } from '@/types/database';

const STATUSES = ['all', 'quoted', 'booked', 'funds_received', 'funds_sent', 'completed', 'cancelled'];
const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const { clientId, loading: authLoading } = useOnboarding();
  const supabase = useMemo(() => createClient(), []);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchDeals = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);

    const offset = (page - 1) * PAGE_SIZE;
    let query = supabase
      .from('deals')
      .select('id, deal_reference, deal_type, status, sell_currency, sell_amount, buy_currency, buy_amount, exchange_rate, value_date, booked_at, completed_at, created_at', { count: 'exact' })
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, count } = await query;
    setDeals((data as Deal[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [clientId, supabase, page, statusFilter]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (authLoading) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#253859]">Transactions</h1>
        <p className="mt-1 text-sm text-[#717D93]">Your conversion history</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? 'all'); setPage(1); }}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all' ? 'All statuses' : DEAL_STATUS_STYLES[s]?.label || s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-[#94A3B8]">{total} transaction{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {loading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : deals.length > 0 ? (
        <>
          <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#FAFBFC] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
                  <th className="text-left px-4 py-3">Reference</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Pair</th>
                  <th className="text-right px-4 py-3">Sell</th>
                  <th className="text-right px-4 py-3">Buy</th>
                  <th className="text-right px-4 py-3">Rate</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => {
                  const statusStyle = DEAL_STATUS_STYLES[deal.status];
                  const typeStyle = DEAL_TYPE_STYLES[deal.deal_type];
                  return (
                    <tr key={deal.id} className="border-t border-[#E2E8F0] hover:bg-[#FAFBFC] transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-[#253859]">{deal.deal_reference}</td>
                      <td className="px-4 py-3">{typeStyle && <StatusPill style={typeStyle} />}</td>
                      <td className="px-4 py-3 text-sm text-[#717D93]">{formatCurrencyPair(deal.sell_currency, deal.buy_currency)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-[#717D93]">{formatCurrency(deal.sell_amount, deal.sell_currency)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-[#253859]">{formatCurrency(deal.buy_amount, deal.buy_currency)}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-[#94A3B8]">{formatRate(deal.exchange_rate)}</td>
                      <td className="px-4 py-3">{statusStyle && <StatusPill style={statusStyle} />}</td>
                      <td className="px-4 py-3 text-xs text-right text-[#94A3B8]">{formatDate(deal.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#94A3B8]">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-[#FAFBFC] p-12 text-center">
          <ArrowRightLeft className="h-8 w-8 text-[#E2E8F0] mx-auto mb-2" />
          <p className="text-sm text-[#717D93]">No transactions yet</p>
        </div>
      )}
    </div>
  );
}
