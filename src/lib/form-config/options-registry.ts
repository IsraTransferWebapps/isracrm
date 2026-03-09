/**
 * Options registry — resolves `options_source` strings from form field configs
 * to the actual option arrays used at render time.
 *
 * Shared option lists (countries, currencies) are maintained in constants.ts
 * and referenced here by key. Admin-managed options are stored directly in
 * the form_fields.options JSONB column and don't go through this registry.
 */

import {
  COUNTRIES,
  CURRENCIES,
} from '@/lib/onboarding/constants';
import type { SelectOption } from './types';

// Convert COUNTRIES string array to {value, label} format
const COUNTRY_OPTIONS: SelectOption[] = COUNTRIES.map((c) => ({
  value: c,
  label: c,
}));

// CURRENCIES is already in {value, label} format
const CURRENCY_OPTIONS: SelectOption[] = CURRENCIES.map((c) => ({
  value: c.value,
  label: c.label,
}));

// Registry of shared option sources
const OPTIONS_REGISTRY: Record<string, SelectOption[]> = {
  countries: COUNTRY_OPTIONS,
  currencies: CURRENCY_OPTIONS,
};

/**
 * Resolve the options for a form field.
 *
 * Priority:
 *   1. If `options` (JSONB) is provided directly on the field, use those
 *   2. If `options_source` is set, look up the registry
 *   3. Return empty array
 */
export function resolveOptions(
  options?: SelectOption[] | null,
  optionsSource?: string | null
): SelectOption[] {
  if (options && options.length > 0) return options;
  if (optionsSource && OPTIONS_REGISTRY[optionsSource]) {
    return OPTIONS_REGISTRY[optionsSource];
  }
  return [];
}

/**
 * Check if an options_source key is valid.
 */
export function isValidOptionsSource(source: string): boolean {
  return source in OPTIONS_REGISTRY;
}
