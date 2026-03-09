import type { SupabaseClient } from '@supabase/supabase-js';
import type { FormConfig } from './types';
import { FORM_TABLE_MAP } from './table-map';

/**
 * Load existing form data from the database, merging built-in columns
 * and custom_data JSONB into a single flat object suitable for
 * react-hook-form defaultValues.
 */
export async function loadFormData(
  supabase: SupabaseClient,
  config: FormConfig,
  filterValue: string, // typically clientId
  extraFilterColumn?: string, // for child tables like tax_residencies
  extraFilterValue?: string
): Promise<Record<string, unknown>> {
  const mapping = FORM_TABLE_MAP[config.form_key];
  if (!mapping) return {};

  const result: Record<string, unknown> = {};

  // Load the main table row
  const { data: row } = await supabase
    .from(mapping.table)
    .select('*')
    .eq(mapping.filterColumn, filterValue)
    .single();

  if (row) {
    // Extract built-in field values from the row
    for (const section of config.sections) {
      if (section.is_repeatable) continue;

      for (const field of section.fields) {
        if (field.is_custom) {
          // Read from custom_data JSONB
          const customData = (row as Record<string, unknown>).custom_data as Record<string, unknown> | null;
          if (customData && field.field_key in customData) {
            result[field.field_key] = customData[field.field_key];
          }
        } else if (field.db_column) {
          // Read from the actual column
          const value = (row as Record<string, unknown>)[field.db_column];
          // Convert null to appropriate empty value for react-hook-form
          if (value === null && field.field_type === 'checkbox_group') {
            result[field.field_key] = [];
          } else if (value === null && ['text', 'email', 'date', 'select', 'country_select', 'textarea'].includes(field.field_type)) {
            result[field.field_key] = '';
          } else if (value !== null && value !== undefined) {
            result[field.field_key] = value;
          }
        }
      }
    }

    // Load repeatable sections from child tables
    if (mapping.repeatables) {
      for (const section of config.sections) {
        if (!section.is_repeatable) continue;

        const repeatableMapping = mapping.repeatables?.[section.section_key];
        if (!repeatableMapping) continue;

        const childFilterColumn = repeatableMapping.filterColumn;
        // If the child table uses the same filter as the main table (e.g. client_id),
        // use the filterValue. Otherwise, use the parent row's ID
        // (e.g. tax_residencies use fatca_declaration_id → row.id).
        const childFilterValue =
          childFilterColumn === mapping.filterColumn
            ? filterValue
            : (row as Record<string, unknown>).id as string;

        const { data: childRows } = await supabase
          .from(repeatableMapping.table)
          .select('*')
          .eq(childFilterColumn, childFilterValue)
          .order('created_at', { ascending: true });

        if (childRows && childRows.length > 0) {
          result[section.section_key] = childRows.map((childRow) => {
            const entry: Record<string, unknown> = {};
            for (const field of section.fields) {
              if (field.is_custom) {
                const customData = (childRow as Record<string, unknown>).custom_data as Record<string, unknown> | null;
                if (customData && field.field_key in customData) {
                  entry[field.field_key] = customData[field.field_key];
                }
              } else if (field.db_column) {
                const value = (childRow as Record<string, unknown>)[field.db_column];
                if (value === null && field.field_type === 'checkbox_group') {
                  entry[field.field_key] = [];
                } else if (value === null && ['text', 'email', 'date', 'select', 'country_select', 'textarea'].includes(field.field_type)) {
                  entry[field.field_key] = '';
                } else if (value !== null && value !== undefined) {
                  entry[field.field_key] = value;
                }
              }
            }
            return entry;
          });
        }
      }
    }
  }

  return result;
}
