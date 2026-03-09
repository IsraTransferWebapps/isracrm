/**
 * Form configuration types for the admin-editable onboarding form system.
 *
 * These types represent the structure stored in the form_configurations,
 * form_sections, and form_fields database tables.
 */

// Supported field types in the dynamic form renderer
export type FieldType =
  | 'text'
  | 'email'
  | 'date'
  | 'select'
  | 'country_select'
  | 'checkbox'
  | 'checkbox_group' // multi-select checkboxes (stores string[])
  | 'switch'
  | 'textarea'
  | 'number'
  | 'file_upload';

// Operators for conditional field display
export type ShowWhenOperator = 'equals' | 'not_equals' | 'in' | 'not_empty' | 'contains';

// Simple condition: show field when another field matches a value
export interface ShowWhenCondition {
  field_key: string;
  operator: ShowWhenOperator;
  value: string | number | boolean | string[];
}

// Compound condition: combine multiple conditions with AND/OR
export interface ShowWhenCompound {
  logic: 'AND' | 'OR';
  conditions: ShowWhenCondition[];
}

// The show_when field can be a simple condition or a compound
export type ShowWhen = ShowWhenCondition | ShowWhenCompound;

// Validation rules stored in the JSONB column
export interface ValidationRules {
  min_length?: number;
  max_length?: number;
  pattern?: string;
  pattern_message?: string;
  min?: number;
  max?: number;
}

// A select option (value + label pair)
export interface SelectOption {
  value: string;
  label: string;
}

// Individual field configuration (maps to form_fields table)
export interface FormFieldConfig {
  id: string;
  field_key: string;
  field_type: FieldType;
  label: string;
  placeholder?: string | null;
  help_text?: string | null;
  is_required: boolean;
  is_visible: boolean;
  display_order: number;
  grid_columns: number;
  options?: SelectOption[] | null;
  options_source?: string | null;
  validation_rules?: ValidationRules | null;
  show_when?: ShowWhen | null;
  db_column?: string | null;
  is_custom: boolean;
}

// Section configuration (maps to form_sections table)
export interface FormSectionConfig {
  id: string;
  section_key: string;
  title: string;
  description?: string | null;
  display_order: number;
  is_visible: boolean;
  is_repeatable: boolean;
  min_items: number;
  max_items: number;
  item_label?: string | null;
  show_when?: ShowWhen | null;
  fields: FormFieldConfig[];
}

// Top-level form configuration (maps to form_configurations table)
export interface FormConfig {
  id: string;
  form_key: string;
  display_name: string;
  description?: string | null;
  version: number;
  sections: FormSectionConfig[];
}

// Known form keys
export type FormKey =
  | 'kyc_individual'
  | 'kyc_corporate'
  | 'beneficiary'
  | 'fatca'
  | 'documents';

// Mapping from form_key to the database table(s) used for storage
export interface FormTableMapping {
  table: string;
  filterColumn: string;
  repeatables?: Record<string, {
    table: string;
    filterColumn: string;
  }>;
}

// Helper type: guard to check if ShowWhen is compound
export function isCompoundShowWhen(sw: ShowWhen): sw is ShowWhenCompound {
  return 'logic' in sw && 'conditions' in sw;
}
