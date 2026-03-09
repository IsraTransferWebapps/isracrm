'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { createOnboardingClient } from '@/lib/onboarding/actions';
import { registrationSchema, type RegistrationFormData } from '@/lib/onboarding/schemas';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MfaStub } from '@/components/onboarding/mfa-stub';
import { User, Building2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClientType } from '@/types/database';
import Link from 'next/link';

const CLIENT_TYPE_OPTIONS: { value: ClientType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'individual_uk',
    label: 'Individual',
    description: 'Personal account for an individual',
    icon: <User className="w-5 h-5" />,
  },
  {
    value: 'corporate',
    label: 'Corporate / Business',
    description: 'Company or other legal entity',
    icon: <Building2 className="w-5 h-5" />,
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMfa, setShowMfa] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      client_type: undefined,
      email: '',
      password: '',
      confirm_password: '',
      gdpr_consent: false as unknown as true,
    },
  });

  const selectedType = watch('client_type');

  const onSubmit = async (data: RegistrationFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Sign up with Supabase Auth (with 15s timeout to prevent hanging)
      const signUpPromise = supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            user_type: 'client',
            client_type: data.client_type,
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Registration timed out. Please try again.')), 15000)
      );

      const { data: authData, error: authError } = await Promise.race([signUpPromise, timeoutPromise]);

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error('Registration failed. Please try again.');

      // If identities is empty, the email is already registered
      if (authData.user.identities && authData.user.identities.length === 0) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }

      // Create client and onboarding session
      const result = await createOnboardingClient(authData.user.id, data.client_type, data.email);
      if (!result.success) {
        throw new Error(result.error);
      }

      // Show MFA stub
      setShowMfa(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-[#253859]">Open an Account</h1>
        <p className="mt-2 text-sm text-[#717D93]">
          Start your application with IsraTransfer. The process takes approximately 10 minutes.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Client Type Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-[#253859]">Account Type</Label>
          <div className="grid gap-3">
            {CLIENT_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setValue('client_type', option.value, { shouldValidate: true })}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl border text-left transition-all',
                  selectedType === option.value
                    ? 'border-[#01A0FF] bg-[#01A0FF]/5 ring-2 ring-[#01A0FF]/20'
                    : 'border-[#E2E8F0] bg-white hover:border-[#94A3B8]'
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-lg',
                    selectedType === option.value
                      ? 'bg-[#01A0FF] text-white'
                      : 'bg-[#F4F5F7] text-[#717D93]'
                  )}
                >
                  {option.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#253859]">{option.label}</p>
                  <p className="text-xs text-[#94A3B8]">{option.description}</p>
                </div>
              </button>
            ))}
          </div>
          {errors.client_type && (
            <p className="text-xs text-red-500">{errors.client_type.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            {...register('email')}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Minimum 8 characters"
            {...register('password')}
            aria-invalid={!!errors.password}
          />
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirm_password">Confirm Password</Label>
          <Input
            id="confirm_password"
            type="password"
            placeholder="Re-enter your password"
            {...register('confirm_password')}
            aria-invalid={!!errors.confirm_password}
          />
          {errors.confirm_password && (
            <p className="text-xs text-red-500">{errors.confirm_password.message}</p>
          )}
        </div>

        {/* GDPR Consent */}
        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <Checkbox
              id="gdpr_consent"
              checked={watch('gdpr_consent') === true}
              onCheckedChange={(checked) =>
                setValue('gdpr_consent', checked === true ? true : (false as unknown as true), {
                  shouldValidate: true,
                })
              }
            />
            <label htmlFor="gdpr_consent" className="text-xs text-[#717D93] leading-snug cursor-pointer">
              I have read and accept the{' '}
              <span className="text-[#01A0FF] underline">Privacy Notice</span>. I understand
              that IsraTransfer will collect and process my personal data as described.
            </label>
          </div>
          {errors.gdpr_consent && (
            <p className="text-xs text-red-500">{errors.gdpr_consent.message}</p>
          )}
        </div>

        {/* Submit */}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>

        <p className="text-center text-xs text-[#94A3B8]">
          Already have an account?{' '}
          <Link href="/portal/login" className="text-[#01A0FF] underline">
            Sign in
          </Link>
        </p>
      </form>

      {/* MFA Stub Dialog */}
      <MfaStub
        open={showMfa}
        onContinue={() => {
          setShowMfa(false);
          router.push('/portal/onboard');
        }}
      />
    </div>
  );
}
