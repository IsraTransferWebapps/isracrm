// ============================================================
// Formatting utilities for currency, dates, and display values
// ============================================================

// Format minor units (pence/agorot) to display currency string
// e.g., 123456 GBP → "£1,234.56"
export function formatCurrency(amountInMinor: number, currency: string): string {
  const major = amountInMinor / 100;
  const currencyMap: Record<string, { locale: string; code: string }> = {
    GBP: { locale: 'en-GB', code: 'GBP' },
    ILS: { locale: 'he-IL', code: 'ILS' },
    USD: { locale: 'en-US', code: 'USD' },
    EUR: { locale: 'en-IE', code: 'EUR' },
  };

  const config = currencyMap[currency] || { locale: 'en-GB', code: currency };

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
}

// Format a plain number with commas (no currency symbol)
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Format an exchange rate to appropriate decimal places
export function formatRate(rate: number): string {
  return rate.toFixed(4);
}

// Format a date string to UK format: 08 Mar 2026
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Format a datetime string: 08 Mar 2026, 15:42
export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format a relative time: "2 hours ago", "3 days ago"
export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

// Format a currency pair: "GBP → ILS"
export function formatCurrencyPair(sell: string, buy: string): string {
  return `${sell} → ${buy}`;
}

// Convert minor units to major (pence → pounds)
export function toMajor(minorUnits: number): number {
  return minorUnits / 100;
}

// Convert major to minor units (pounds → pence)
export function toMinor(majorUnits: number): number {
  return Math.round(majorUnits * 100);
}
