'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FormConfig, FormSectionConfig, FormFieldConfig, FieldType } from '@/lib/form-config/types';
import {
  updateField,
  updateSection,
  addCustomField,
  addSection,
  deleteField,
  reorderFields,
  reorderSections,
  bumpFormVersion,
} from '@/lib/form-config/admin-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Pencil,
  X,
  Save,
  AlertCircle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface FormEditorProps {
  config: FormConfig;
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  email: 'Email',
  date: 'Date',
  select: 'Dropdown',
  country_select: 'Country Dropdown',
  checkbox: 'Checkbox',
  switch: 'Toggle Switch',
  textarea: 'Text Area',
  number: 'Number',
  file_upload: 'File Upload',
};

const FIELD_TYPE_OPTIONS: FieldType[] = [
  'text', 'email', 'date', 'select', 'textarea', 'number', 'checkbox', 'switch',
];

export function FormEditor({ config }: FormEditorProps) {
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add new field state
  const [addingFieldToSection, setAddingFieldToSection] = useState<string | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');

  // Add new section state
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  const toggleSection = (sectionId: string) => {
    const next = new Set(expandedSections);
    next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId);
    setExpandedSections(next);
  };

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // ─── Field editing ────────────────────────────────────────

  const handleFieldUpdate = async (fieldId: string, updates: Record<string, unknown>) => {
    setSaving(true);
    const result = await updateField(fieldId, updates);
    if (result.success) {
      await bumpFormVersion(config.id);
      showStatus('success', 'Field updated');
      router.refresh();
    } else {
      showStatus('error', result.error || 'Failed to update field');
    }
    setSaving(false);
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this custom field?')) return;
    setSaving(true);
    const result = await deleteField(fieldId);
    if (result.success) {
      await bumpFormVersion(config.id);
      showStatus('success', 'Field deleted');
      router.refresh();
    } else {
      showStatus('error', result.error || 'Failed to delete field');
    }
    setSaving(false);
  };

  // ─── Add new field ─────────────────────────────────────────

  const handleAddField = async (sectionId: string) => {
    if (!newFieldLabel.trim()) return;

    // Generate field_key from label (lowercase, underscored)
    const fieldKey = 'custom_' + newFieldLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    // Get the max display_order in this section
    const section = config.sections.find((s) => s.id === sectionId);
    const maxOrder = section
      ? Math.max(0, ...section.fields.map((f) => f.display_order))
      : 0;

    setSaving(true);
    const result = await addCustomField(sectionId, {
      field_key: fieldKey,
      field_type: newFieldType,
      label: newFieldLabel.trim(),
      is_required: false,
      grid_columns: 1,
      display_order: maxOrder + 1,
    });

    if (result.success) {
      await bumpFormVersion(config.id);
      showStatus('success', 'Field added');
      setAddingFieldToSection(null);
      setNewFieldLabel('');
      setNewFieldType('text');
      router.refresh();
    } else {
      showStatus('error', result.error || 'Failed to add field');
    }
    setSaving(false);
  };

  // ─── Add new section ───────────────────────────────────────

  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;

    const sectionKey = 'custom_' + newSectionTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    const maxOrder = Math.max(0, ...config.sections.map((s) => s.display_order));

    setSaving(true);
    const result = await addSection(config.id, {
      section_key: sectionKey,
      title: newSectionTitle.trim(),
      display_order: maxOrder + 1,
    });

    if (result.success) {
      await bumpFormVersion(config.id);
      showStatus('success', 'Section added');
      setAddingSection(false);
      setNewSectionTitle('');
      router.refresh();
    } else {
      showStatus('error', result.error || 'Failed to add section');
    }
    setSaving(false);
  };

  // ─── Section update ────────────────────────────────────────

  const handleSectionUpdate = async (sectionId: string, updates: Record<string, unknown>) => {
    setSaving(true);
    const result = await updateSection(sectionId, updates);
    if (result.success) {
      await bumpFormVersion(config.id);
      showStatus('success', 'Section updated');
      router.refresh();
    } else {
      showStatus('error', result.error || 'Failed to update section');
    }
    setSaving(false);
  };

  // ─── Move field up/down ────────────────────────────────────

  const handleMoveField = async (sectionId: string, fieldIdx: number, direction: 'up' | 'down') => {
    const section = config.sections.find((s) => s.id === sectionId);
    if (!section) return;

    const fields = [...section.fields];
    const swapIdx = direction === 'up' ? fieldIdx - 1 : fieldIdx + 1;
    if (swapIdx < 0 || swapIdx >= fields.length) return;

    // Swap display_order values
    const orders = fields.map((f, idx) => ({
      id: f.id,
      display_order: idx === fieldIdx ? fields[swapIdx].display_order : idx === swapIdx ? fields[fieldIdx].display_order : f.display_order,
    }));

    setSaving(true);
    const result = await reorderFields(sectionId, orders);
    if (result.success) {
      await bumpFormVersion(config.id);
      router.refresh();
    }
    setSaving(false);
  };

  // ─── Move section up/down ──────────────────────────────────

  const handleMoveSection = async (sectionIdx: number, direction: 'up' | 'down') => {
    const sections = [...config.sections];
    const swapIdx = direction === 'up' ? sectionIdx - 1 : sectionIdx + 1;
    if (swapIdx < 0 || swapIdx >= sections.length) return;

    const orders = sections.map((s, idx) => ({
      id: s.id,
      display_order: idx === sectionIdx ? sections[swapIdx].display_order : idx === swapIdx ? sections[sectionIdx].display_order : s.display_order,
    }));

    setSaving(true);
    const result = await reorderSections(config.id, orders);
    if (result.success) {
      await bumpFormVersion(config.id);
      router.refresh();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {/* Status message */}
      {statusMessage && (
        <div
          className={`px-4 py-2 rounded-lg text-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Sections */}
      {config.sections.map((section, sectionIdx) => {
        const isExpanded = expandedSections.has(section.id);

        return (
          <div
            key={section.id}
            className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden"
          >
            {/* Section header */}
            <div
              className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-[#FAFBFC] transition-colors"
              onClick={() => toggleSection(section.id)}
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMoveSection(sectionIdx, 'up'); }}
                    disabled={sectionIdx === 0 || saving}
                    className="text-[#94A3B8] hover:text-[#253859] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMoveSection(sectionIdx, 'down'); }}
                    disabled={sectionIdx === config.sections.length - 1 || saving}
                    className="text-[#94A3B8] hover:text-[#253859] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#253859]">{section.title}</h3>
                    {section.is_repeatable && (
                      <Badge variant="outline" className="text-[10px]">Repeatable</Badge>
                    )}
                    {!section.is_visible && (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200">Hidden</Badge>
                    )}
                  </div>
                  <p className="text-xs text-[#94A3B8]">
                    {section.fields.length} field{section.fields.length !== 1 ? 's' : ''}
                    {section.description ? ` · ${section.description}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSectionUpdate(section.id, { is_visible: !section.is_visible });
                  }}
                  className="p-1.5 rounded hover:bg-[#F4F5F7] text-[#94A3B8] hover:text-[#253859]"
                  title={section.is_visible ? 'Hide section' : 'Show section'}
                >
                  {section.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-[#94A3B8]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
                )}
              </div>
            </div>

            {/* Expanded section content */}
            {isExpanded && (
              <div className="border-t border-[#E2E8F0] px-5 py-4 bg-[#FAFBFC]">
                {/* Field list */}
                <div className="space-y-2">
                  {section.fields.map((field, fieldIdx) => (
                    <FieldRow
                      key={field.id}
                      field={field}
                      isEditing={editingField === field.id}
                      onEdit={() => setEditingField(editingField === field.id ? null : field.id)}
                      onUpdate={(updates) => handleFieldUpdate(field.id, updates)}
                      onDelete={() => handleDeleteField(field.id)}
                      onMoveUp={() => handleMoveField(section.id, fieldIdx, 'up')}
                      onMoveDown={() => handleMoveField(section.id, fieldIdx, 'down')}
                      isFirst={fieldIdx === 0}
                      isLast={fieldIdx === section.fields.length - 1}
                      saving={saving}
                    />
                  ))}
                </div>

                {/* Add field button / form */}
                {addingFieldToSection === section.id ? (
                  <div className="mt-3 p-3 border border-[#E2E8F0] rounded-lg bg-white">
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <Label className="text-xs">Field Label</Label>
                        <Input
                          value={newFieldLabel}
                          onChange={(e) => setNewFieldLabel(e.target.value)}
                          placeholder="e.g. Middle Name"
                          className="h-8 mt-1"
                          autoFocus
                        />
                      </div>
                      <div className="w-40">
                        <Label className="text-xs">Type</Label>
                        <select
                          value={newFieldType}
                          onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                          className="flex h-8 w-full rounded-lg border border-input bg-input/30 px-2 py-1 text-sm mt-1"
                        >
                          {FIELD_TYPE_OPTIONS.map((t) => (
                            <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
                          ))}
                        </select>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddField(section.id)}
                        disabled={!newFieldLabel.trim() || saving}
                      >
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAddingFieldToSection(null);
                          setNewFieldLabel('');
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setAddingFieldToSection(section.id)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Field
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add section */}
      {addingSection ? (
        <div className="p-4 border border-dashed border-[#E2E8F0] rounded-xl bg-white">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-xs">Section Title</Label>
              <Input
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="e.g. Additional Information"
                className="h-8 mt-1"
                autoFocus
              />
            </div>
            <Button size="sm" onClick={handleAddSection} disabled={!newSectionTitle.trim() || saving}>
              Add Section
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAddingSection(false); setNewSectionTitle(''); }}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setAddingSection(true)}
          className="w-full border-dashed"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Section
        </Button>
      )}
    </div>
  );
}

// ─── Field Row Component ─────────────────────────────────────

interface FieldRowProps {
  field: FormFieldConfig;
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (updates: Record<string, unknown>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  saving: boolean;
}

function FieldRow({ field, isEditing, onEdit, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast, saving }: FieldRowProps) {
  const [editLabel, setEditLabel] = useState(field.label);
  const [editHelpText, setEditHelpText] = useState(field.help_text || '');
  const [editPlaceholder, setEditPlaceholder] = useState(field.placeholder || '');
  const [editRequired, setEditRequired] = useState(field.is_required);
  const [editGridCols, setEditGridCols] = useState(field.grid_columns);
  const [editOptions, setEditOptions] = useState(
    field.options ? JSON.stringify(field.options, null, 2) : ''
  );

  const handleSave = () => {
    const updates: Record<string, unknown> = {
      label: editLabel,
      help_text: editHelpText || null,
      placeholder: editPlaceholder || null,
      is_required: editRequired,
      grid_columns: editGridCols,
    };

    // Parse options if it's a select field
    if (field.field_type === 'select' && editOptions.trim()) {
      try {
        updates.options = JSON.parse(editOptions);
      } catch {
        // Ignore invalid JSON — keep existing options
      }
    }

    onUpdate(updates);
    onEdit(); // Close the editor
  };

  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white">
      {/* Compact field row */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Move buttons */}
        <div className="flex flex-col gap-0.5">
          <button onClick={onMoveUp} disabled={isFirst || saving} className="text-[#94A3B8] hover:text-[#253859] disabled:opacity-30 disabled:cursor-not-allowed">
            <ArrowUp className="w-2.5 h-2.5" />
          </button>
          <button onClick={onMoveDown} disabled={isLast || saving} className="text-[#94A3B8] hover:text-[#253859] disabled:opacity-30 disabled:cursor-not-allowed">
            <ArrowDown className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Field info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#253859] truncate">{field.label}</span>
            {field.is_required && <span className="text-red-400 text-xs">*</span>}
            <Badge variant="outline" className="text-[10px] shrink-0">
              {FIELD_TYPE_LABELS[field.field_type] || field.field_type}
            </Badge>
            {field.is_custom && (
              <Badge className="text-[10px] bg-[#01A0FF]/10 text-[#01A0FF] border-[#01A0FF]/20 shrink-0">
                Custom
              </Badge>
            )}
            {!field.is_visible && (
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 shrink-0">
                Hidden
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-[#94A3B8] truncate">
            {field.field_key}
            {field.db_column ? ` → ${field.db_column}` : ' (custom_data)'}
            {field.grid_columns > 1 ? ` · ${field.grid_columns}/3 width` : ''}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onUpdate({ is_visible: !field.is_visible })}
            className="p-1.5 rounded hover:bg-[#F4F5F7] text-[#94A3B8] hover:text-[#253859]"
            title={field.is_visible ? 'Hide field' : 'Show field'}
          >
            {field.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 rounded hover:bg-[#F4F5F7] text-[#94A3B8] hover:text-[#253859]"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {field.is_custom && (
            <button
              onClick={onDelete}
              disabled={saving}
              className="p-1.5 rounded hover:bg-red-50 text-[#94A3B8] hover:text-red-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded editor */}
      {isEditing && (
        <div className="border-t border-[#E2E8F0] px-4 py-3 bg-[#FAFBFC] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Label</Label>
              <Input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="h-8 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Placeholder</Label>
              <Input
                value={editPlaceholder}
                onChange={(e) => setEditPlaceholder(e.target.value)}
                className="h-8 mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Help Text</Label>
            <Input
              value={editHelpText}
              onChange={(e) => setEditHelpText(e.target.value)}
              className="h-8 mt-1"
              placeholder="Displayed below the field"
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={editRequired}
                onCheckedChange={setEditRequired}
                size="sm"
              />
              <Label className="text-xs">Required</Label>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Width</Label>
              <select
                value={editGridCols}
                onChange={(e) => setEditGridCols(Number(e.target.value))}
                className="h-7 rounded-lg border border-input bg-input/30 px-2 text-xs"
              >
                <option value={1}>1/3</option>
                <option value={2}>2/3</option>
                <option value={3}>Full</option>
              </select>
            </div>
          </div>

          {/* Options editor for select fields */}
          {field.field_type === 'select' && (
            <div>
              <Label className="text-xs">Options (JSON array of {'{value, label}'} objects)</Label>
              <Textarea
                value={editOptions}
                onChange={(e) => setEditOptions(e.target.value)}
                className="mt-1 font-mono text-xs"
                rows={4}
                placeholder='[{"value": "opt1", "label": "Option 1"}]'
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="ghost" onClick={onEdit}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-3.5 h-3.5 mr-1" />
              Save Changes
            </Button>
          </div>

          {!field.is_custom && (
            <p className="text-[11px] text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Built-in field — editing label/visibility is safe, but changing field_key or type may break data mapping.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
