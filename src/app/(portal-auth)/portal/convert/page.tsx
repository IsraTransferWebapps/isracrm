'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw, CheckCircle2, AlertCircle, ArrowDownUp } from 'lucide-react';
import { useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatRate, toMinor } from '@/lib/format';
import { CurrencySelector } from '@/components/portal/currency-selector';
import { AmountInput } from '@/components/portal/amount-input';
import { QuoteTimer } from '@/components/portal/quote-timer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Beneficiary } from '@/types/database';

type Step = 'input' | 'quoting' | 'quoted' | 'confirming' | 'confirmed' | 'error' | 'expired';

interface QuoteData {
  quote_id: string;
  sell_currency: string;
  buy_currency: string;
  sell_amount: number;
  buy_amount: number;
  rate: number;
  expires_at: string;
}

interface DealResult {
  deal_id: string;
  deal_reference: string;
  sell_currency: string;
  sell_amount: number;
  buy_currency: string;
  buy_amount: number;
  exchange_rate: number;
}

export default function ConvertPage() {
  const { clientId, loading: authLoading } = useOnboarding();
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState<Step>('input');
  const [sellCurrency, setSellCurrency] = useState('GBP');
  const [buyCurrency, setBuyCurrency] = useState('ILS');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [deal, setDeal] = useState<DealResult | null>(null);
  const [error, setError] = useState('');
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<string>('');

  // Fetch beneficiaries for the optional selection
  const fetchBeneficiaries = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from('beneficiaries')
      .select('id, nickname, beneficiary_name, currency, bank_name')
      .eq('client_id', clientId)
      .is('deleted_at', null);
    setBeneficiaries((data as Beneficiary[]) ?? []);
  }, [clientId, supabase]);

  const swapCurrencies = () => {
    setSellCurrency(buyCurrency);
    setBuyCurrency(sellCurrency);
  };

  const getQuote = async () => {
    const numericAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid amount');
      setStep('error');
      return;
    }

    setStep('quoting');
    setError('');
    await fetchBeneficiaries();

    try {
      const sellAmountMinor = toMinor(numericAmount);
      const res = await fetch(
        `/api/portal/rates?sell_currency=${sellCurrency}&buy_currency=${buyCurrency}&sell_amount=${sellAmountMinor}`
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to get quote');
      }

      const data = await res.json();
      setQuote(data);
      setStep('quoted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get quote');
      setStep('error');
    }
  };

  const confirmDeal = async () => {
    if (!quote) return;
    setStep('confirming');

    try {
      const res = await fetch('/api/portal/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: quote.quote_id,
          beneficiary_id: selectedBeneficiary || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 410) {
          setStep('expired');
          return;
        }
        throw new Error(data.error || 'Failed to book deal');
      }

      const data = await res.json();
      setDeal(data);
      setStep('confirmed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book deal');
      setStep('error');
    }
  };

  const reset = () => {
    setStep('input');
    setQuote(null);
    setDeal(null);
    setError('');
    setAmount('');
    setSelectedBeneficiary('');
  };

  if (authLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#253859]">Convert Currency</h1>
        <p className="mt-1 text-sm text-[#717D93]">Get a live rate and convert instantly</p>
      </div>

      <div className="max-w-lg">
        {/* Step 1: Input */}
        {(step === 'input' || step === 'error') && (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 space-y-5">
            <CurrencySelector
              label="Sell"
              value={sellCurrency}
              onChange={setSellCurrency}
              exclude={buyCurrency}
            />

            <div className="flex justify-center">
              <button
                onClick={swapCurrencies}
                className="p-2 rounded-full border border-[#E2E8F0] hover:bg-[#F4F5F7] transition-colors"
              >
                <ArrowDownUp className="h-4 w-4 text-[#94A3B8]" />
              </button>
            </div>

            <CurrencySelector
              label="Buy"
              value={buyCurrency}
              onChange={setBuyCurrency}
              exclude={sellCurrency}
            />

            <AmountInput
              label="Amount to sell"
              currency={sellCurrency}
              value={amount}
              onChange={setAmount}
              placeholder="1,000.00"
            />

            {step === 'error' && error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button
              className="w-full h-11"
              onClick={getQuote}
              disabled={!amount || parseFloat(amount.replace(/,/g, '')) <= 0}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Get Quote
            </Button>
          </div>
        )}

        {/* Step 1.5: Loading */}
        {step === 'quoting' && (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-8 text-center">
            <RefreshCw className="h-8 w-8 text-[#01A0FF] mx-auto mb-3 animate-spin" />
            <p className="text-sm text-[#717D93]">Fetching live rate...</p>
          </div>
        )}

        {/* Step 2: Quote */}
        {step === 'quoted' && quote && (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#253859]">Your Quote</h2>
              <QuoteTimer expiresAt={quote.expires_at} onExpired={() => setStep('expired')} />
            </div>

            <div className="bg-[#FAFBFC] rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#717D93]">You sell</span>
                <span className="font-mono font-medium text-[#253859]">
                  {formatCurrency(quote.sell_amount, quote.sell_currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#717D93]">Exchange rate</span>
                <span className="font-mono text-[#94A3B8]">{formatRate(quote.rate)}</span>
              </div>
              <div className="border-t border-[#E2E8F0] pt-3 flex justify-between text-sm">
                <span className="text-[#717D93]">You receive</span>
                <span className="font-mono font-semibold text-emerald-600 text-lg">
                  {formatCurrency(quote.buy_amount, quote.buy_currency)}
                </span>
              </div>
            </div>

            {/* Optional beneficiary selection */}
            {beneficiaries.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-[#717D93] mb-1.5">
                  Send to beneficiary (optional)
                </label>
                <Select value={selectedBeneficiary} onValueChange={(v) => setSelectedBeneficiary(v ?? '')}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select a beneficiary" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No beneficiary</SelectItem>
                    {beneficiaries
                      .filter((b) => !b.currency || b.currency === quote.buy_currency)
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.nickname || b.beneficiary_name}
                          {b.bank_name ? ` — ${b.bank_name}` : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-11" onClick={reset}>
                Cancel
              </Button>
              <Button className="flex-1 h-11" onClick={confirmDeal}>
                Confirm Conversion
              </Button>
            </div>
          </div>
        )}

        {/* Step 2.5: Confirming */}
        {step === 'confirming' && (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-8 text-center">
            <RefreshCw className="h-8 w-8 text-[#01A0FF] mx-auto mb-3 animate-spin" />
            <p className="text-sm text-[#717D93]">Booking your conversion...</p>
          </div>
        )}

        {/* Step 3: Confirmed */}
        {step === 'confirmed' && deal && (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 space-y-5 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <div>
              <h2 className="text-lg font-semibold text-[#253859]">Conversion Booked</h2>
              <p className="text-sm text-[#717D93] mt-1">
                Reference: <span className="font-mono font-medium text-[#253859]">{deal.deal_reference}</span>
              </p>
            </div>

            <div className="bg-[#FAFBFC] rounded-lg p-4 space-y-3 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-[#717D93]">Sold</span>
                <span className="font-mono text-[#253859]">{formatCurrency(deal.sell_amount, deal.sell_currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#717D93]">Bought</span>
                <span className="font-mono font-semibold text-emerald-600">{formatCurrency(deal.buy_amount, deal.buy_currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#717D93]">Rate</span>
                <span className="font-mono text-[#94A3B8]">{formatRate(deal.exchange_rate)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Link href="/portal/transactions" className="flex-1">
                <Button variant="outline" className="w-full">View Transactions</Button>
              </Link>
              <Button className="flex-1" onClick={reset}>
                Convert Again
              </Button>
            </div>
          </div>
        )}

        {/* Expired state */}
        {step === 'expired' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
            <div>
              <h2 className="text-lg font-semibold text-[#253859]">Quote Expired</h2>
              <p className="text-sm text-[#717D93] mt-1">
                The rate has expired. Please request a new quote.
              </p>
            </div>
            <Button onClick={() => { setStep('input'); setQuote(null); }}>
              Get New Quote
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
