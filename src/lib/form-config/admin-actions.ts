'use server';

import { createServiceClient } from '@/lib/supabase/server';
import type { FormKey } from './types';

/**
 * Server actions for admin form configuration management.
 * All actions use the service client to bypass RLS.
 */

// Get a summary of all form configurations (for the list page)
export async function getFormConfigSummaries() {
  const supabase = createServiceClient();

  const { data: configs, error } = await supabase
    .from('form_configurations')
    .select('id, form_key, display_name, description, version, updated_at')
    .order('display_name');

  if (error) {
    console.error('Failed to fetch form config summaries:', error);
    return [];
  }

  // For each config, get the section and field counts
  const summaries = await Promise.all(
    (configs || []).map(async (config) => {
      const { count: sectionCount } = await supabase
        .from('form_sections')
        .select('*', { count: 'exact', head: true })
        .eq('form_configuration_id', config.id);

      const { data: sections } = await supabase
        .from('form_sections')
        .select('id')
        .eq('form_configuration_id', config.id);

      let fieldCount = 0;
      if (sections && sections.length > 0) {
        const { count } = await supabase
          .from('form_fields')
          .select('*', { count: 'exact', head: true })
          .in('form_section_id', sections.map((s) => s.id));
        fieldCount = count || 0;
      }

      return {
        ...config,
        sectionCount: sectionCount || 0,
        fieldCount,
      };
    })
  );

  return summaries;
}

// Update a field's properties
export async function updateField(
  fieldId: string,
  updates: {
    label?: string;
    help_text?: string | null;
    placeholder?: string | null;
    is_required?: boolean;
    is_visible?: boolean;
    grid_columns?: number;
    options?: { value: string; label: string }[] | null;
    validation_rules?: Record<string, unknown> | null;
  }
) {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('form_fields')
    .update(updates)
    .eq('id', fieldId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Update a section's properties
export async function updateSection(
  sectionId: string,
  updates: {
    title?: string;
    description?: string | null;
    is_visible?: boolean;
    min_items?: number;
    max_items?: number;
    item_label?: string | null;
  }
) {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('form_sections')
    .update(updates)
    .eq('id', sectionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Add a new custom field to a section
export async function addCustomField(
  sectionId: string,
  field: {
    field_key: string;
    field_type: string;
    label: string;
    placeholder?: string;
    help_text?: string;
    is_required: boolean;
    grid_columns: number;
    options?: { value: string; label: string }[];
    display_order: number;
  }
) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('form_fields')
    .insert({
      form_section_id: sectionId,
      field_key: field.field_key,
      field_type: field.field_type,
      label: field.label,
      placeholder: field.placeholder || null,
      help_text: field.help_text || null,
      is_required: field.is_required,
      is_visible: true,
      display_order: field.display_order,
      grid_columns: field.grid_columns,
      options: field.options || null,
      db_column: null, // Custom fields don't map to DB columns
      is_custom: true,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, fieldId: data?.id };
}

// Add a new section to a form
export async function addSection(
  formConfigId: string,
  section: {
    section_key: string;
    title: string;
    description?: string;
    display_order: number;
    is_repeatable?: boolean;
    min_items?: number;
    max_items?: number;
    item_label?: string;
  }
) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('form_sections')
    .insert({
      form_configuration_id: formConfigId,
      section_key: section.section_key,
      title: section.title,
      description: section.description || null,
      display_order: section.display_order,
      is_visible: true,
      is_repeatable: section.is_repeatable || false,
      min_items: section.min_items ?? 0,
      max_items: section.max_items ?? 10,
      item_label: section.item_label || null,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, sectionId: data?.id };
}

// Delete a custom field (only custom fields can be deleted)
export async function deleteField(fieldId: string) {
  const supabase = createServiceClient();

  // Verify the field is custom before deleting
  const { data: field } = await supabase
    .from('form_fields')
    .select('is_custom')
    .eq('id', fieldId)
    .single();

  if (!field) {
    return { success: false, error: 'Field not found' };
  }

  if (!field.is_custom) {
    return { success: false, error: 'Cannot delete built-in fields. Use visibility toggle instead.' };
  }

  const { error } = await supabase
    .from('form_fields')
    .delete()
    .eq('id', fieldId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Reorder fields within a section
export async function reorderFields(
  sectionId: string,
  fieldOrders: { id: string; display_order: number }[]
) {
  const supabase = createServiceClient();

  // Update each field's display_order
  for (const { id, display_order } of fieldOrders) {
    const { error } = await supabase
      .from('form_fields')
      .update({ display_order })
      .eq('id', id);

    if (error) {
      return { success: false, error: `Failed to reorder field ${id}: ${error.message}` };
    }
  }

  return { success: true };
}

// Reorder sections within a form
export async function reorderSections(
  formConfigId: string,
  sectionOrders: { id: string; display_order: number }[]
) {
  const supabase = createServiceClient();

  for (const { id, display_order } of sectionOrders) {
    const { error } = await supabase
      .from('form_sections')
      .update({ display_order })
      .eq('id', id);

    if (error) {
      return { success: false, error: `Failed to reorder section ${id}: ${error.message}` };
    }
  }

  return { success: true };
}

// Increment the version of a form configuration
export async function bumpFormVersion(formConfigId: string) {
  const supabase = createServiceClient();

  const { data: current } = await supabase
    .from('form_configurations')
    .select('version')
    .eq('id', formConfigId)
    .single();

  if (!current) return { success: false, error: 'Config not found' };

  const { error } = await supabase
    .from('form_configurations')
    .update({
      version: current.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', formConfigId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
