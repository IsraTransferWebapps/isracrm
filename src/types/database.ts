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

// Client importance levels
export type ClientImportance = 'regular' | 'vip' | 'vvip';

// Receiving banks for deposits
export type ReceivingBank = 'mizrahi' | 'bank_of_jerusalem' | 'currencycloud';

// Compliance status for withdrawals
export type WithdrawalComplianceStatus = 'pending' | 'approved' | 'rejected';

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
  passport_issuing_country: string | null;
  occupation: string | null;
  employer: string | null;
  is_retired: boolean;
  occupation_business_sector: string | null;
  referral_source: string | null;
  referral_detail: string | null;
  has_israel_bank_account: boolean;
  is_foreign_resident: boolean;
  connection_to_israel: string | null;
  politically_exposed_person: boolean;
  pep_details: string | null;
  previously_denied_aml: boolean;
  previously_denied_aml_details: string | null;
  is_business_owner: boolean;
  business_owner_company: string | null;
  business_owner_sector: string | null;
  source_of_funds: string[] | null;
  source_of_funds_detail: string | null;
  purpose_of_transfers: string | null;
  transfer_currency: string[] | null;
  transfer_direction: string[] | null;
  expected_annual_volume: string | null;
  source_account_type: string | null;
  destination_account_type: string | null;
  sanctions_consent: boolean;
  sanctions_consent_date: string | null;
  custom_data: Record<string, unknown>;
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
  custom_data: Record<string, unknown>;
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
  custom_data: Record<string, unknown>;
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
  // Deposit fields
  receiving_bank: ReceivingBank | null;
  takbul_number: string | null;
  sender_bank_name: string | null;
  sender_account_holder: string | null;
  sender_iban: string | null;
  sender_swift: string | null;
  // Withdrawal fields
  compliance_status: WithdrawalComplianceStatus | null;
  compliance_approved_by: string | null;
  compliance_approved_at: string | null;
  // Joined fields
  approver?: {
    full_name: string;
  };
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

// Audit trail entry (entity-level change tracking)
export interface AuditTrailEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  performed_by: string | null;
  performed_at: string;
  notes: string | null;
  // Joined fields
  performer?: {
    full_name: string;
    email: string;
  };
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
  returned_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ComplianceReviewAction = 'approve' | 'reject' | 'return';

export interface KycDirector {
  id: string;
  client_id: string;
  full_name: string;
  date_of_birth: string | null;
  nationality: string | null;
  address: string | null;
  role: string | null;
  id_document_reference: string | null;
  custom_data: Record<string, unknown>;
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
  custom_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BeneficiaryDeclaration {
  id: string;
  client_id: string;
  full_name: string;
  date_of_birth: string | null;
  id_number: string | null;
  passport_number: string | null;
  gender: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zipcode: string | null;
  address_country: string | null;
  signature_image: string | null;
  signature_ip: string | null;
  signature_user_agent: string | null;
  signed_by: string | null;
  declaration_date: string | null;
  custom_data: Record<string, unknown>;
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
  signature_image: string | null;
  signature_ip: string | null;
  signature_user_agent: string | null;
  custom_data: Record<string, unknown>;
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
  custom_data: Record<string, unknown>;
  created_at: string;
}

// --- IDENTITY VERIFICATION (Didit) ---

export type IdentityVerificationStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'abandoned';

export interface IdentityVerification {
  id: string;
  client_id: string;
  session_id: string;
  didit_session_id: string;
  didit_session_url: string;
  status: IdentityVerificationStatus;
  // Scores
  liveness_score: number | null;
  face_match_score: number | null;
  aml_hit: boolean;
  // Extracted document data
  document_type: string | null;
  document_number: string | null;
  document_country: string | null;
  document_expiry_date: string | null;
  full_name_extracted: string | null;
  date_of_birth_extracted: string | null;
  // Full result payloads
  id_verification_result: Record<string, unknown> | null;
  aml_screening_result: Record<string, unknown>[] | null;
  raw_webhook_payload: Record<string, unknown> | null;
  webhook_received_at: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// --- EMAIL ---

export type EmailDirection = 'inbound' | 'outbound';
export type EmailTrackingEventType = 'open' | 'click' | 'bounce' | 'delivered';

export interface EmailThread {
  id: string;
  subject: string;
  client_id: string | null;
  staff_user_id: string;
  last_message_at: string;
  message_count: number;
  is_archived: boolean;
  created_at: string;
  // Joined relations
  client?: Client | null;
  emails?: Email[];
}

export interface Email {
  id: string;
  thread_id: string | null;
  staff_user_id: string;
  client_id: string | null;
  direction: EmailDirection;
  from_address: string;
  from_name: string | null;
  to_address: string;
  to_name: string | null;
  cc: string[] | null;
  subject: string;
  body_text: string | null;
  body_html: string | null;
  snippet: string | null;
  message_id: string | null;
  in_reply_to: string | null;
  references_header: string | null;
  has_attachments: boolean;
  is_read: boolean;
  is_starred: boolean;
  tracking_pixel_id: string | null;
  opened_at: string | null;
  raw_headers: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  thread?: EmailThread | null;
  client?: Client | null;
  attachments?: EmailAttachment[];
  tracking_events?: EmailTrackingEvent[];
}

export interface EmailAttachment {
  id: string;
  email_id: string;
  filename: string;
  content_type: string | null;
  size_bytes: number | null;
  storage_path: string;
  created_at: string;
}

export interface EmailTrackingEvent {
  id: string;
  email_id: string;
  event_type: EmailTrackingEventType;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
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

// --- PORTAL TYPES ---

/** @deprecated Use MessageSenderType from unified messaging instead */
export type PortalMessageSenderType = 'client' | 'staff';

export interface ClientMarginConfig {
  id: string;
  client_id: string;
  currency_pair: string; // e.g. "GBP/ILS"
  margin_percentage: number | null;
  margin_points: number | null;
  is_active: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RateQuote {
  id: string;
  client_id: string;
  sell_currency: string;
  buy_currency: string;
  sell_amount: number; // minor units
  buy_amount: number; // minor units
  interbank_rate: number;
  margin_percentage: number | null;
  margin_points: number | null;
  client_rate: number;
  expires_at: string;
  executed: boolean;
  executed_deal_id: string | null;
  created_at: string;
}

/** @deprecated Use Message from unified messaging instead. portal_messages table is superseded by conversations + messages. */
export interface PortalMessage {
  id: string;
  client_id: string;
  sender_type: PortalMessageSenderType;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

// --- UNIFIED MESSAGING ---

export type ConversationChannel = 'whatsapp' | 'live_chat' | 'portal';
export type ConversationStatus = 'open' | 'waiting_on_client' | 'waiting_on_staff' | 'closed';
export type MessageSenderType = 'client' | 'staff' | 'system' | 'bot';

export interface Conversation {
  id: string;
  client_id: string | null;
  channel: ConversationChannel;
  status: ConversationStatus;
  assigned_to: string | null;
  external_id: string | null;
  visitor_name: string | null;
  visitor_email: string | null;
  last_message_at: string;
  unread_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined fields
  client?: Client | null;
  assigned_staff?: UserProfile | null;
  last_message?: Message | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: MessageSenderType;
  sender_id: string | null;
  body: string;
  channel: ConversationChannel;
  external_message_id: string | null;
  attachments: MessageAttachment[];
  is_read: boolean;
  created_at: string;
}

export interface MessageAttachment {
  url: string;
  filename: string;
  type: string;
  size: number;
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
