'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Search, Users, ArrowRightLeft } from 'lucide-react';
import Link from 'next/link';

interface SearchResult {
  type: 'client' | 'trade';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const searchResults: SearchResult[] = [];

      // Search individuals
      const { data: individuals } = await supabase
        .from('individual_details')
        .select('client_id, first_name, last_name, email_primary')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email_primary.ilike.%${query}%,phone_primary.ilike.%${query}%`)
        .limit(10);

      if (individuals) {
        individuals.forEach((ind) => {
          searchResults.push({
            type: 'client',
            id: ind.client_id,
            title: `${ind.first_name} ${ind.last_name}`,
            subtitle: ind.email_primary || 'Individual',
            href: `/clients/${ind.client_id}`,
          });
        });
      }

      // Search corporates
      const { data: corporates } = await supabase
        .from('corporate_details')
        .select('client_id, company_name, company_registration_number')
        .or(`company_name.ilike.%${query}%,company_registration_number.ilike.%${query}%`)
        .limit(10);

      if (corporates) {
        corporates.forEach((corp) => {
          searchResults.push({
            type: 'client',
            id: corp.client_id,
            title: corp.company_name,
            subtitle: corp.company_registration_number || 'Corporate',
            href: `/clients/${corp.client_id}`,
          });
        });
      }

      // Search deals by reference — link to the client's trades tab
      const { data: deals } = await supabase
        .from('deals')
        .select('id, client_id, deal_reference, sell_currency, buy_currency, status')
        .ilike('deal_reference', `%${query}%`)
        .is('deleted_at', null)
        .limit(10);

      if (deals) {
        deals.forEach((deal) => {
          searchResults.push({
            type: 'trade',
            id: deal.id,
            title: deal.deal_reference,
            subtitle: `${deal.sell_currency} → ${deal.buy_currency} · ${deal.status}`,
            href: `/clients/${deal.client_id}`,
          });
        });
      }

      setResults(searchResults);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-[#253859] tracking-tight">Search</h1>
        <p className="text-[13px] text-[#717D93] mt-0.5">Find clients, trades, and documents</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8]" />
        <Input
          ref={inputRef}
          placeholder="Search by name, email, phone, trade reference..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-12 py-6 text-[15px] bg-white border-[#E2E8F0] text-[#253859] placeholder:text-[#94A3B8] focus:border-[#01A0FF]/40 focus:ring-[#01A0FF]/20 shadow-sm"
        />
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="border border-[#E2E8F0] rounded-xl bg-white divide-y divide-[#E2E8F0] overflow-hidden shadow-sm">
          {results.map((result) => (
            <Link
              key={`${result.type}-${result.id}`}
              href={result.href}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#F8FAFC] transition-colors"
            >
              <div className="h-8 w-8 rounded-lg bg-[#F4F5F7] flex items-center justify-center">
                {result.type === 'client' ? (
                  <Users className="h-4 w-4 text-[#01A0FF]" />
                ) : (
                  <ArrowRightLeft className="h-4 w-4 text-[#059669]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#253859] truncate">{result.title}</p>
                <p className="text-[11px] text-[#94A3B8] truncate">{result.subtitle}</p>
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#94A3B8] bg-[#F4F5F7] px-2 py-0.5 rounded-full">
                {result.type}
              </span>
            </Link>
          ))}
        </div>
      )}

      {query.length >= 2 && results.length === 0 && !loading && (
        <div className="text-center py-16">
          <Search className="h-10 w-10 text-[#E2E8F0] mx-auto mb-3" />
          <p className="text-[#717D93] text-[14px]">No results found for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {query.length < 2 && (
        <div className="text-center py-16">
          <p className="text-[#717D93] text-[13px]">Type at least 2 characters to search</p>
          <p className="text-[#94A3B8] text-[12px] mt-2">
            Tip: Use{' '}
            <kbd className="px-1.5 py-0.5 bg-[#F4F5F7] border border-[#E2E8F0] rounded text-[#717D93] font-mono text-[10px]">
              ⌘K
            </kbd>{' '}
            from anywhere to open search
          </p>
        </div>
      )}
    </div>
  );
}
