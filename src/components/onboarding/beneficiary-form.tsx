'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getFormConfigClient } from '@/lib/form-config/fetch-client';
import { DynamicFormRenderer } from './dynamic-form-renderer';
import type { FormConfig } from '@/lib/form-config/types';
import type { Beneficiary } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  clientId: string;
  editingBeneficiary?: Beneficiary;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * Beneficiary add/edit form using the dynamic form renderer.
 * Loads field config from the database, renders fields dynamically,
 * and handles insert/update to the beneficiaries table.
 */
export function BeneficiaryForm({ clientId, editingBeneficiary, onSave, onCancel }: Props) {
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const isEditing = !!editingBeneficiary;

  // Fetch the beneficiary form config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await getFormConfigClient(supabase, 'beneficiary');
        setFormConfig(config);
      } catch (err) {
        console.error('Failed to load beneficiary form config:', err);
      } finally {
        setConfigLoading(false);
      }
    };
    fetchConfig();
  }, [supabase]);

  // Build existing data from the editing beneficiary for pre-filling the form
  const existingData = useMemo(() => {
    if (!editingBeneficiary || !formConfig) return {};

    const data: Record<string, unknown> = {};
    for (const section of formConfig.sections) {
      for (const field of section.fields) {
        if (field.db_column) {
          const value = (editingBeneficiary as unknown as Record<string, unknown>)[field.db_column];
          data[field.field_key] = value === null ? '' : value;
        }
      }
    }
    return data;
  }, [editingBeneficiary, formConfig]);

  // Handle form submission: insert or update beneficiary
  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!formConfig) return;

    // Build the payload mapping field_key → db_column
    const payload: Record<string, unknown> = { client_id: clientId };
    for (const section of formConfig.sections) {
      for (const field of section.fields) {
        const value = data[field.field_key];
        if (value === undefined) continue;

        if (field.is_custom) {
          // Custom fields go to custom_data JSONB
          if (!payload.custom_data) payload.custom_data = {};
          (payload.custom_data as Record<string, unknown>)[field.field_key] = value;
        } else if (field.db_column) {
          payload[field.db_column] = value === '' ? null : value;
        }
      }
    }

    if (isEditing) {
      const { error } = await supabase
        .from('beneficiaries')
        .update(payload)
        .eq('id', editingBeneficiary.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from('beneficiaries')
        .insert(payload);
      if (error) throw new Error(error.message);
    }

    onSave();
  };

  if (configLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!formConfig) {
    return <p className="text-sm text-[#717D93]">Form configuration not found.</p>;
  }

  return (
    <div>
      <DynamicFormRenderer
        config={formConfig}
        existingData={existingData}
        onSubmit={handleSubmit}
        sessionId={null}
        stepName="beneficiary"
        submitLabel={isEditing ? 'Update' : 'Add'}
      />
      <div className="flex justify-start mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-[#717D93] hover:text-[#253859] underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
