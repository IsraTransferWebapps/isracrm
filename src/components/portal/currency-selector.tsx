'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CURRENCIES = [
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
];

interface CurrencySelectorProps {
  value: string;
  onChange: (value: string) => void;
  exclude?: string;
  label?: string;
}

export function CurrencySelector({ value, onChange, exclude, label }: CurrencySelectorProps) {
  const options = exclude
    ? CURRENCIES.filter((c) => c.code !== exclude)
    : CURRENCIES;

  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-[#717D93] mb-1.5">{label}</label>
      )}
      <Select value={value} onValueChange={(v) => { if (v) onChange(v); }}>
        <SelectTrigger className="h-11">
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent>
          {options.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium">{c.symbol}</span>
                <span>{c.code}</span>
                <span className="text-[#94A3B8]">— {c.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
