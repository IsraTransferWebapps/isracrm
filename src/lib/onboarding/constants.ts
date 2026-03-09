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
  { key: 'documents', label: 'Identity', number: 4 },
];

// Maps step to route for navigation
export const STEP_ROUTES: Record<OnboardingStep, string> = {
  client_type: '/portal/register',
  kyc: '/portal/onboard/kyc',
  beneficiaries: '/portal/onboard/beneficiaries',
  fatca: '/portal/onboard/fatca',
  documents: '/portal/onboard/documents',
  review: '/portal/onboard/review',
  submitted: '/portal/onboard/confirmation',
};

export const SOURCE_OF_FUNDS_OPTIONS = [
  { value: 'salary', label: 'Salary / Employment Income' },
  { value: 'business_income', label: 'Business Income' },
  { value: 'savings', label: 'Savings' },
  { value: 'inheritance', label: 'Inheritance' },
  { value: 'property_sale', label: 'Property Sale' },
  { value: 'investment', label: 'Investment Returns' },
  { value: 'pension', label: 'Pension' },
  { value: 'dividend', label: 'Dividend' },
  { value: 'rental_income', label: 'Rental Income' },
  { value: 'family_support', label: 'Family Support' },
  { value: 'loan', label: 'Loan' },
  { value: 'other', label: 'Other' },
] as const;

export const PURPOSE_OF_TRANSFERS_OPTIONS = [
  { value: 'property_purchase', label: 'Property Purchase' },
  { value: 'living_expenses', label: 'Living Expenses' },
  { value: 'family_support', label: 'Family Support' },
  { value: 'business_payments', label: 'Business Payments' },
  { value: 'investment', label: 'Investment' },
  { value: 'education', label: 'Education Fees' },
  { value: 'aliyah', label: 'Aliyah' },
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

export const REFERRAL_SOURCE_OPTIONS = [
  { value: 'live_work_israel', label: 'I live/work in Israel' },
  { value: 'competitive_terms', label: 'Competitive terms' },
  { value: 'recommendation', label: 'Recommendation' },
  { value: 'poor_experience', label: 'Poor experience with current provider' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'other', label: 'Other' },
] as const;

export const EXPECTED_ANNUAL_VOLUME_OPTIONS = [
  { value: '0_10k', label: '$0 - $10,000' },
  { value: '10k_200k', label: '$10,000 - $200,000' },
  { value: '200k_500k', label: '$200,000 - $500,000' },
  { value: '500k_1m', label: '$500,000 - $1,000,000' },
  { value: '1m_3m', label: '$1,000,000 - $3,000,000' },
  { value: 'over_3m', label: 'Over $3,000,000' },
] as const;

export const SOURCE_ACCOUNT_TYPE_OPTIONS = [
  { value: 'own', label: 'Own Account' },
  { value: 'trust', label: 'Trust Account' },
  { value: 'business', label: 'Business Account' },
  { value: 'third_party', label: 'Third Party Account' },
] as const;

export const DESTINATION_ACCOUNT_TYPE_OPTIONS = [
  { value: 'own', label: 'Own Account' },
  { value: 'third_party', label: 'Third Party Account' },
  { value: 'both', label: 'Both' },
] as const;

export const TRANSFER_DIRECTION_OPTIONS = [
  { value: 'to_israel', label: 'To Israel' },
  { value: 'from_israel', label: 'From Israel' },
] as const;

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
] as const;

export const TRANSFER_CURRENCY_OPTIONS = [
  { value: 'AUD', label: 'AUD' },
  { value: 'CAD', label: 'CAD' },
  { value: 'CHF', label: 'CHF' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'ILS', label: 'ILS' },
  { value: 'USD', label: 'USD' },
  { value: 'other', label: 'Other' },
] as const;

export const TRANSFER_COUNTRY_OPTIONS = [
  { value: 'australia', label: 'Australia' },
  { value: 'canada', label: 'Canada' },
  { value: 'france', label: 'France' },
  { value: 'israel', label: 'Israel' },
  { value: 'united_kingdom', label: 'United Kingdom' },
  { value: 'united_states', label: 'United States' },
  { value: 'other', label: 'Other' },
] as const;
