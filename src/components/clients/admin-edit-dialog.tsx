'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { logAuditEvent } from '@/lib/audit';
import type { ClientImportance } from '@/types/database';

interface AdminEditDialogProps {
  open: boolean;
  onClose: () => void;
  client: any;
  staffUserId: string;
  onSaved: () => void;
}

export function AdminEditDialog({ open, onClose, client, staffUserId, onSaved }: AdminEditDialogProps) {
  const [importance, setImportance] = useState<ClientImportance>(client.importance || 'regular');
  const [salespersonId, setSalespersonId] = useState<string>(client.assigned_salesperson_id || '');
  const [accountManagerId, setAccountManagerId] = useState<string>(client.assigned_account_manager_id || '');
  const [staffList, setStaffList] = useState<{ id: string; full_name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!open) return;
    // Reset form values when dialog opens
    setImportance(client.importance || 'regular');
    setSalespersonId(client.assigned_salesperson_id || '');
    setAccountManagerId(client.assigned_account_manager_id || '');

    const fetchStaff = async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .eq('is_active', true)
        .order('full_name');
      if (data) setStaffList(data);
    };
    fetchStaff();
  }, [open]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    const updates: Record<string, any> = {};
    const auditPromises: Promise<void>[] = [];

    if (importance !== (client.importance || 'regular')) {
      updates.importance = importance;
      auditPromises.push(logAuditEvent({
        entityType: 'client',
        entityId: client.id,
        action: 'importance_changed',
        oldValue: client.importance || 'regular',
        newValue: importance,
        performedBy: staffUserId,
      }));
    }

    if (salespersonId !== (client.assigned_salesperson_id || '')) {
      updates.assigned_salesperson_id = salespersonId || null;
      const oldName = client.salesperson?.full_name || 'Unassigned';
      const newName = staffList.find(s => s.id === salespersonId)?.full_name || 'Unassigned';
      auditPromises.push(logAuditEvent({
        entityType: 'client',
        entityId: client.id,
        action: 'salesperson_changed',
        oldValue: oldName,
        newValue: newName,
        performedBy: staffUserId,
      }));
    }

    if (accountManagerId !== (client.assigned_account_manager_id || '')) {
      updates.assigned_account_manager_id = accountManagerId || null;
      const oldName = client.account_manager?.full_name || 'Unassigned';
      const newName = staffList.find(s => s.id === accountManagerId)?.full_name || 'Unassigned';
      auditPromises.push(logAuditEvent({
        entityType: 'client',
        entityId: client.id,
        action: 'account_manager_changed',
        oldValue: oldName,
        newValue: newName,
        performedBy: staffUserId,
      }));
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('clients').update(updates).eq('id', client.id);
      await Promise.all(auditPromises);
    }

    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md space-y-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-[16px] font-semibold text-[#253859]">Edit Client Settings</h2>

        {/* Importance */}
        <div>
          <label className="text-[12px] font-medium text-[#717D93] block mb-1.5">Importance</label>
          <select
            value={importance}
            onChange={(e) => setImportance(e.target.value as ClientImportance)}
            className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-[13px] text-[#253859] bg-white"
          >
            <option value="regular">Regular</option>
            <option value="vip">VIP</option>
            <option value="vvip">VVIP</option>
          </select>
        </div>

        {/* Account Manager / CSR */}
        <div>
          <label className="text-[12px] font-medium text-[#717D93] block mb-1.5">Account Manager / CSR</label>
          <select
            value={accountManagerId}
            onChange={(e) => setAccountManagerId(e.target.value)}
            className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-[13px] text-[#253859] bg-white"
          >
            <option value="">Unassigned</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
        </div>

        {/* Salesperson */}
        <div>
          <label className="text-[12px] font-medium text-[#717D93] block mb-1.5">Salesperson</label>
          <select
            value={salespersonId}
            onChange={(e) => setSalespersonId(e.target.value)}
            className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-[13px] text-[#253859] bg-white"
          >
            <option value="">Unassigned</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="text-[12px]">Cancel</Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-[#01A0FF] hover:bg-[#0090e6] text-white text-[12px]"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
