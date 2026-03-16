import { createClient } from '@/lib/supabase/client';

interface AuditLogParams {
  entityType: string;
  entityId: string;
  action: string;
  oldValue?: string | null;
  newValue?: string | null;
  performedBy: string;
  notes?: string | null;
}

/**
 * Log an action to the audit trail.
 * Call this from client components after any status change, approval, or assignment change.
 */
export async function logAuditEvent({
  entityType,
  entityId,
  action,
  oldValue = null,
  newValue = null,
  performedBy,
  notes = null,
}: AuditLogParams) {
  const supabase = createClient();
  const { error } = await supabase.from('audit_trail').insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    old_value: oldValue,
    new_value: newValue,
    performed_by: performedBy,
    notes,
  });

  if (error) {
    console.error('Failed to log audit event:', error);
  }
}
