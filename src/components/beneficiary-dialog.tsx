'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Beneficiary } from '@/types/database';

interface BeneficiaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  beneficiary?: Beneficiary | null;
  onSaved: () => void;
}

const COUNTRIES = [
  'United Kingdom',
  'Israel',
  'United States',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Netherlands',
  'Switzerland',
  'Australia',
  'Canada',
];

const CURRENCIES = ['GBP', 'ILS', 'USD', 'EUR'];

const emptyForm = {
  nickname: '',
  beneficiary_name: '',
  bank_name: '',
  bank_country: '',
  account_number: '',
  sort_code: '',
  iban: '',
  bic_swift: '',
  bank_address: '',
  currency: '',
  relationship_to_client: '',
};

export function BeneficiaryDialog({
  open,
  onOpenChange,
  clientId,
  beneficiary,
  onSaved,
}: BeneficiaryDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();
  const isEdit = !!beneficiary;

  // Populate form when editing
  useEffect(() => {
    if (beneficiary) {
      setForm({
        nickname: beneficiary.nickname || '',
        beneficiary_name: beneficiary.beneficiary_name || '',
        bank_name: beneficiary.bank_name || '',
        bank_country: beneficiary.bank_country || '',
        account_number: beneficiary.account_number || '',
        sort_code: beneficiary.sort_code || '',
        iban: beneficiary.iban || '',
        bic_swift: beneficiary.bic_swift || '',
        bank_address: beneficiary.bank_address || '',
        currency: beneficiary.currency || '',
        relationship_to_client: beneficiary.relationship_to_client || '',
      });
    } else {
      setForm(emptyForm);
    }
    setError('');
  }, [beneficiary, open]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.beneficiary_name.trim()) {
      setError('Account holder name is required');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      client_id: clientId,
      nickname: form.nickname || null,
      beneficiary_name: form.beneficiary_name,
      bank_name: form.bank_name || null,
      bank_country: form.bank_country || null,
      account_number: form.account_number || null,
      sort_code: form.sort_code || null,
      iban: form.iban || null,
      bic_swift: form.bic_swift || null,
      bank_address: form.bank_address || null,
      currency: form.currency || null,
      relationship_to_client: form.relationship_to_client || null,
    };

    let result;
    if (isEdit && beneficiary) {
      result = await supabase
        .from('beneficiaries')
        .update(payload)
        .eq('id', beneficiary.id);
    } else {
      result = await supabase
        .from('beneficiaries')
        .insert({ ...payload, verified: false });
    }

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const inputClasses =
    'bg-white border-[#E2E8F0] text-[#253859] placeholder:text-[#94A3B8] focus:border-[#01A0FF]/40 text-[13px] h-9';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#253859]">
            {isEdit ? 'Edit Bank Account' : 'Add Bank Account'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <p className="text-[12px] text-[#dc2626] bg-[#fef2f2] px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Row 1: Nickname + Account Holder Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-[#717D93] uppercase tracking-wider">
                Nickname
              </Label>
              <Input
                placeholder="e.g. Lawyer"
                value={form.nickname}
                onChange={(e) => handleChange('nickname', e.target.value)}
                className={inputClasses}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-[#717D93] uppercase tracking-wider">
                Account Holder <span className="text-[#dc2626]">*</span>
              </Label>
              <Input
                placeholder="Full name or company"
                value={form.beneficiary_name}
                onChange={(e) =>
                  handleChange('beneficiary_name', e.target.value)
                }
                className={inputClasses}
              />
            </div>
          </div>

          {/* Row 2: Bank Name + Bank Country */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-[#717D93] uppercase tracking-wider">
                Bank Name
              </Label>
              <Input
                placeholder="e.g. Bank Leumi"
                value={form.bank_name}
                onChange={(e) => handleChange('bank_name', e.target.value)}
                className={inputClasses}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-[#717D93] uppercase tracking-wider">
                Bank Country
              </Label>
              <Select
                value={form.bank_country}
                onValueChange={(v) => v && handleChange('bank_country', v)}
              >
                <SelectTrigger
                  className={`${inputClasses} w-full`}
                >
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#E2E8F0] shadow-lg">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: IBAN */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-[#717D93] uppercase tracking-wider">
              IBAN
            </Label>
            <Input
              placeholder="e.g. IL620108000000009906841"
              value={form.iban}
              onChange={(e) => handleChange('iban', e.target.value)}
              className={inputClasses}
            />
          </div>

          {/* Row 4: Account Number + Sort Code (UK) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-[#717D93] uppercase tracking-wider">
                Account Number
              </Label>
              <Input
                placeholder="e.g. 12345678"
                value={form.account_number}
                onChange={(e) => handleChange('account_number', e.target.value)}
                className={inputClasses}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-[#717D93] uppercase tracking-wider">
                Sort Code
              </Label>
              <Input
                placeholder="e.g. 20-00-00"
                value={form.sort_code}
                onChange={(e) => handleChange('sort_code', e.target.value)}
                className={inputClasses}
              />
            </div>
          </div>

          {/* Row 5: BIC/SWIFT + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-[#717D93] uppercase tracking-wider">
                BIC / SWIFT
              </Label>
              <Input
                placeholder="e.g. LUMIILITXXX"
                value={form.bic_swift}
                onChange={(e) => handleChange('bic_swift', e.target.value)}
                className={inputClasses}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-[#717D93] uppercase tracking-wider">
                Currency
              </Label>
              <Select
                value={form.currency}
                onValueChange={(v) => v && handleChange('currency', v)}
              >
                <SelectTrigger
                  className={`${inputClasses} w-full`}
                >
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#E2E8F0] shadow-lg">
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 6: Relationship */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-[#717D93] uppercase tracking-wider">
              Relationship to Client
            </Label>
            <Input
              placeholder="e.g. Lawyer, Property developer, Self"
              value={form.relationship_to_client}
              onChange={(e) =>
                handleChange('relationship_to_client', e.target.value)
              }
              className={inputClasses}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#E2E8F0] text-[#717D93] hover:bg-[#F4F5F7] text-[12px]"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#01A0FF] hover:bg-[#0090e6] text-white text-[12px] shadow-sm shadow-[#01A0FF]/15"
          >
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Add Bank Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
