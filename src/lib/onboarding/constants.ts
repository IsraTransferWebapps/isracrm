import type { OnboardingStep } from '@/types/database';

export const ONBOARDING_STEPS: {
  key: OnboardingStep;
  label: string;
  number: number;
}[] = [
  { key: 'client_type', label: 'Account', number: 0 },
  { key: 'kyc', label: 'KYC Details', number: 1 },
  { key: 'beneficiaries', label: 'Beneficiaries', number: 2 },
  { key: 'fatca', label: 'Tax Declaration', number: 3 },
  { key: 'documents', label: 'Documents', number: 4 },
];

// Maps step to route for navigation
export const STEP_ROUTES: Record<OnboardingStep, string> = {
  client_type: '/onboard/register',
  kyc: '/onboard/kyc',
  beneficiaries: '/onboard/beneficiaries',
  fatca: '/onboard/fatca',
  documents: '/onboard/documents',
  review: '/onboard/review',
  submitted: '/onboard/confirmation',
};

export const SOURCE_OF_FUNDS_OPTIONS = [
  { value: 'salary', label: 'Salary / Employment Income' },
  { value: 'business_income', label: 'Business Income' },
  { value: 'savings', label: 'Savings' },
  { value: 'inheritance', label: 'Inheritance' },
  { value: 'property_sale', label: 'Property Sale' },
  { value: 'investment', label: 'Investment Returns' },
  { value: 'pension', label: 'Pension' },
  { value: 'other', label: 'Other' },
] as const;

export const PURPOSE_OF_TRANSFERS_OPTIONS = [
  { value: 'property_purchase', label: 'Property Purchase' },
  { value: 'living_expenses', label: 'Living Expenses' },
  { value: 'family_support', label: 'Family Support' },
  { value: 'business_payments', label: 'Business Payments' },
  { value: 'investment', label: 'Investment' },
  { value: 'education', label: 'Education Fees' },
  { value: 'other', label: 'Other' },
] as const;

export const ANTICIPATED_VOLUME_OPTIONS = [
  { value: 'under_10k', label: 'Under $10,000 / month' },
  { value: '10k_50k', label: '$10,000 - $50,000 / month' },
  { value: '50k_250k', label: '$50,000 - $250,000 / month' },
  { value: '250k_1m', label: '$250,000 - $1,000,000 / month' },
  { value: 'over_1m', label: 'Over $1,000,000 / month' },
] as const;

export const RELATIONSHIP_OPTIONS = [
  { value: 'self', label: 'Self (own account)' },
  { value: 'family', label: 'Family Member' },
  { value: 'supplier', label: 'Supplier / Vendor' },
  { value: 'landlord', label: 'Landlord / Property' },
  { value: 'employee', label: 'Employee' },
  { value: 'legal', label: 'Legal / Professional Services' },
  { value: 'other', label: 'Other' },
] as const;

export const FREQUENCY_OPTIONS = [
  { value: 'one_off', label: 'One-off' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'ad_hoc', label: 'Ad hoc / As needed' },
] as const;

export const ENTITY_CLASSIFICATION_OPTIONS = [
  { value: 'active_nffe', label: 'Active NFFE (Non-Financial Foreign Entity)' },
  { value: 'passive_nffe', label: 'Passive NFFE' },
  { value: 'financial_institution', label: 'Financial Institution' },
  { value: 'exempt', label: 'Exempt Beneficial Owner' },
  { value: 'other', label: 'Other' },
] as const;

export const REASON_NO_TIN_OPTIONS = [
  { value: 'not_issued', label: 'Country does not issue TINs' },
  { value: 'pending', label: 'TIN application pending' },
  { value: 'not_required', label: 'Not required to obtain TIN' },
] as const;

export const TITLE_OPTIONS = [
  { value: 'Mr', label: 'Mr' },
  { value: 'Mrs', label: 'Mrs' },
  { value: 'Ms', label: 'Ms' },
  { value: 'Dr', label: 'Dr' },
  { value: 'Prof', label: 'Prof' },
] as const;

// Common countries (sorted by likely usage for IsraTransfer clients)
export const COUNTRIES = [
  'Israel', 'United Kingdom', 'United States',
  'Australia', 'Austria', 'Belgium', 'Brazil', 'Canada',
  'China', 'Czech Republic', 'Denmark', 'Finland', 'France',
  'Germany', 'Greece', 'Hong Kong', 'Hungary', 'India',
  'Ireland', 'Italy', 'Japan', 'Mexico', 'Netherlands',
  'New Zealand', 'Norway', 'Poland', 'Portugal', 'Romania',
  'Russia', 'Singapore', 'South Africa', 'South Korea', 'Spain',
  'Sweden', 'Switzerland', 'Thailand', 'Turkey', 'Ukraine',
  'United Arab Emirates',
] as const;

export const CURRENCIES = [
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'ILS', label: 'ILS - Israeli Shekel' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
] as const;
