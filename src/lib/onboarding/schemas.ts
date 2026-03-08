import { z } from 'zod';

// Step 0: Registration
export const registrationSchema = z.object({
  client_type: z.enum(['individual_uk', 'individual_israeli', 'corporate']),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
  gdpr_consent: z.literal(true, {
    message: 'You must accept the privacy notice to continue',
  }),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;

// Step 1: KYC - Individual
export const kycIndividualSchema = z.object({
  title: z.string().optional(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  nationality: z.string().min(1, 'Nationality is required'),
  secondary_nationality: z.string().optional(),
  country_of_residence: z.string().min(1, 'Country of residence is required'),
  israeli_id_number: z.string().optional(),
  passport_number: z.string().optional(),
  uk_national_insurance: z.string().optional(),
  phone_primary: z.string().min(1, 'Phone number is required'),
  email_primary: z.string().email('Valid email required'),
  address_line_1: z.string().min(1, 'Address is required'),
  address_line_2: z.string().optional(),
  address_city: z.string().min(1, 'City is required'),
  address_region: z.string().optional(),
  address_postal_code: z.string().min(1, 'Postal code is required'),
  address_country: z.string().min(1, 'Country is required'),
  occupation: z.string().min(1, 'Occupation is required'),
  employer: z.string().optional(),
  politically_exposed_person: z.boolean(),
  pep_details: z.string().optional(),
  source_of_funds: z.string().min(1, 'Source of funds is required'),
  source_of_funds_detail: z.string().optional(),
  purpose_of_transfers: z.string().min(1, 'Purpose of transfers is required'),
  sanctions_consent: z.literal(true, {
    message: 'You must consent to sanctions screening',
  }),
});

export type KycIndividualFormData = z.infer<typeof kycIndividualSchema>;

// Step 1: KYC - Corporate
export const kycCorporateSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  company_registration_number: z.string().min(1, 'Registration number is required'),
  country_of_incorporation: z.string().min(1, 'Country is required'),
  registered_address_line_1: z.string().min(1, 'Address is required'),
  registered_address_line_2: z.string().optional(),
  registered_address_city: z.string().min(1, 'City is required'),
  registered_address_region: z.string().optional(),
  registered_address_postal_code: z.string().min(1, 'Postal code is required'),
  registered_address_country: z.string().min(1, 'Country is required'),
  same_trading_address: z.boolean().optional(),
  trading_address_line_1: z.string().optional(),
  trading_address_city: z.string().optional(),
  trading_address_country: z.string().optional(),
  industry: z.string().min(1, 'Industry is required'),
  business_type: z.string().min(1, 'Business type is required'),
  website: z.string().optional(),
  vat_number: z.string().optional(),
  principal_business_address: z.string().optional(),
  authorized_signatory: z.string().min(1, 'Authorised signatory is required'),
  anticipated_volume: z.string().min(1, 'Anticipated volume is required'),
  source_of_funds: z.string().min(1, 'Source of funds is required'),
  source_of_funds_detail: z.string().optional(),
  purpose_of_transfers: z.string().min(1, 'Purpose of transfers is required'),
  sanctions_consent: z.literal(true, {
    message: 'You must consent to sanctions screening',
  }),
});

export type KycCorporateFormData = z.infer<typeof kycCorporateSchema>;

// Sub-schema: Director entry
export const directorSchema = z.object({
  id: z.string().optional(),
  full_name: z.string().min(1, 'Name is required'),
  date_of_birth: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
  role: z.string().optional(),
});

export type DirectorFormData = z.infer<typeof directorSchema>;

// Sub-schema: UBO entry
export const uboSchema = z.object({
  id: z.string().optional(),
  full_name: z.string().min(1, 'Name is required'),
  date_of_birth: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
  ownership_percentage: z.number().min(0.01, 'Must be > 0%').max(100, 'Cannot exceed 100%'),
  is_pep: z.boolean(),
  pep_details: z.string().optional(),
});

export type UboFormData = z.infer<typeof uboSchema>;

// Step 2: Beneficiary
export const beneficiarySchema = z.object({
  beneficiary_name: z.string().min(1, 'Beneficiary name is required'),
  nickname: z.string().optional(),
  bank_name: z.string().min(1, 'Bank name is required'),
  bank_country: z.string().min(1, 'Bank country is required'),
  iban: z.string().optional(),
  account_number: z.string().optional(),
  sort_code: z.string().optional(),
  bic_swift: z.string().optional(),
  currency: z.string().min(1, 'Currency is required'),
  relationship_to_client: z.string().min(1, 'Relationship is required'),
  purpose_of_payments: z.string().min(1, 'Purpose is required'),
  estimated_frequency: z.string().min(1, 'Frequency is required'),
});

export type BeneficiaryFormData = z.infer<typeof beneficiarySchema>;

// Step 3: FATCA/CRS
export const fatcaSchema = z.object({
  us_citizen: z.boolean(),
  us_tax_resident: z.boolean(),
  us_tin: z.string().optional(),
  entity_classification: z.string().optional(),
  giin: z.string().optional(),
  self_certification: z.literal(true, {
    message: 'Self-certification is required',
  }),
});

export type FatcaFormData = z.infer<typeof fatcaSchema>;

export const taxResidencySchema = z.object({
  id: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  tin: z.string().optional(),
  reason_no_tin: z.string().optional(),
});

export type TaxResidencyFormData = z.infer<typeof taxResidencySchema>;

// File upload constants
export const ACCEPTED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png';
