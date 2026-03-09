'use client';

import { useState } from 'react';
import { useForm, useFieldArray, useFormContext, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { buildZodSchema, buildDefaultValues } from '@/lib/form-config/build-schema';
import { isCompoundShowWhen } from '@/lib/form-config/types';
import type { FormConfig, FormSectionConfig, FormFieldConfig, ShowWhenCondition, ShowWhen } from '@/lib/form-config/types';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SectionCard } from './section-card';
import { DynamicField } from './dynamic-field';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface DynamicFormRendererProps {
  config: FormConfig;
  /** Pre-loaded data from the database (merged built-in + custom) */
  existingData?: Record<string, unknown>;
  /** Auto-saved draft data from onboarding_sessions.step_data */
  draftData?: Record<string, unknown>;
  /** Called when form is submitted with valid data */
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  /** Session ID for auto-save */
  sessionId: string | null;
  /** Step name for auto-save (e.g. 'kyc', 'fatca') */
  stepName: string;
  /** Submit button label (defaults to "Save & Continue") */
  submitLabel?: string;
}

/**
 * Generic dynamic form renderer that builds a form from a FormConfig.
 *
 * Replaces all hardcoded form components (kyc-individual-form, kyc-corporate-form, etc.)
 * by reading field definitions from the database and rendering them dynamically.
 */
export function DynamicFormRenderer({
  config,
  existingData,
  draftData,
  onSubmit,
  sessionId,
  stepName,
  submitLabel = 'Save & Continue',
}: DynamicFormRendererProps) {
  const [submitting, setSubmitting] = useState(false);

  // Build the Zod schema dynamically from the field configs
  const schema = buildZodSchema(config.sections);

  // Merge data sources: existing DB data < draft auto-save data
  // Draft data takes priority since it may contain unsaved user edits
  const mergedData = {
    ...(existingData || {}),
    ...(draftData || {}),
  };

  // Build default values from config, overlaid with existing/draft data
  const defaultValues = buildDefaultValues(config.sections, mergedData);

  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const { handleSubmit, watch } = methods;
  const formValues = watch();

  // Auto-save form state to onboarding_sessions.step_data
  useAutoSave(sessionId, stepName, formValues);

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await onSubmit(data);
    } catch (err) {
      console.error(`${config.form_key} save failed:`, err);
      setSubmitting(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {config.sections.map((section) => (
          <DynamicSection
            key={section.id}
            section={section}
          />
        ))}

        {/* Submit button */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

// ─── Section renderer ────────────────────────────────────────

interface DynamicSectionProps {
  section: FormSectionConfig;
}

function DynamicSection({ section }: DynamicSectionProps) {
  const { watch } = useFormContext();

  // Section-level conditional visibility (e.g. repeatable sections shown based on a toggle)
  if (section.show_when && !isSectionVisible(section.show_when, watch)) {
    return null;
  }

  if (section.is_repeatable) {
    return <RepeatableSection section={section} />;
  }

  // Check if any fields in this section are visible (accounting for show_when)
  const visibleFields = section.fields.filter((field) =>
    isFieldVisible(field, watch)
  );

  if (visibleFields.length === 0) return null;

  return (
    <SectionCard title={section.title} description={section.description ?? undefined}>
      <FieldGrid fields={visibleFields} namePrefix="" />
    </SectionCard>
  );
}

// ─── Repeatable section renderer ─────────────────────────────

interface RepeatableSectionProps {
  section: FormSectionConfig;
}

function RepeatableSection({ section }: RepeatableSectionProps) {
  const { control, watch } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: section.section_key,
  });

  return (
    <SectionCard title={section.title} description={section.description ?? undefined}>
      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="p-4 border border-[#E2E8F0] rounded-lg bg-[#FAFBFC]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#717D93]">
                {section.item_label || 'Item'} {index + 1}
              </span>
              {fields.length > section.min_items && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <FieldGrid
              fields={section.fields.filter((f) =>
                isFieldVisible(f, watch, `${section.section_key}.${index}.`)
              )}
              namePrefix={`${section.section_key}.${index}.`}
              compact
            />
          </div>
        ))}

        {fields.length < section.max_items && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const emptyEntry: Record<string, unknown> = {};
              for (const f of section.fields) {
                emptyEntry[f.field_key] = f.field_type === 'checkbox' || f.field_type === 'switch'
                  ? false
                  : f.field_type === 'checkbox_group'
                    ? []
                    : f.field_type === 'number'
                      ? 0
                      : '';
              }
              append(emptyEntry);
            }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add {section.item_label || 'Item'}
          </Button>
        )}
      </div>
    </SectionCard>
  );
}

// ─── Field grid ──────────────────────────────────────────────

// Render a grid of fields respecting grid_columns
interface FieldGridProps {
  fields: FormFieldConfig[];
  namePrefix: string;
  compact?: boolean;
}

function FieldGrid({ fields, namePrefix, compact = false }: FieldGridProps) {
  return (
    <div className="space-y-4">
      {groupFieldsIntoRows(fields).map((row, rowIdx) => {
        if (row.length === 1 && row[0].grid_columns >= 3) {
          // Full-width field
          return (
            <DynamicField
              key={row[0].field_key}
              field={row[0]}
              namePrefix={namePrefix}
              compact={compact}
            />
          );
        }

        // Multi-column row
        const totalCols = row.reduce((sum, f) => sum + f.grid_columns, 0);
        const gridClass = totalCols === 2
          ? 'grid grid-cols-1 sm:grid-cols-2 gap-4'
          : 'grid grid-cols-1 sm:grid-cols-3 gap-4';

        return (
          <div key={`row-${rowIdx}`} className={gridClass}>
            {row.map((field) => (
              <DynamicField
                key={field.field_key}
                field={field}
                namePrefix={namePrefix}
                compact={compact}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

// Group consecutive fields into rows based on their grid_columns.
// Fields with grid_columns = 3 always get their own row.
// Fields with grid_columns = 1 are grouped together (up to 3 per row).
function groupFieldsIntoRows(fields: FormFieldConfig[]): FormFieldConfig[][] {
  const rows: FormFieldConfig[][] = [];
  let currentRow: FormFieldConfig[] = [];
  let currentWidth = 0;

  for (const field of fields) {
    if (field.grid_columns >= 3) {
      // Flush current row if any
      if (currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [];
        currentWidth = 0;
      }
      rows.push([field]);
    } else if (currentWidth + field.grid_columns > 3) {
      // Current row is full, start a new one
      rows.push(currentRow);
      currentRow = [field];
      currentWidth = field.grid_columns;
    } else {
      currentRow.push(field);
      currentWidth += field.grid_columns;
    }
  }

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}

// Evaluate section-level visibility (uses top-level form values, no prefix)
function isSectionVisible(
  showWhen: ShowWhen,
  watch: ReturnType<typeof useFormContext>['watch']
): boolean {
  if (isCompoundShowWhen(showWhen)) {
    const results = showWhen.conditions.map((cond) =>
      evaluateCondition(cond, watch, '')
    );
    return showWhen.logic === 'OR'
      ? results.some(Boolean)
      : results.every(Boolean);
  }
  return evaluateCondition(showWhen as ShowWhenCondition, watch, '');
}

// Evaluate whether a field should be visible based on its show_when condition
function isFieldVisible(
  field: FormFieldConfig,
  watch: ReturnType<typeof useFormContext>['watch'],
  namePrefix: string = ''
): boolean {
  if (!field.show_when) return true;

  const showWhen = field.show_when;

  if (isCompoundShowWhen(showWhen)) {
    // Compound condition (AND/OR)
    const results = showWhen.conditions.map((cond) =>
      evaluateCondition(cond, watch, namePrefix)
    );
    return showWhen.logic === 'OR'
      ? results.some(Boolean)
      : results.every(Boolean);
  }

  // Simple condition
  return evaluateCondition(showWhen as ShowWhenCondition, watch, namePrefix);
}

function evaluateCondition(
  condition: ShowWhenCondition,
  watch: ReturnType<typeof useFormContext>['watch'],
  namePrefix: string
): boolean {
  const currentValue = watch(`${namePrefix}${condition.field_key}`);

  switch (condition.operator) {
    case 'equals':
      return currentValue === condition.value;
    case 'not_equals':
      return currentValue !== condition.value;
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(currentValue);
    case 'not_empty':
      return currentValue !== '' && currentValue !== null && currentValue !== undefined;
    case 'contains':
      // Check if an array value includes a specific item (for checkbox_group fields)
      return Array.isArray(currentValue) && currentValue.includes(condition.value as string);
    default:
      return true;
  }
}
