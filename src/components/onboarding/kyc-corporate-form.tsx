'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { updateOnboardingStep } from '@/lib/onboarding/actions';
import { kycCorporateSchema, directorSchema, uboSchema } from '@/lib/onboarding/schemas';
import {
  COUNTRIES, SOURCE_OF_FUNDS_OPTIONS, PURPOSE_OF_TRANSFERS_OPTIONS,
  ANTICIPATED_VOLUME_OPTIONS,
} from '@/lib/onboarding/constants';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SectionCard } from './section-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Trash2 } from 'lucide-react';

// Combined schema with directors and UBOs arrays
const corporateFullSchema = kycCorporateSchema.extend({
  directors: z.array(directorSchema).min(1, 'At least one director is required'),
  ubos: z.array(uboSchema),
});

type CorporateFullFormData = z.infer<typeof corporateFullSchema>;

interface Props {
  sessionId: string;
  clientId: string;
  stepData: Record<string, unknown>;
}

export function KycCorporateForm({ sessionId, clientId, stepData }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();
  const savedKyc = (stepData?.kyc as Record<string, unknown>) || {};

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CorporateFullFormData>({
    resolver: zodResolver(corporateFullSchema),
    defaultValues: {
      company_name: '',
      company_registration_number: '',
      country_of_incorporation: '',
      registered_address_line_1: '',
      registered_address_line_2: '',
      registered_address_city: '',
      registered_address_region: '',
      registered_address_postal_code: '',
      registered_address_country: '',
      same_trading_address: true,
      trading_address_line_1: '',
      trading_address_city: '',
      trading_address_country: '',
      industry: '',
      business_type: '',
      website: '',
      vat_number: '',
      principal_business_address: '',
      authorized_signatory: '',
      anticipated_volume: '',
      source_of_funds: '',
      source_of_funds_detail: '',
      purpose_of_transfers: '',
      sanctions_consent: false as unknown as true,
      directors: [{ full_name: '', date_of_birth: '', nationality: '', address: '', role: '' }],
      ubos: [],
      ...savedKyc,
    },
  });

  const { fields: directorFields, append: addDirector, remove: removeDirector } = useFieldArray({
    control,
    name: 'directors',
  });

  const { fields: uboFields, append: addUbo, remove: removeUbo } = useFieldArray({
    control,
    name: 'ubos',
  });

  const formValues = watch();
  const sameAddress = watch('same_trading_address');
  const sourceOfFunds = watch('source_of_funds');

  useAutoSave(sessionId, 'kyc', formValues);

  const onSubmit = async (data: CorporateFullFormData) => {
    setSubmitting(true);

    try {
      // Update corporate_details
      const { error: corpError } = await supabase
        .from('corporate_details')
        .update({
          company_name: data.company_name,
          company_registration_number: data.company_registration_number || null,
          country_of_incorporation: data.country_of_incorporation || null,
          registered_address_line_1: data.registered_address_line_1 || null,
          registered_address_line_2: data.registered_address_line_2 || null,
          registered_address_city: data.registered_address_city || null,
          registered_address_region: data.registered_address_region || null,
          registered_address_postal_code: data.registered_address_postal_code || null,
          registered_address_country: data.registered_address_country || null,
          trading_address_line_1: data.same_trading_address ? data.registered_address_line_1 : (data.trading_address_line_1 || null),
          trading_address_city: data.same_trading_address ? data.registered_address_city : (data.trading_address_city || null),
          trading_address_country: data.same_trading_address ? data.registered_address_country : (data.trading_address_country || null),
          industry: data.industry || null,
          business_type: data.business_type || null,
          website: data.website || null,
          vat_number: data.vat_number || null,
          principal_business_address: data.principal_business_address || null,
          anticipated_volume: data.anticipated_volume || null,
          sanctions_consent: true,
          sanctions_consent_date: new Date().toISOString(),
        })
        .eq('client_id', clientId);

      if (corpError) throw new Error(corpError.message);

      // Sync directors — delete all and re-insert
      await supabase.from('kyc_directors').delete().eq('client_id', clientId);
      if (data.directors.length > 0) {
        const { error: dirError } = await supabase.from('kyc_directors').insert(
          data.directors.map((d) => ({
            client_id: clientId,
            full_name: d.full_name,
            date_of_birth: d.date_of_birth || null,
            nationality: d.nationality || null,
            address: d.address || null,
            role: d.role || null,
          }))
        );
        if (dirError) throw new Error(dirError.message);
      }

      // Sync UBOs — delete all and re-insert
      await supabase.from('kyc_ubos').delete().eq('client_id', clientId);
      if (data.ubos.length > 0) {
        const { error: uboError } = await supabase.from('kyc_ubos').insert(
          data.ubos.map((u) => ({
            client_id: clientId,
            full_name: u.full_name,
            date_of_birth: u.date_of_birth || null,
            nationality: u.nationality || null,
            address: u.address || null,
            ownership_percentage: u.ownership_percentage,
            is_pep: u.is_pep,
            pep_details: u.pep_details || null,
          }))
        );
        if (uboError) throw new Error(uboError.message);
      }

      await updateOnboardingStep(sessionId, 'beneficiaries', { kyc: data });
      router.push('/onboard/beneficiaries');
    } catch (err) {
      console.error('Corporate KYC save failed:', err);
      setSubmitting(false);
    }
  };

  // Reusable select helper
  const SelectField = ({
    label, name, options, required,
  }: {
    label: string; name: string;
    options: readonly { value: string; label: string }[] | readonly string[];
    required?: boolean;
  }) => (
    <div className="space-y-1.5">
      <Label>{label}{required && ' *'}</Label>
      <select
        {...register(name as keyof CorporateFullFormData)}
        className="flex h-8 w-full rounded-lg border border-input bg-input/30 px-2.5 py-1 text-sm focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none"
      >
        <option value="">Select...</option>
        {options.map((opt) => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const lab = typeof opt === 'string' ? opt : opt.label;
          return <option key={val} value={val}>{lab}</option>;
        })}
      </select>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Company Details */}
      <SectionCard title="Company Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Company Legal Name *</Label>
            <Input {...register('company_name')} aria-invalid={!!errors.company_name} />
            {errors.company_name && <p className="text-xs text-red-500">{errors.company_name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Registration Number *</Label>
            <Input {...register('company_registration_number')} />
            {errors.company_registration_number && <p className="text-xs text-red-500">{errors.company_registration_number.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <SelectField label="Country of Incorporation" name="country_of_incorporation" options={COUNTRIES} required />
          <div className="space-y-1.5">
            <Label>Industry *</Label>
            <Input {...register('industry')} placeholder="e.g. Financial Services" />
            {errors.industry && <p className="text-xs text-red-500">{errors.industry.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="space-y-1.5">
            <Label>Business Type *</Label>
            <Input {...register('business_type')} placeholder="e.g. Limited Company" />
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input {...register('website')} placeholder="https://" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="space-y-1.5">
            <Label>VAT Number</Label>
            <Input {...register('vat_number')} />
          </div>
          <div className="space-y-1.5">
            <Label>Authorised Signatory *</Label>
            <Input {...register('authorized_signatory')} placeholder="Full name and title" />
            {errors.authorized_signatory && <p className="text-xs text-red-500">{errors.authorized_signatory.message}</p>}
          </div>
        </div>
      </SectionCard>

      {/* Registered Address */}
      <SectionCard title="Registered Address">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Address Line 1 *</Label>
            <Input {...register('registered_address_line_1')} />
          </div>
          <div className="space-y-1.5">
            <Label>Address Line 2</Label>
            <Input {...register('registered_address_line_2')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>City *</Label>
              <Input {...register('registered_address_city')} />
            </div>
            <div className="space-y-1.5">
              <Label>Region</Label>
              <Input {...register('registered_address_region')} />
            </div>
            <div className="space-y-1.5">
              <Label>Postal Code *</Label>
              <Input {...register('registered_address_postal_code')} />
            </div>
          </div>
          <SelectField label="Country" name="registered_address_country" options={COUNTRIES} required />
        </div>

        {/* Same trading address toggle */}
        <div className="flex items-center gap-3 mt-5 pt-5 border-t border-[#E2E8F0]">
          <Checkbox
            checked={sameAddress}
            onCheckedChange={(c) => setValue('same_trading_address', c === true)}
          />
          <Label className="text-xs text-[#717D93]">Trading address is the same as registered address</Label>
        </div>
        {!sameAddress && (
          <div className="space-y-4 mt-4 pl-4 border-l-2 border-[#E2E8F0]">
            <div className="space-y-1.5">
              <Label>Trading Address Line 1</Label>
              <Input {...register('trading_address_line_1')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input {...register('trading_address_city')} />
              </div>
              <SelectField label="Country" name="trading_address_country" options={COUNTRIES} />
            </div>
          </div>
        )}
      </SectionCard>

      {/* Directors */}
      <SectionCard title="Directors" description="List all company directors. At least one is required.">
        <div className="space-y-4">
          {directorFields.map((field, index) => (
            <div key={field.id} className="p-4 border border-[#E2E8F0] rounded-lg bg-[#FAFBFC]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#717D93]">Director {index + 1}</span>
                {directorFields.length > 1 && (
                  <button type="button" onClick={() => removeDirector(index)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Full Name *</Label>
                  <Input {...register(`directors.${index}.full_name`)} className="h-7 text-xs" />
                  {errors.directors?.[index]?.full_name && (
                    <p className="text-[10px] text-red-500">{errors.directors[index].full_name?.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date of Birth</Label>
                  <Input type="date" {...register(`directors.${index}.date_of_birth`)} className="h-7 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nationality</Label>
                  <Input {...register(`directors.${index}.nationality`)} className="h-7 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Role</Label>
                  <Input {...register(`directors.${index}.role`)} className="h-7 text-xs" placeholder="e.g. Managing Director" />
                </div>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addDirector({ full_name: '', date_of_birth: '', nationality: '', address: '', role: '' })}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Director
          </Button>
        </div>
      </SectionCard>

      {/* UBOs */}
      <SectionCard
        title="Ultimate Beneficial Owners (UBOs)"
        description="List any individual holding 25% or more ownership in the company."
      >
        <div className="space-y-4">
          {uboFields.map((field, index) => (
            <div key={field.id} className="p-4 border border-[#E2E8F0] rounded-lg bg-[#FAFBFC]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#717D93]">UBO {index + 1}</span>
                <button type="button" onClick={() => removeUbo(index)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Full Name *</Label>
                  <Input {...register(`ubos.${index}.full_name`)} className="h-7 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ownership % *</Label>
                  <Input type="number" step="0.01" {...register(`ubos.${index}.ownership_percentage`, { valueAsNumber: true })} className="h-7 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date of Birth</Label>
                  <Input type="date" {...register(`ubos.${index}.date_of_birth`)} className="h-7 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nationality</Label>
                  <Input {...register(`ubos.${index}.nationality`)} className="h-7 text-xs" />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <Switch
                  checked={watch(`ubos.${index}.is_pep`)}
                  onCheckedChange={(c) => setValue(`ubos.${index}.is_pep`, c)}
                  size="sm"
                />
                <Label className="text-xs">This person is a PEP</Label>
              </div>
              {watch(`ubos.${index}.is_pep`) && (
                <div className="mt-2">
                  <Textarea {...register(`ubos.${index}.pep_details`)} placeholder="PEP details..." className="text-xs" />
                </div>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addUbo({ full_name: '', date_of_birth: '', nationality: '', address: '', ownership_percentage: 25, is_pep: false, pep_details: '' })}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add UBO
          </Button>
        </div>
      </SectionCard>

      {/* Source of Funds & Purpose */}
      <SectionCard title="Source of Funds & Purpose" description="Required for regulatory compliance.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label="Source of Funds" name="source_of_funds" options={SOURCE_OF_FUNDS_OPTIONS} required />
          <SelectField label="Purpose of Transfers" name="purpose_of_transfers" options={PURPOSE_OF_TRANSFERS_OPTIONS} required />
        </div>
        {sourceOfFunds === 'other' && (
          <div className="mt-4">
            <Label>Please explain</Label>
            <Textarea {...register('source_of_funds_detail')} className="mt-1.5" />
          </div>
        )}
        <div className="mt-4">
          <SelectField label="Anticipated Monthly Volume" name="anticipated_volume" options={ANTICIPATED_VOLUME_OPTIONS} required />
        </div>
      </SectionCard>

      {/* Sanctions */}
      <SectionCard title="Sanctions Screening Consent">
        <div className="flex items-start gap-2">
          <Checkbox
            checked={watch('sanctions_consent') === true}
            onCheckedChange={(checked) =>
              setValue('sanctions_consent', checked === true ? true : (false as unknown as true), { shouldValidate: true })
            }
          />
          <label className="text-xs text-[#717D93] leading-snug cursor-pointer">
            I consent to IsraTransfer conducting sanctions screening checks against the company,
            its directors, and beneficial owners.
          </label>
        </div>
        {errors.sanctions_consent && <p className="text-xs text-red-500 mt-1">{errors.sanctions_consent.message}</p>}
      </SectionCard>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save & Continue'
          )}
        </Button>
      </div>
    </form>
  );
}
