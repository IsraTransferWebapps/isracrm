import type { SupabaseClient } from '@supabase/supabase-js';
import type { FormConfig } from './types';
import { FORM_TABLE_MAP } from './table-map';

/**
 * Save form data, splitting built-in fields (→ table columns)
 * and custom fields (→ custom_data JSONB column).
 *
 * Uses upsert for the main table (handles both insert and update).
 * For repeatable sections, deletes all existing rows and re-inserts.
 *
 * Returns the main row ID (useful for parent-child relationships like FATCA).
 */
export async function saveFormData(
  supabase: SupabaseClient,
  config: FormConfig,
  formData: Record<string, unknown>,
  filterValue: string, // typically clientId
): Promise<{ success: boolean; error?: string; rowId?: string }> {
  const mapping = FORM_TABLE_MAP[config.form_key];
  if (!mapping) {
    return { success: false, error: `No table mapping for form: ${config.form_key}` };
  }

  try {
    // Split flat section data into built-in and custom
    const builtIn: Record<string, unknown> = {};
    const customData: Record<string, unknown> = {};

    for (const section of config.sections) {
      if (section.is_repeatable) continue; // handled separately

      for (const field of section.fields) {
        const value = formData[field.field_key];
        if (value === undefined) continue;

        if (field.is_custom) {
          customData[field.field_key] = value;
        } else if (field.db_column) {
          // Convert empty strings to null for DB storage
          builtIn[field.db_column] = value === '' ? null : value;
        }
      }
    }

    // Add custom_data if there are any custom fields
    if (Object.keys(customData).length > 0) {
      builtIn.custom_data = customData;
    }

    // Upsert the main table row
    // First check if a row exists, then update or insert accordingly
    let rowId: string | undefined;

    if (Object.keys(builtIn).length > 0) {
      // Check for existing row
      const { data: existing } = await supabase
        .from(mapping.table)
        .select('id')
        .eq(mapping.filterColumn, filterValue)
        .single();

      if (existing) {
        // Update existing row
        const { error } = await supabase
          .from(mapping.table)
          .update(builtIn)
          .eq('id', existing.id);

        if (error) {
          return { success: false, error: `Failed to save to ${mapping.table}: ${error.message}` };
        }
        rowId = existing.id;
      } else {
        // Insert new row (include the filter column value)
        builtIn[mapping.filterColumn] = filterValue;
        const { data: inserted, error } = await supabase
          .from(mapping.table)
          .insert(builtIn)
          .select('id')
          .single();

        if (error) {
          return { success: false, error: `Failed to insert into ${mapping.table}: ${error.message}` };
        }
        rowId = inserted?.id;
      }
    }

    // Handle repeatable sections (delete + re-insert)
    if (mapping.repeatables) {
      for (const section of config.sections) {
        if (!section.is_repeatable) continue;

        const repeatableMapping = mapping.repeatables[section.section_key];
        if (!repeatableMapping) continue;

        const items = formData[section.section_key];
        if (!Array.isArray(items)) continue;

        // Determine the filter value for child rows
        // If the child table's filterColumn isn't the same as the main table's filterColumn,
        // use the parent row ID (e.g. tax_residencies use fatca_declaration_id)
        const childFilterColumn = repeatableMapping.filterColumn;
        const childFilterValue =
          childFilterColumn === mapping.filterColumn
            ? filterValue
            : rowId ?? filterValue;

        // Delete existing rows
        await supabase
          .from(repeatableMapping.table)
          .delete()
          .eq(childFilterColumn, childFilterValue);

        // Insert new rows
        if (items.length > 0) {
          const rows = items.map((item) => {
            const row: Record<string, unknown> = {
              [childFilterColumn]: childFilterValue,
            };
            const itemCustom: Record<string, unknown> = {};

            for (const field of section.fields) {
              const val = (item as Record<string, unknown>)[field.field_key];
              if (val === undefined) continue;

              if (field.is_custom) {
                itemCustom[field.field_key] = val;
              } else if (field.db_column) {
                row[field.db_column] = val === '' ? null : val;
              }
            }

            if (Object.keys(itemCustom).length > 0) {
              row.custom_data = itemCustom;
            }

            return row;
          });

          const { error: insertError } = await supabase
            .from(repeatableMapping.table)
            .insert(rows);

          if (insertError) {
            return { success: false, error: `Failed to save ${section.section_key}: ${insertError.message}` };
          }
        }
      }
    }

    return { success: true, rowId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error during save',
    };
  }
}

/**
 * Split form data into sections for auto-save to step_data.
 * Returns the complete form data as a flat object for storage in the JSONB column.
 */
export function prepareStepData(
  config: FormConfig,
  formData: Record<string, unknown>
): Record<string, unknown> {
  // For auto-save, we store the raw form values as-is in step_data
  // so they can be restored as defaultValues on page reload
  return { ...formData };
}
