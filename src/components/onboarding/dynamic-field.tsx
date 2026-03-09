'use client';

import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { resolveOptions } from '@/lib/form-config/options-registry';
import type { FormFieldConfig } from '@/lib/form-config/types';

interface DynamicFieldProps {
  field: FormFieldConfig;
  /** For repeatable sections: the array path prefix, e.g. "directors.0." */
  namePrefix?: string;
  /** Whether this field is inside a compact repeatable card (smaller styling) */
  compact?: boolean;
}

/**
 * Renders a single form field based on its configuration.
 * Uses the react-hook-form context from the parent DynamicFormRenderer.
 */
export function DynamicField({ field, namePrefix = '', compact = false }: DynamicFieldProps) {
  const { register, watch, setValue, formState: { errors } } = useFormContext();

  const fieldName = `${namePrefix}${field.field_key}`;

  // Navigate nested errors for array fields (e.g. directors.0.full_name)
  const getError = (): string | undefined => {
    const parts = fieldName.split('.');
    let current: Record<string, unknown> = errors as Record<string, unknown>;
    for (const part of parts) {
      if (!current || typeof current !== 'object') return undefined;
      current = current[part] as Record<string, unknown>;
    }
    return (current as { message?: string } | undefined)?.message;
  };

  const error = getError();
  const labelSize = compact ? 'text-xs' : 'text-sm';
  const inputHeight = compact ? 'h-7 text-xs' : 'h-8';

  switch (field.field_type) {
    case 'text':
    case 'email':
    case 'date': {
      return (
        <div className="space-y-1.5">
          <Label htmlFor={fieldName} className={labelSize}>
            {field.label}{field.is_required && ' *'}
          </Label>
          <Input
            id={fieldName}
            type={field.field_type === 'date' ? 'date' : field.field_type === 'email' ? 'email' : 'text'}
            placeholder={field.placeholder ?? undefined}
            {...register(fieldName)}
            aria-invalid={!!error}
            className={inputHeight}
          />
          {field.help_text && (
            <p className="text-[11px] text-[#94A3B8]">{field.help_text}</p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );
    }

    case 'number': {
      return (
        <div className="space-y-1.5">
          <Label htmlFor={fieldName} className={labelSize}>
            {field.label}{field.is_required && ' *'}
          </Label>
          <Input
            id={fieldName}
            type="number"
            step="any"
            placeholder={field.placeholder ?? undefined}
            {...register(fieldName, { valueAsNumber: true })}
            aria-invalid={!!error}
            className={inputHeight}
          />
          {field.help_text && (
            <p className="text-[11px] text-[#94A3B8]">{field.help_text}</p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );
    }

    case 'select':
    case 'country_select': {
      const options = resolveOptions(field.options, field.options_source);
      return (
        <div className="space-y-1.5">
          <Label htmlFor={fieldName} className={labelSize}>
            {field.label}{field.is_required && ' *'}
          </Label>
          <select
            id={fieldName}
            {...register(fieldName)}
            className={`flex ${compact ? 'h-7 text-xs px-2 py-0.5' : 'h-8 px-2.5 py-1 text-sm'} w-full rounded-lg border border-input bg-input/30 focus:border-ring focus:ring-3 focus:ring-ring/50 outline-none`}
          >
            <option value="">Select...</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {field.help_text && (
            <p className="text-[11px] text-[#94A3B8]">{field.help_text}</p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );
    }

    case 'checkbox': {
      const checked = watch(fieldName);
      return (
        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <Checkbox
              id={fieldName}
              checked={checked === true}
              onCheckedChange={(c) =>
                setValue(fieldName, c === true, { shouldValidate: true })
              }
            />
            <label
              htmlFor={fieldName}
              className="text-xs text-[#717D93] leading-snug cursor-pointer"
            >
              {field.label}
            </label>
          </div>
          {field.help_text && (
            <p className="text-[11px] text-[#94A3B8] pl-6">{field.help_text}</p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );
    }

    case 'switch': {
      const checked = watch(fieldName);
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <Switch
              checked={checked === true}
              onCheckedChange={(c) => setValue(fieldName, c)}
              {...(compact ? { size: 'sm' as const } : {})}
            />
            <Label className={labelSize}>{field.label}</Label>
          </div>
          {field.help_text && (
            <p className="text-[11px] text-[#94A3B8]">{field.help_text}</p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );
    }

    case 'textarea': {
      return (
        <div className="space-y-1.5">
          <Label htmlFor={fieldName} className={labelSize}>
            {field.label}{field.is_required && ' *'}
          </Label>
          <Textarea
            id={fieldName}
            placeholder={field.placeholder ?? undefined}
            {...register(fieldName)}
            className={compact ? 'text-xs' : ''}
          />
          {field.help_text && (
            <p className="text-[11px] text-[#94A3B8]">{field.help_text}</p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );
    }

    case 'checkbox_group': {
      // Multi-select checkboxes: stores a string[] of selected values
      const options = resolveOptions(field.options, field.options_source);
      const currentValues: string[] = (watch(fieldName) as string[]) || [];

      return (
        <div className="space-y-1.5">
          <Label className={labelSize}>
            {field.label}{field.is_required && ' *'}
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {options.map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <Checkbox
                  id={`${fieldName}_${opt.value}`}
                  checked={currentValues.includes(opt.value)}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...currentValues, opt.value]
                      : currentValues.filter((v) => v !== opt.value);
                    setValue(fieldName, next, { shouldValidate: true });
                  }}
                />
                <label
                  htmlFor={`${fieldName}_${opt.value}`}
                  className="text-xs text-[#717D93] cursor-pointer leading-snug"
                >
                  {opt.label}
                </label>
              </div>
            ))}
          </div>
          {field.help_text && (
            <p className="text-[11px] text-[#94A3B8]">{field.help_text}</p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );
    }

    default:
      return null;
  }
}
