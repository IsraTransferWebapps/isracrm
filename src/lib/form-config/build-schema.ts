import { z } from 'zod';
import type { FormSectionConfig, FormFieldConfig, ValidationRules } from './types';

/**
 * Dynamically build a Zod schema from form field configurations.
 *
 * This replaces the static schemas in schemas.ts. Each visible field
 * is mapped to a Zod type based on its field_type, required status,
 * and validation rules. Repeatable sections produce z.array() schemas.
 *
 * Fields with show_when conditions are always made optional in the schema
 * because they may not be present depending on the state of other fields.
 */

// Build a Zod schema for a single field
function buildFieldSchema(field: FormFieldConfig): z.ZodTypeAny {
  const rules = field.validation_rules as (ValidationRules & { must_be_true?: boolean }) | null;
  let schema: z.ZodTypeAny;

  switch (field.field_type) {
    case 'text':
    case 'country_select': {
      let s = z.string();
      if (field.is_required) {
        s = s.min(rules?.min_length ?? 1, `${field.label} is required`);
      }
      if (rules?.max_length) {
        s = s.max(rules.max_length, `Maximum ${rules.max_length} characters`);
      }
      if (rules?.pattern) {
        s = s.regex(
          new RegExp(rules.pattern),
          rules.pattern_message ?? `Invalid format for ${field.label}`
        );
      }
      schema = field.is_required ? s : s.optional().or(z.literal(''));
      break;
    }

    case 'email': {
      let s = z.string().email(`Please enter a valid email address`);
      schema = field.is_required ? s : s.optional().or(z.literal(''));
      break;
    }

    case 'date': {
      let s = z.string();
      if (field.is_required) {
        s = s.min(1, `${field.label} is required`);
      }
      schema = field.is_required ? s : s.optional().or(z.literal(''));
      break;
    }

    case 'select': {
      let s = z.string();
      if (field.is_required) {
        s = s.min(1, `${field.label} is required`);
      }
      schema = field.is_required ? s : s.optional().or(z.literal(''));
      break;
    }

    case 'number': {
      let s = z.number();
      if (rules?.min !== undefined) {
        s = s.min(rules.min, `Must be at least ${rules.min}`);
      }
      if (rules?.max !== undefined) {
        s = s.max(rules.max, `Cannot exceed ${rules.max}`);
      }
      schema = field.is_required ? s : s.optional();
      break;
    }

    case 'checkbox': {
      // Special case: checkboxes that MUST be true (sanctions consent, self-certification)
      if (rules?.must_be_true) {
        schema = z.literal(true, {
          message: field.is_required
            ? `You must accept to continue`
            : undefined,
        });
      } else {
        schema = z.boolean();
      }
      break;
    }

    case 'switch': {
      schema = z.boolean();
      break;
    }

    case 'textarea': {
      let s = z.string();
      if (field.is_required) {
        s = s.min(rules?.min_length ?? 1, `${field.label} is required`);
      }
      if (rules?.max_length) {
        s = s.max(rules.max_length, `Maximum ${rules.max_length} characters`);
      }
      schema = field.is_required ? s : s.optional().or(z.literal(''));
      break;
    }

    case 'checkbox_group': {
      // Multi-select checkboxes: stores string[]
      const arr = z.array(z.string());
      schema = field.is_required
        ? arr.min(1, `Please select at least one option for ${field.label}`)
        : arr.optional();
      break;
    }

    case 'file_upload': {
      // File uploads are handled separately by the DocumentUploader component.
      // The schema just needs a placeholder — validation happens at upload time.
      schema = z.any().optional();
      break;
    }

    default:
      schema = z.string().optional();
  }

  // Fields with show_when conditions should always be optional since they may be hidden
  if (field.show_when) {
    // Wrap in optional if not already
    if (!(schema instanceof z.ZodOptional)) {
      schema = schema.optional();
    }
  }

  return schema;
}

// Build a Zod schema for a flat (non-repeatable) section's fields
function buildFlatSectionSchema(fields: FormFieldConfig[]): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    shape[field.field_key] = buildFieldSchema(field);
  }
  return shape;
}

// Build a Zod schema for a repeatable section (produces z.array())
function buildRepeatableSectionSchema(section: FormSectionConfig): z.ZodTypeAny {
  const entryShape = buildFlatSectionSchema(section.fields);
  let arraySchema = z.array(z.object(entryShape));

  if (section.min_items > 0) {
    arraySchema = arraySchema.min(
      section.min_items,
      `At least ${section.min_items} ${section.item_label || 'item'}${section.min_items > 1 ? 's' : ''} required`
    );
  }
  if (section.max_items) {
    arraySchema = arraySchema.max(section.max_items);
  }

  return arraySchema;
}

/**
 * Build a complete Zod schema from a form's sections.
 *
 * Non-repeatable sections have their fields merged into the top-level object.
 * Repeatable sections become array properties keyed by section_key.
 *
 * Example output shape:
 * {
 *   first_name: z.string().min(1),
 *   last_name: z.string().min(1),
 *   directors: z.array(z.object({ full_name: z.string() })).min(1),
 * }
 */
export function buildZodSchema(sections: FormSectionConfig[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const section of sections) {
    if (section.is_repeatable) {
      // Repeatable sections become array properties
      let sectionSchema = buildRepeatableSectionSchema(section);
      // Sections with show_when conditions should be optional (may be hidden)
      if (section.show_when) {
        sectionSchema = sectionSchema.optional();
      }
      shape[section.section_key] = sectionSchema;
    } else {
      // Flat sections merge their fields into the top-level object
      const sectionShape = buildFlatSectionSchema(section.fields);
      Object.assign(shape, sectionShape);
    }
  }

  return z.object(shape);
}

/**
 * Generate default values for a form from its configuration.
 *
 * Used to initialize react-hook-form with proper defaults for each field type.
 */
export function buildDefaultValues(
  sections: FormSectionConfig[],
  existingData?: Record<string, unknown>
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  for (const section of sections) {
    if (section.is_repeatable) {
      // For repeatable sections, start with one empty entry (or min_items)
      const existingArray = existingData?.[section.section_key];
      if (Array.isArray(existingArray) && existingArray.length > 0) {
        defaults[section.section_key] = existingArray;
      } else if (section.show_when) {
        // Conditional repeatable sections start with empty array (section may be hidden)
        defaults[section.section_key] = [];
      } else {
        const emptyEntry: Record<string, unknown> = {};
        for (const field of section.fields) {
          emptyEntry[field.field_key] = getDefaultForType(field);
        }
        // Create min_items entries (at least 1 if min > 0, otherwise empty array)
        const count = Math.max(section.min_items, section.min_items > 0 ? 1 : 0);
        defaults[section.section_key] = count > 0
          ? Array.from({ length: count }, () => ({ ...emptyEntry }))
          : [];
      }
    } else {
      for (const field of section.fields) {
        defaults[field.field_key] = existingData?.[field.field_key] ?? getDefaultForType(field);
      }
    }
  }

  return defaults;
}

// Get the appropriate default value for a field type
function getDefaultForType(field: FormFieldConfig): unknown {
  switch (field.field_type) {
    case 'checkbox':
    case 'switch':
      return false;
    case 'checkbox_group':
      return [];
    case 'number':
      return field.is_required ? 0 : undefined;
    default:
      return '';
  }
}
