// ============================================================
// IsraCRM Database Types
// All enums and TypeScript types matching the Supabase schema
// ============================================================

// --- ENUMS ---

export type ClientType = 'individual_uk' | 'individual_israeli' | 'corporate';
export type ClientStatus = 'prospect' | 'active' | 'dormant' | 'suspended' | 'closed';
export type RiskRating = 'low' | 'medium' | 'high' | 'unrated';
export type KycStatus = 'pending' | 'in_review' | 'approved' | 'expired' | 'rejected';
export type SourceOfFundsStatus = 'not_submitted' | 'submitted' | 'under_review' | 'approved';

export type DealType = 'spot' | 'forward' | 'same_day';
export type DealStatus = 'quoted' | 'booked' | 'funds_received' | 'funds_sent' | 'completed' | 'cancelled';

export type DocumentType =
  | 'passport'
  | 'national_id'
  | 'driving_licence'
  | 'proof_of_address'
  | 'source_of_funds'
  | 'source_of_wealth'
  | 'bank_statement'
  | 'company_registration'
  | 'certificate_of_incorporation'
  | 'ubo_declaration'
  | 'other';

export type DocumentStatus = 'pending_review' | 'approved' | 'rejected' | 'expired';

export type ActivityLogType = 'note' | 'call' | 'email' | 'whatsapp' | 'meeting' | 'system_event' | 'compliance_event';

export type AlertType =
  | 'large_transaction'
  | 'velocity'
  | 'pattern_change'
  | 'sanctions_hit'
  | 'kyc_expiry'
  | 'review_due'
  | 'source_of_funds_missing'
  | 'pep_flagged';

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'open' | 'under_review' | 'dismissed' | 'escalated' | 'sar_filed';

export type LedgerEntryType = 'funds_received' | 'funds_sent' | 'fee_charged' | 'adjustment';

export type UserRole = 'account_manager' | 'compliance_officer' | 'management';

// --- ONBOARDING ENUMS ---
export type OnboardingStep = 'client_type' | 'kyc' | 'beneficiaries' | 'fatca' | 'documents' | 'review' | 'submitted';
export type OnboardingStatus = 'in_progress' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'returned';

// --- TABLE TYPES ---

export interface Client {
  id: string;
  client_type: ClientType;
  status: ClientStatus;
  onboarding_date: string | null;
  assigned_account_manager_id: string | null;
  risk_rating: RiskRating;
  kyc_status: KycStatus;
  next_review_date: string | null;
  source_of_funds_status: SourceOfFundsStatus;
  total_lifetime_volume: number; // stored in pence
  total_lifetime_deals: number;
  preferred_currency_pair: string | null;
  internal_notes: string | null;
  auth_user_id: string | null; // links self-service clients to auth.users
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // Joined relations
  individual_details?: IndividualDetails | null;
  corporate_details?: CorporateDetails | null;
}

export interface IndividualDetails {
  id: string;
  client_id: string;
  title: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  nationality: string | null;
  secondary_nationality: string | null;
  country_of_residence: string | null;
  israeli_id_number: string | null;
  passport_number: string | null;
  uk_national_insurance: string | null;
  phone_primary: string | null;
  phone_secondary: string | null;
  email_primary: string | null;
  email_secondary: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  address_city: string | null;
  address_region: string | null;
  address_postal_code: string | null;
  address_country: string | null;
  occupation: string | null;
  employer: string | null;
  politically_exposed_person: boolean;
  pep_details: string | null;
  source_of_funds: string | null;
  source_of_funds_detail: string | null;
  purpose_of_transfers: string | null;
  sanctions_consent: boolean;
  sanctions_consent_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CorporateDetails {
  id: string;
  client_id: string;
  company_name: string;
  company_registration_number: string | null;
  country_of_incorporation: string | null;
  registered_address_line_1: string | null;
  registered_address_line_2: string | null;
  registered_address_city: string | null;
  registered_address_region: string | null;
  registered_address_postal_code: string | null;
  registered_address_country: string | null;
  trading_address_line_1: string | null;
  trading_address_line_2: string | null;
  trading_address_city: string | null;
  trading_address_region: string | null;
  trading_address_postal_code: string | null;
  trading_address_country: string | null;
  industry: string | null;
  business_type: string | null;
  directors: Director[];
  beneficial_owners: BeneficialOwner[];
  authorised_signatories: string[];
  vat_number: string | null;
  website: string | null;
  principal_business_address: string | null;
  anticipated_volume: string | null;
  sanctions_consent: boolean;
  sanctions_consent_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Director {
  name: string;
  individual_client_id?: string | null;
}

export interface BeneficialOwner {
  name: string;
  ownership_percentage: number;
  individual_client_id?: string | null;
}

export interface Deal {
  id: string;
  deal_reference: string; // IST-YYYY-NNNNN
  client_id: string;
  account_manager_id: string | null;
  deal_type: DealType;
  status: DealStatus;
  sell_currency: string;
  sell_amount: number; // stored in minor units (pence/agorot)
  buy_currency: string;
  buy_amount: number;
  exchange_rate: number; // decimal, 6+ dp
  interbank_rate: number | null;
  margin_points: number | null;
  margin_percentage: number | null;
  margin_gbp_equivalent: number | null; // stored in pence
  value_date: string | null;
  forward_maturity_date: string | null;
  beneficiary_id: string | null;
  payment_reference: string | null;
  special_instructions: string | null;
  receipt_document_id: string | null;
  swift_confirmation_id: string | null;
  status_history: StatusHistoryEntry[];
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  booked_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  // Joined relations
  client?: Client;
  beneficiary?: Beneficiary | null;
}

export interface StatusHistoryEntry {
  status: DealStatus;
  timestamp: string;
  changed_by: string;
}

export interface Beneficiary {
  id: string;
  client_id: string;
  nickname: string | null;
  beneficiary_name: string;
  bank_name: string | null;
  bank_country: string | null;
  account_number: string | null;
  iban: string | null;
  sort_code: string | null;
  bic_swift: string | null;
  bank_address: string | null;
  currency: string | null;
  relationship_to_client: string | null;
  purpose_of_payments: string | null;
  estimated_frequency: string | null;
  verified: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface KycDocument {
  id: string;
  client_id: string;
  document_type: DocumentType;
  file_reference: string | null;
  original_filename: string | null;
  uploaded_by: string | null;
  upload_date: string;
  expiry_date: string | null;
  status: DocumentStatus;
  reviewed_by: string | null;
  review_date: string | null;
  rejection_reason: string | null;
  notes: string | null;
  version: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  client_id: string;
  log_type: ActivityLogType;
  subject: string | null;
  body: string | null;
  created_by: string | null;
  linked_deal_id: string | null;
  linked_document_id: string | null;
  pinned: boolean;
  created_at: string;
}

export interface ComplianceAlert {
  id: string;
  client_id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  triggered_by: string | null;
  description: string | null;
  status: AlertStatus;
  assigned_to: string | null;
  resolution_notes: string | null;
  deleted_at: string | null;
  created_at: string;
  resolved_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface LedgerEntry {
  id: string;
  client_id: string;
  deal_id: string | null;
  entry_type: LedgerEntryType;
  currency: string;
  amount: number; // stored in minor units
  running_balance: number;
  value_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_by: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- ONBOARDING TABLE TYPES ---

export interface OnboardingSession {
  id: string;
  client_id: string;
  auth_user_id: string;
  client_type: ClientType | null;
  current_step: OnboardingStep;
  status: OnboardingStatus;
  step_data: Record<string, unknown>;
  gdpr_consent: boolean;
  gdpr_consent_date: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface KycDirector {
  id: string;
  client_id: string;
  full_name: string;
  date_of_birth: string | null;
  nationality: string | null;
  address: string | null;
  role: string | null;
  id_document_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface KycUbo {
  id: string;
  client_id: string;
  full_name: string;
  date_of_birth: string | null;
  nationality: string | null;
  address: string | null;
  ownership_percentage: number;
  is_pep: boolean;
  pep_details: string | null;
  id_document_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface FatcaDeclaration {
  id: string;
  client_id: string;
  us_citizen: boolean;
  us_tax_resident: boolean;
  us_tin: string | null;
  entity_classification: string | null;
  giin: string | null;
  self_certification: boolean;
  declaration_date: string | null;
  signed_by: string | null;
  created_at: string;
  updated_at: string;
  tax_residencies?: TaxResidency[];
}

export interface TaxResidency {
  id: string;
  fatca_declaration_id: string;
  country: string;
  tin: string | null;
  reason_no_tin: string | null;
  created_at: string;
}

export interface CrmSyncLogEntry {
  id: string;
  onboarding_session_id: string;
  client_id: string;
  sync_type: string;
  status: string;
  error_message: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

// --- DISPLAY HELPER: get client display name ---
export function getClientDisplayName(client: Client): string {
  if (client.client_type === 'corporate' && client.corporate_details) {
    return client.corporate_details.company_name;
  }
  if (client.individual_details) {
    const { title, first_name, last_name } = client.individual_details;
    return [title, first_name, last_name].filter(Boolean).join(' ');
  }
  return 'Unknown Client';
}
