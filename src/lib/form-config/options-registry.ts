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
  SOURCE_OF_FUNDS_OPTIONS,
  PURPOSE_OF_TRANSFERS_OPTIONS,
  ANTICIPATED_VOLUME_OPTIONS,
  RELATIONSHIP_OPTIONS,
  FREQUENCY_OPTIONS,
  TITLE_OPTIONS,
  REFERRAL_SOURCE_OPTIONS,
  EXPECTED_ANNUAL_VOLUME_OPTIONS,
  SOURCE_ACCOUNT_TYPE_OPTIONS,
  DESTINATION_ACCOUNT_TYPE_OPTIONS,
  TRANSFER_DIRECTION_OPTIONS,
  GENDER_OPTIONS,
  TRANSFER_CURRENCY_OPTIONS,
  TRANSFER_COUNTRY_OPTIONS,
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

// Helper to convert readonly const arrays to SelectOption[]
function toOptions(arr: ReadonlyArray<{ readonly value: string; readonly label: string }>): SelectOption[] {
  return arr.map((o) => ({ value: o.value, label: o.label }));
}

// Registry of shared option sources
const OPTIONS_REGISTRY: Record<string, SelectOption[]> = {
  countries: COUNTRY_OPTIONS,
  currencies: CURRENCY_OPTIONS,
  source_of_funds: toOptions(SOURCE_OF_FUNDS_OPTIONS),
  purpose_of_transfers: toOptions(PURPOSE_OF_TRANSFERS_OPTIONS),
  anticipated_volume: toOptions(ANTICIPATED_VOLUME_OPTIONS),
  relationship: toOptions(RELATIONSHIP_OPTIONS),
  frequency: toOptions(FREQUENCY_OPTIONS),
  titles: toOptions(TITLE_OPTIONS),
  referral_source: toOptions(REFERRAL_SOURCE_OPTIONS),
  expected_annual_volume: toOptions(EXPECTED_ANNUAL_VOLUME_OPTIONS),
  source_account_type: toOptions(SOURCE_ACCOUNT_TYPE_OPTIONS),
  destination_account_type: toOptions(DESTINATION_ACCOUNT_TYPE_OPTIONS),
  transfer_direction: toOptions(TRANSFER_DIRECTION_OPTIONS),
  gender: toOptions(GENDER_OPTIONS),
  transfer_currency: toOptions(TRANSFER_CURRENCY_OPTIONS),
  transfer_country: toOptions(TRANSFER_COUNTRY_OPTIONS),
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
