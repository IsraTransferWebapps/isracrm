'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { updateOnboardingStep } from '@/lib/onboarding/actions';
import { kycIndividualSchema, type KycIndividualFormData } from '@/lib/onboarding/schemas';
import {
  TITLE_OPTIONS, COUNTRIES, SOURCE_OF_FUNDS_OPTIONS,
  PURPOSE_OF_TRANSFERS_OPTIONS,
} from '@/lib/onboarding/constants';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SectionCard } from './section-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface Props {
  sessionId: string;
  clientId: string;
  stepData: Record<string, unknown>;
}

export function KycIndividualForm({ sessionId, clientId, stepData }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  // Restore from auto-saved draft
  const savedKyc = (stepData?.kyc as Record<string, unknown>) || {};

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<KycIndividualFormData>({
    resolver: zodResolver(kycIndividualSchema),
    defaultValues: {
      title: '',
      first_name: '',
      last_name: '',
      date_of_birth: '',
      nationality: '',
      secondary_nationality: '',
      country_of_residence: '',
      israeli_id_number: '',
      passport_number: '',
      uk_national_insurance: '',
      phone_primary: '',
      email_primary: '',
      address_line_1: '',
      address_line_2: '',
      address_city: '',
      address_region: '',
      address_postal_code: '',
      address_country: '',
      occupation: '',
      employer: '',
      politically_exposed_person: false,
      pep_details: '',
      source_of_funds: '',
      source_of_funds_detail: '',
      purpose_of_transfers: '',
      sanctions_consent: false as unknown as true,
      ...savedKyc,
    },
  });

  const formValues = watch();
  const isPep = watch('politically_exposed_person');
  const sourceOfFunds = watch('source_of_funds');

  // Auto-save form state
  useAutoSave(sessionId, 'kyc', formValues);

  const onSubmit = async (data: KycIndividualFormData) => {
    setSubmitting(true);

    try {
      // Upsert individual_details
      const { error } = await supabase
        .from('individual_details')
        .update({
          title: data.title || null,
          first_name: data.first_name,
          last_name: data.last_name,
          date_of_birth: data.date_of_birth || null,
          nationality: data.nationality || null,
          secondary_nationality: data.secondary_nationality || null,
          country_of_residence: data.country_of_residence || null,
          israeli_id_number: data.israeli_id_number || null,
          passport_number: data.passport_number || null,
          uk_national_insurance: data.uk_national_insurance || null,
          phone_primary: data.phone_primary || null,
          email_primary: data.email_primary || null,
          address_line_1: data.address_line_1 || null,
          address_line_2: data.address_line_2 || null,
          address_city: data.address_city || null,
          address_region: data.address_region || null,
          address_postal_code: data.address_postal_code || null,
          address_country: data.address_country || null,
          occupation: data.occupation || null,
          employer: data.employer || null,
          politically_exposed_person: data.politically_exposed_person,
          pep_details: data.pep_details || null,
          source_of_funds: data.source_of_funds || null,
          source_of_funds_detail: data.source_of_funds_detail || null,
          purpose_of_transfers: data.purpose_of_transfers || null,
          sanctions_consent: true,
          sanctions_consent_date: new Date().toISOString(),
        })
        .eq('client_id', clientId);

      if (error) throw new Error(error.message);

      // Advance to next step
      await updateOnboardingStep(sessionId, 'beneficiaries', { kyc: data });
      router.push('/onboard/beneficiaries');
    } catch (err) {
      console.error('KYC save failed:', err);
      setSubmitting(false);
    }
  };

  // Helper for select-like inputs using native <select>
  const SelectField = ({
    label,
    name,
    options,
    helperText,
    required,
  }: {
    label: string;
    name: keyof KycIndividualFormData;
    options: readonly { value: string; label: string }[] | readonly string[];
    helperText?: string;
    required?: boolean;
  }) => (
    <div className="space-y-1.5">
      <Label htmlFor={name as string}>{label}{required && ' *'}</Label>
      <select
        id={name as string}
        {...register(name)}
        className="flex h-8 w-full rounded-lg border border-input bg-input/30 px-2.5 py-1 text-sm focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none"
      >
        <option value="">Select...</option>
        {options.map((opt) => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const lab = typeof opt === 'string' ? opt : opt.label;
          return <option key={val} value={val}>{lab}</option>;
        })}
      </select>
      {helperText && <p className="text-[11px] text-[#94A3B8]">{helperText}</p>}
      {errors[name] && <p className="text-xs text-red-500">{errors[name]?.message}</p>}
    </div>
  );

  const TextField = ({
    label,
    name,
    type = 'text',
    placeholder,
    helperText,
    required,
  }: {
    label: string;
    name: keyof KycIndividualFormData;
    type?: string;
    placeholder?: string;
    helperText?: string;
    required?: boolean;
  }) => (
    <div className="space-y-1.5">
      <Label htmlFor={name as string}>{label}{required && ' *'}</Label>
      <Input
        id={name as string}
        type={type}
        placeholder={placeholder}
        {...register(name)}
        aria-invalid={!!errors[name]}
      />
      {helperText && <p className="text-[11px] text-[#94A3B8]">{helperText}</p>}
      {errors[name] && <p className="text-xs text-red-500">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Personal Details */}
      <SectionCard title="Personal Details" description="Your legal name as it appears on your identity documents.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SelectField label="Title" name="title" options={TITLE_OPTIONS} />
          <TextField label="First Name" name="first_name" required />
          <TextField label="Last Name" name="last_name" required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <TextField label="Date of Birth" name="date_of_birth" type="date" required />
          <SelectField label="Nationality" name="nationality" options={COUNTRIES} required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <SelectField label="Secondary Nationality" name="secondary_nationality" options={COUNTRIES} />
          <SelectField label="Country of Residence" name="country_of_residence" options={COUNTRIES} required />
        </div>
      </SectionCard>

      {/* Contact Information */}
      <SectionCard title="Contact Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="Phone Number" name="phone_primary" placeholder="+44 7xxx xxx xxx" required />
          <TextField label="Email Address" name="email_primary" type="email" required />
        </div>
      </SectionCard>

      {/* Address */}
      <SectionCard title="Residential Address" description="Your current home address.">
        <div className="space-y-4">
          <TextField label="Address Line 1" name="address_line_1" required />
          <TextField label="Address Line 2" name="address_line_2" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TextField label="City" name="address_city" required />
            <TextField label="Region / County" name="address_region" />
            <TextField label="Postal Code" name="address_postal_code" required />
          </div>
          <SelectField label="Country" name="address_country" options={COUNTRIES} required />
        </div>
      </SectionCard>

      {/* Identification Numbers */}
      <SectionCard
        title="Identification"
        description="Provide at least one government-issued ID number."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="Israeli ID (Teudat Zehut)" name="israeli_id_number" helperText="9-digit Israeli ID number" />
          <TextField label="Passport Number" name="passport_number" />
        </div>
        <div className="mt-4">
          <TextField label="UK National Insurance Number" name="uk_national_insurance" helperText="If you are a UK resident" />
        </div>
      </SectionCard>

      {/* Employment */}
      <SectionCard title="Employment" description="Required for source of funds verification.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="Occupation / Job Title" name="occupation" required />
          <TextField label="Employer Name" name="employer" />
        </div>
      </SectionCard>

      {/* PEP Declaration */}
      <SectionCard
        title="Politically Exposed Person (PEP)"
        description="A PEP is someone who holds or has held a prominent public function."
      >
        <div className="flex items-center gap-3">
          <Switch
            checked={isPep}
            onCheckedChange={(checked) => setValue('politically_exposed_person', checked)}
          />
          <Label>I am, or have been, a Politically Exposed Person</Label>
        </div>
        {isPep && (
          <div className="mt-4">
            <Label htmlFor="pep_details">Please provide details</Label>
            <Textarea
              id="pep_details"
              {...register('pep_details')}
              placeholder="Position held, country, dates..."
              className="mt-1.5"
            />
          </div>
        )}
      </SectionCard>

      {/* Source of Funds & Purpose */}
      <SectionCard
        title="Source of Funds & Purpose"
        description="Required under anti-money laundering regulations to understand the origin of your funds."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label="Primary Source of Funds"
            name="source_of_funds"
            options={SOURCE_OF_FUNDS_OPTIONS}
            required
          />
          <SelectField
            label="Purpose of Transfers"
            name="purpose_of_transfers"
            options={PURPOSE_OF_TRANSFERS_OPTIONS}
            required
          />
        </div>
        {sourceOfFunds === 'other' && (
          <div className="mt-4">
            <Label htmlFor="source_of_funds_detail">Please explain your source of funds</Label>
            <Textarea
              id="source_of_funds_detail"
              {...register('source_of_funds_detail')}
              placeholder="Provide details..."
              className="mt-1.5"
            />
          </div>
        )}
      </SectionCard>

      {/* Sanctions Consent */}
      <SectionCard title="Sanctions Screening Consent">
        <div className="flex items-start gap-2">
          <Checkbox
            id="sanctions_consent"
            checked={watch('sanctions_consent') === true}
            onCheckedChange={(checked) =>
              setValue('sanctions_consent', checked === true ? true : (false as unknown as true), {
                shouldValidate: true,
              })
            }
          />
          <label htmlFor="sanctions_consent" className="text-xs text-[#717D93] leading-snug cursor-pointer">
            I consent to IsraTransfer conducting sanctions screening checks against my name and
            personal details, in compliance with applicable regulations.
          </label>
        </div>
        {errors.sanctions_consent && (
          <p className="text-xs text-red-500 mt-1">{errors.sanctions_consent.message}</p>
        )}
      </SectionCard>

      {/* Submit */}
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
