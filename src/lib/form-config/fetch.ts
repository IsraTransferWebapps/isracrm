import { createServiceClient } from '@/lib/supabase/server';
import type { FormConfig, FormKey } from './types';
import { buildFormConfigFromRows } from './build-config';

/**
 * Fetch a complete form configuration by form_key (SERVER-SIDE ONLY).
 *
 * Uses the service client to bypass RLS. Call this from server components
 * or server actions — NOT from client components (use fetch-client.ts instead).
 */
export async function getFormConfig(formKey: FormKey | string): Promise<FormConfig | null> {
  const supabase = createServiceClient();

  const { data: config, error: configError } = await supabase
    .from('form_configurations')
    .select('*')
    .eq('form_key', formKey)
    .single();

  if (configError || !config) {
    console.error(`Form config not found for key: ${formKey}`, configError);
    return null;
  }

  const { data: sections, error: sectionsError } = await supabase
    .from('form_sections')
    .select('*')
    .eq('form_configuration_id', config.id)
    .order('display_order', { ascending: true });

  if (sectionsError || !sections) {
    console.error(`Failed to fetch sections for form: ${formKey}`, sectionsError);
    return null;
  }

  const sectionIds = sections.map((s) => s.id);

  const { data: fields, error: fieldsError } = await supabase
    .from('form_fields')
    .select('*')
    .in('form_section_id', sectionIds)
    .order('display_order', { ascending: true });

  if (fieldsError || !fields) {
    console.error(`Failed to fetch fields for form: ${formKey}`, fieldsError);
    return null;
  }

  return buildFormConfigFromRows(config, sections, fields);
}
