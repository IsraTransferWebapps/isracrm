import type { FormTableMapping } from './types';

/**
 * Maps each form_key to the database table(s) where its data is stored.
 *
 * - `table`: the primary table for flat (non-repeatable) fields
 * - `filterColumn`: the column used to filter rows (usually 'client_id')
 * - `repeatables`: repeatable sections map to child tables with their own filter column
 */
export const FORM_TABLE_MAP: Record<string, FormTableMapping> = {
  kyc_individual: {
    table: 'individual_details',
    filterColumn: 'client_id',
  },
  kyc_corporate: {
    table: 'corporate_details',
    filterColumn: 'client_id',
    repeatables: {
      directors: { table: 'kyc_directors', filterColumn: 'client_id' },
      ubos: { table: 'kyc_ubos', filterColumn: 'client_id' },
    },
  },
  beneficiary: {
    table: 'beneficiaries',
    filterColumn: 'client_id',
  },
  fatca: {
    table: 'fatca_declarations',
    filterColumn: 'client_id',
    repeatables: {
      tax_residencies: { table: 'tax_residencies', filterColumn: 'fatca_declaration_id' },
    },
  },
  // Documents use a different storage pattern (Supabase Storage + kyc_documents table),
  // so they don't follow the standard table mapping.
};
