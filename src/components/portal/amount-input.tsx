'use client';

import { useCallback, useState } from 'react';
import { Input } from '@/components/ui/input';

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£', ILS: '₪', USD: '$', EUR: '€',
};

interface AmountInputProps {
  currency: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export function AmountInput({ currency, value, onChange, label, placeholder }: AmountInputProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Allow only numbers and a single decimal point
      const raw = e.target.value.replace(/[^0-9.]/g, '');
      // Prevent multiple decimals
      const parts = raw.split('.');
      const sanitized = parts.length > 2
        ? parts[0] + '.' + parts.slice(1).join('')
        : raw;
      // Limit to 2 decimal places
      const finalParts = sanitized.split('.');
      const final = finalParts[1] && finalParts[1].length > 2
        ? finalParts[0] + '.' + finalParts[1].slice(0, 2)
        : sanitized;

      setDisplayValue(final);
      onChange(final);
    },
    [onChange]
  );

  const handleBlur = useCallback(() => {
    // Format with commas on blur
    const num = parseFloat(displayValue);
    if (!isNaN(num) && num > 0) {
      const formatted = new Intl.NumberFormat('en-GB', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
      setDisplayValue(formatted);
    }
  }, [displayValue]);

  const handleFocus = useCallback(() => {
    // Strip formatting on focus for editing
    const raw = displayValue.replace(/,/g, '');
    setDisplayValue(raw);
  }, [displayValue]);

  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-[#717D93] mb-1.5">{label}</label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[#94A3B8]">
          {symbol}
        </span>
        <Input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder || '0.00'}
          className="pl-8 h-11 text-lg font-mono"
        />
      </div>
    </div>
  );
}
