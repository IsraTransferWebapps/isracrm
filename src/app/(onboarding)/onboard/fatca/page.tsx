'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { OnboardingAuthProvider, useOnboarding } from '@/components/providers/onboarding-auth-provider';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { SectionCard } from '@/components/onboarding/section-card';
import { fatcaSchema, taxResidencySchema } from '@/lib/onboarding/schemas';
import { COUNTRIES, ENTITY_CLASSIFICATION_OPTIONS, REASON_NO_TIN_OPTIONS } from '@/lib/onboarding/constants';
import { updateOnboardingStep } from '@/lib/onboarding/actions';
import { useAutoSave } from '@/hooks/use-auto-save';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Plus, Trash2 } from 'lucide-react';

const fatcaFullSchema = fatcaSchema.extend({
  tax_residencies: z.array(taxResidencySchema).min(1, 'At least one tax residency is required'),
});

type FatcaFullFormData = z.infer<typeof fatcaFullSchema>;

function FatcaContent() {
  const { session, clientId, clientType, loading } = useOnboarding();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const savedFatca = (session?.step_data?.fatca as Record<string, unknown>) || {};

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FatcaFullFormData>({
    resolver: zodResolver(fatcaFullSchema),
    defaultValues: {
      us_citizen: false,
      us_tax_resident: false,
      us_tin: '',
      entity_classification: '',
      giin: '',
      self_certification: false as unknown as true,
      tax_residencies: [{ country: '', tin: '', reason_no_tin: '' }],
      ...savedFatca,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'tax_residencies' });

  const formValues = watch();
  const usStatus = watch('us_citizen') || watch('us_tax_resident');
  const isCorporate = clientType === 'corporate';

  useAutoSave(session?.id ?? null, 'fatca', formValues);

  const onSubmit = async (data: FatcaFullFormData) => {
    if (!session || !clientId) return;
    setSubmitting(true);

    try {
      // Upsert FATCA declaration
      const { data: existingFatca } = await supabase
        .from('fatca_declarations')
        .select('id')
        .eq('client_id', clientId)
        .single();

      let fatcaId: string;

      if (existingFatca) {
        await supabase.from('fatca_declarations').update({
          us_citizen: data.us_citizen,
          us_tax_resident: data.us_tax_resident,
          us_tin: data.us_tin || null,
          entity_classification: data.entity_classification || null,
          giin: data.giin || null,
          self_certification: true,
          declaration_date: new Date().toISOString(),
        }).eq('id', existingFatca.id);
        fatcaId = existingFatca.id;
      } else {
        const { data: newFatca, error } = await supabase.from('fatca_declarations').insert({
          client_id: clientId,
          us_citizen: data.us_citizen,
          us_tax_resident: data.us_tax_resident,
          us_tin: data.us_tin || null,
          entity_classification: data.entity_classification || null,
          giin: data.giin || null,
          self_certification: true,
          declaration_date: new Date().toISOString(),
        }).select('id').single();
        if (error) throw error;
        fatcaId = newFatca!.id;
      }

      // Sync tax residencies — delete and re-insert
      await supabase.from('tax_residencies').delete().eq('fatca_declaration_id', fatcaId);
      if (data.tax_residencies.length > 0) {
        await supabase.from('tax_residencies').insert(
          data.tax_residencies.map((tr) => ({
            fatca_declaration_id: fatcaId,
            country: tr.country,
            tin: tr.tin || null,
            reason_no_tin: tr.reason_no_tin || null,
          }))
        );
      }

      await updateOnboardingStep(session.id, 'documents', { fatca: data });
      router.push('/onboard/documents');
    } catch (err) {
      console.error('FATCA save failed:', err);
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!session || !clientId) {
    return <p className="text-sm text-[#717D93]">Session not found.</p>;
  }

  return (
    <OnboardingShell
      currentStep="fatca"
      title="Tax Declaration (FATCA / CRS)"
      subtitle="We are required to collect tax residency information under international tax reporting standards."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* US Status */}
        <SectionCard title="US Tax Status" description="FATCA requires us to identify US persons.">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={watch('us_citizen')}
                onCheckedChange={(c) => setValue('us_citizen', c === true)}
              />
              <Label className="text-sm">I am a US citizen</Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={watch('us_tax_resident')}
                onCheckedChange={(c) => setValue('us_tax_resident', c === true)}
              />
              <Label className="text-sm">I am a US tax resident</Label>
            </div>
            {usStatus && (
              <div className="space-y-1.5 pl-7">
                <Label>US Tax Identification Number (TIN / SSN) *</Label>
                <Input {...register('us_tin')} placeholder="e.g. 123-45-6789" />
                {errors.us_tin && <p className="text-xs text-red-500">{errors.us_tin.message}</p>}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Entity Classification — corporate only */}
        {isCorporate && (
          <SectionCard title="Entity Classification" description="FATCA classification for entities.">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Entity Classification</Label>
                <select
                  {...register('entity_classification')}
                  className="flex h-8 w-full rounded-lg border border-input bg-input/30 px-2.5 py-1 text-sm focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none"
                >
                  <option value="">Select...</option>
                  {ENTITY_CLASSIFICATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {watch('entity_classification') === 'financial_institution' && (
                <div className="space-y-1.5">
                  <Label>GIIN (Global Intermediary Identification Number)</Label>
                  <Input {...register('giin')} placeholder="e.g. A1B2C3.12345.SL.123" />
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Tax Residencies */}
        <SectionCard
          title="Country/Countries of Tax Residency"
          description="List all countries where you are tax resident and provide your Tax Identification Number (TIN) for each."
        >
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border border-[#E2E8F0] rounded-lg bg-[#FAFBFC]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-[#717D93]">Tax Residency {index + 1}</span>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Country *</Label>
                    <select
                      {...register(`tax_residencies.${index}.country`)}
                      className="flex h-7 w-full rounded-lg border border-input bg-input/30 px-2 py-0.5 text-xs focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none"
                    >
                      <option value="">Select...</option>
                      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">TIN</Label>
                    <Input {...register(`tax_residencies.${index}.tin`)} className="h-7 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Reason if no TIN</Label>
                    <select
                      {...register(`tax_residencies.${index}.reason_no_tin`)}
                      className="flex h-7 w-full rounded-lg border border-input bg-input/30 px-2 py-0.5 text-xs focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none"
                    >
                      <option value="">N/A</option>
                      {REASON_NO_TIN_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
            {fields.length < 5 && (
              <Button type="button" variant="outline" size="sm" onClick={() => append({ country: '', tin: '', reason_no_tin: '' })}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Country
              </Button>
            )}
          </div>
        </SectionCard>

        {/* Self-Certification */}
        <SectionCard title="Self-Certification">
          <div className="flex items-start gap-2">
            <Checkbox
              checked={watch('self_certification') === true}
              onCheckedChange={(c) =>
                setValue('self_certification', c === true ? true : (false as unknown as true), { shouldValidate: true })
              }
            />
            <label className="text-xs text-[#717D93] leading-snug cursor-pointer">
              I certify that the information provided above is correct and complete.
              I undertake to notify IsraTransfer of any change in circumstances which
              causes the information contained herein to become incorrect.
            </label>
          </div>
          {errors.self_certification && (
            <p className="text-xs text-red-500 mt-1">{errors.self_certification.message}</p>
          )}
          <p className="text-xs text-[#94A3B8] mt-3">
            Declaration date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </SectionCard>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="submit" disabled={submitting}>
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save & Continue'}
          </Button>
        </div>
      </form>
    </OnboardingShell>
  );
}

export default function FatcaPage() {
  return (
    <OnboardingAuthProvider>
      <FatcaContent />
    </OnboardingAuthProvider>
  );
}
