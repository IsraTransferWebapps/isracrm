import type { SupabaseClient } from '@supabase/supabase-js';
import type { FormConfig, FormKey } from './types';
import { buildFormConfigFromRows } from './build-config';

/**
 * Fetch a form configuration on the client side (browser).
 *
 * Uses the passed-in Supabase client (anon key) which respects RLS.
 * Read policies allow all authenticated users to read form configs.
 *
 * Safe to import from 'use client' components.
 */
export async function getFormConfigClient(
  supabase: SupabaseClient,
  formKey: FormKey | string
): Promise<FormConfig | null> {
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

  if (sectionsError || !sections) return null;

  const sectionIds = sections.map((s: Record<string, unknown>) => s.id);

  const { data: fields, error: fieldsError } = await supabase
    .from('form_fields')
    .select('*')
    .in('form_section_id', sectionIds)
    .order('display_order', { ascending: true });

  if (fieldsError || !fields) return null;

  return buildFormConfigFromRows(config, sections, fields);
}
