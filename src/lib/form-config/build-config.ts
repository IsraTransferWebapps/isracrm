import type { FormConfig, FormSectionConfig, FormFieldConfig } from './types';

/**
 * Shared helper: build a structured FormConfig from raw DB rows.
 * Used by both the server-side and client-side fetch functions.
 */
export function buildFormConfigFromRows(
  config: Record<string, unknown>,
  sections: Record<string, unknown>[],
  fields: Record<string, unknown>[]
): FormConfig {
  // Group fields by section
  const fieldsBySection = new Map<string, FormFieldConfig[]>();
  for (const field of fields) {
    const sectionId = field.form_section_id as string;
    if (!fieldsBySection.has(sectionId)) {
      fieldsBySection.set(sectionId, []);
    }
    fieldsBySection.get(sectionId)!.push({
      id: field.id as string,
      field_key: field.field_key as string,
      field_type: field.field_type as FormFieldConfig['field_type'],
      label: field.label as string,
      placeholder: (field.placeholder as string) ?? null,
      help_text: (field.help_text as string) ?? null,
      is_required: field.is_required as boolean,
      is_visible: field.is_visible as boolean,
      display_order: field.display_order as number,
      grid_columns: (field.grid_columns as number) ?? 1,
      options: field.options as FormFieldConfig['options'],
      options_source: (field.options_source as string) ?? null,
      validation_rules: field.validation_rules as FormFieldConfig['validation_rules'],
      show_when: field.show_when as FormFieldConfig['show_when'],
      db_column: (field.db_column as string) ?? null,
      is_custom: field.is_custom as boolean,
    });
  }

  // Build the structured response
  const formSections: FormSectionConfig[] = (sections as Record<string, unknown>[])
    .filter((s) => s.is_visible)
    .map((s) => ({
      id: s.id as string,
      section_key: s.section_key as string,
      title: s.title as string,
      description: (s.description as string) ?? null,
      display_order: s.display_order as number,
      is_visible: s.is_visible as boolean,
      is_repeatable: s.is_repeatable as boolean,
      min_items: (s.min_items as number) ?? 0,
      max_items: (s.max_items as number) ?? 10,
      item_label: (s.item_label as string) ?? null,
      show_when: s.show_when as FormSectionConfig['show_when'],
      fields: (fieldsBySection.get(s.id as string) || []).filter((f) => f.is_visible),
    }));

  return {
    id: config.id as string,
    form_key: config.form_key as string,
    display_name: config.display_name as string,
    description: (config.description as string) ?? null,
    version: config.version as number,
    sections: formSections,
  };
}
