'use client';

import type { FormConfig, FormSectionConfig, FormFieldConfig } from '@/lib/form-config/types';
import { resolveOptions } from '@/lib/form-config/options-registry';
import { SectionCard } from './section-card';

interface DynamicReviewRendererProps {
  config: FormConfig;
  data: Record<string, unknown>;
  /** Optional action slot (e.g. Edit button) rendered in the section card header */
  action?: React.ReactNode;
}

/**
 * Renders a read-only review of form data based on the form configuration.
 * Used on the Review page to display what the user submitted.
 *
 * Handles:
 * - Flat sections: renders label-value pairs in a 2-column grid
 * - Repeatable sections: renders each item as a sub-card
 * - Select fields: resolves value to display label
 * - Boolean fields: shows Yes/No
 * - Hidden fields: evaluates show_when conditions against data
 */
export function DynamicReviewRenderer({ config, data, action }: DynamicReviewRendererProps) {
  return (
    <div className="space-y-6">
      {config.sections.map((section) => {
        if (section.is_repeatable) {
          return (
            <ReviewRepeatableSection
              key={section.id}
              section={section}
              data={data}
              action={action}
            />
          );
        }

        // Filter to visible fields with actual data
        const visibleFields = section.fields.filter((field) =>
          isFieldVisibleForReview(field, data)
        );

        if (visibleFields.length === 0) return null;

        return (
          <SectionCard
            key={section.id}
            title={section.title}
            description={section.description ?? undefined}
            action={action}
          >
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {visibleFields.map((field) => (
                <ReviewField
                  key={field.field_key}
                  field={field}
                  value={data[field.field_key]}
                />
              ))}
            </dl>
          </SectionCard>
        );
      })}
    </div>
  );
}

/**
 * Renders a single section from a form config (without wrapping SectionCard).
 * Useful when the review page wants to combine multiple configs in one section.
 */
export function DynamicReviewSection({
  config,
  data,
}: {
  config: FormConfig;
  data: Record<string, unknown>;
}) {
  const allFields: FormFieldConfig[] = [];
  const repeatableSections: FormSectionConfig[] = [];

  for (const section of config.sections) {
    if (section.is_repeatable) {
      repeatableSections.push(section);
    } else {
      allFields.push(
        ...section.fields.filter((f) => isFieldVisibleForReview(f, data))
      );
    }
  }

  return (
    <div className="space-y-4">
      {allFields.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          {allFields.map((field) => (
            <ReviewField
              key={field.field_key}
              field={field}
              value={data[field.field_key]}
            />
          ))}
        </dl>
      )}

      {repeatableSections.map((section) => {
        const items = data[section.section_key];
        if (!Array.isArray(items) || items.length === 0) return null;

        return (
          <div key={section.id}>
            <h4 className="text-xs font-medium text-[#717D93] mb-2 uppercase tracking-wide">
              {section.title} ({items.length})
            </h4>
            <div className="space-y-2">
              {items.map((item, idx) => {
                const itemData = item as Record<string, unknown>;
                // Show a summary line for each item
                const summaryParts: string[] = [];
                for (const field of section.fields) {
                  const val = itemData[field.field_key];
                  if (val && val !== '' && field.field_type !== 'checkbox' && field.field_type !== 'switch') {
                    summaryParts.push(resolveDisplayValue(field, val));
                    if (summaryParts.length >= 3) break; // Show up to 3 fields
                  }
                }
                return (
                  <p key={idx} className="text-sm text-[#253859]">
                    {summaryParts.join(' — ') || `${section.item_label || 'Item'} ${idx + 1}`}
                  </p>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function ReviewField({ field, value }: { field: FormFieldConfig; value: unknown }) {
  return (
    <div>
      <dt className="text-xs text-[#717D93]">{field.label}</dt>
      <dd className="text-sm text-[#253859]">
        {resolveDisplayValue(field, value)}
      </dd>
    </div>
  );
}

/**
 * Convert a raw field value to a display string.
 * - Select fields: resolve to the option label
 * - Boolean fields: Yes/No
 * - Empty values: —
 */
function resolveDisplayValue(field: FormFieldConfig, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';

  // Boolean fields
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Select / country_select: resolve value to label
  if (field.field_type === 'select' || field.field_type === 'country_select') {
    const options = resolveOptions(field.options, field.options_source);
    const matched = options.find((opt) => opt.value === value);
    return matched ? matched.label : String(value);
  }

  return String(value);
}

function ReviewRepeatableSection({
  section,
  data,
  action,
}: {
  section: FormSectionConfig;
  data: Record<string, unknown>;
  action?: React.ReactNode;
}) {
  const items = data[section.section_key];
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <SectionCard
      title={`${section.title} (${items.length})`}
      description={section.description ?? undefined}
      action={action}
    >
      <div className="space-y-3">
        {items.map((item, idx) => {
          const itemData = item as Record<string, unknown>;
          const visibleFields = section.fields.filter(
            (f) => isFieldVisibleForReview(f, itemData)
          );

          return (
            <div key={idx} className="border border-[#E2E8F0] rounded-md p-3">
              <p className="text-xs font-medium text-[#717D93] mb-2">
                {section.item_label || 'Item'} {idx + 1}
              </p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                {visibleFields.map((field) => (
                  <ReviewField
                    key={field.field_key}
                    field={field}
                    value={itemData[field.field_key]}
                  />
                ))}
              </dl>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/**
 * Check if a field should be visible in the review, based on:
 * 1. The field has a value (non-empty) OR is always shown
 * 2. show_when conditions are met (using the data values)
 */
function isFieldVisibleForReview(
  field: FormFieldConfig,
  data: Record<string, unknown>
): boolean {
  // Always show the field in review even if empty — the dash (—) indicates no value
  // But still respect show_when conditions
  if (!field.show_when) return true;

  const showWhen = field.show_when;

  if ('logic' in showWhen && 'conditions' in showWhen) {
    // Compound condition
    const results = showWhen.conditions.map((cond) => {
      const currentValue = data[cond.field_key];
      return evaluateReviewCondition(cond.operator, currentValue, cond.value);
    });
    return showWhen.logic === 'OR' ? results.some(Boolean) : results.every(Boolean);
  }

  // Simple condition
  const sw = showWhen as { field_key: string; operator: string; value: unknown };
  const currentValue = data[sw.field_key];
  return evaluateReviewCondition(sw.operator, currentValue, sw.value);
}

function evaluateReviewCondition(
  operator: string,
  currentValue: unknown,
  conditionValue: unknown
): boolean {
  switch (operator) {
    case 'equals':
      return currentValue === conditionValue;
    case 'not_equals':
      return currentValue !== conditionValue;
    case 'in':
      return Array.isArray(conditionValue) && conditionValue.includes(currentValue);
    case 'not_empty':
      return currentValue !== '' && currentValue !== null && currentValue !== undefined;
    default:
      return true;
  }
}
