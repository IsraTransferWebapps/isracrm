# CRM Backend Detail Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add client importance/salesperson fields, deposit and withdrawal detail fields with compliance approval workflow, and a full audit trail.

**Architecture:** Database-first approach — add columns and tables via Supabase migrations, update TypeScript types, then build UI. Audit trail is a new table with a reusable insert helper. Compliance approval uses role-based permission checks already in `lib/roles.ts`.

**Tech Stack:** Next.js (App Router), Supabase (Postgres), React 19, Tailwind CSS v4, shadcn/ui

---

### Task 1: Database Migration — Client Fields

**Files:**
- Migration applied via Supabase MCP

**Step 1: Apply migration**

Run via `apply_migration` MCP tool with name `add_client_importance_and_salesperson`:

```sql
-- Importance enum
CREATE TYPE client_importance AS ENUM ('regular', 'vip', 'vvip');

-- Add columns to clients
ALTER TABLE public.clients
  ADD COLUMN importance client_importance NOT NULL DEFAULT 'regular',
  ADD COLUMN assigned_salesperson_id uuid REFERENCES public.user_profiles(id);

-- Index for salesperson lookups
CREATE INDEX idx_clients_salesperson ON public.clients(assigned_salesperson_id);

-- Auto-upgrade trigger: promote importance based on lifetime volume
-- Volume is stored in pence. $500k = 50,000,000 pence, $1m = 100,000,000 pence
CREATE OR REPLACE FUNCTION public.auto_upgrade_importance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_lifetime_volume >= 100000000 AND NEW.importance != 'vvip' THEN
    NEW.importance := 'vvip';
  ELSIF NEW.total_lifetime_volume >= 50000000 AND NEW.importance = 'regular' THEN
    NEW.importance := 'vip';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_upgrade_importance
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  WHEN (OLD.total_lifetime_volume IS DISTINCT FROM NEW.total_lifetime_volume)
  EXECUTE FUNCTION public.auto_upgrade_importance();
```

**Step 2: Verify**

Run via `execute_sql`: `SELECT column_name FROM information_schema.columns WHERE table_name = 'clients' AND column_name IN ('importance', 'assigned_salesperson_id');`

Expected: 2 rows returned.

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add importance and salesperson columns to clients table"
```

---

### Task 2: Database Migration — Deposit Fields

**Files:**
- Migration applied via Supabase MCP

**Step 1: Apply migration**

Run via `apply_migration` MCP tool with name `add_deposit_fields`:

```sql
-- Receiving bank enum
CREATE TYPE receiving_bank AS ENUM ('mizrahi', 'bank_of_jerusalem', 'currencycloud');

-- Add deposit-specific columns to ledger_entries
ALTER TABLE public.ledger_entries
  ADD COLUMN receiving_bank receiving_bank,
  ADD COLUMN takbul_number text,
  ADD COLUMN sender_bank_name text,
  ADD COLUMN sender_account_holder text,
  ADD COLUMN sender_iban text,
  ADD COLUMN sender_swift text;
```

**Step 2: Verify**

Run via `execute_sql`: `SELECT column_name FROM information_schema.columns WHERE table_name = 'ledger_entries' AND column_name IN ('receiving_bank', 'takbul_number', 'sender_bank_name');`

Expected: 3 rows returned.

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add deposit detail fields to ledger_entries table"
```

---

### Task 3: Database Migration — Withdrawal Fields

**Files:**
- Migration applied via Supabase MCP

**Step 1: Apply migration**

Run via `apply_migration` MCP tool with name `add_withdrawal_fields`:

```sql
-- Compliance status enum
CREATE TYPE compliance_status AS ENUM ('pending', 'approved', 'rejected');

-- Add withdrawal-specific columns to ledger_entries
ALTER TABLE public.ledger_entries
  ADD COLUMN compliance_status compliance_status,
  ADD COLUMN compliance_approved_by uuid REFERENCES public.user_profiles(id),
  ADD COLUMN compliance_approved_at timestamptz;
```

**Step 2: Verify**

Run via `execute_sql`: `SELECT column_name FROM information_schema.columns WHERE table_name = 'ledger_entries' AND column_name IN ('compliance_status', 'compliance_approved_by', 'compliance_approved_at');`

Expected: 3 rows returned.

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add withdrawal compliance fields to ledger_entries table"
```

---

### Task 4: Database Migration — Audit Trail Table

**Files:**
- Migration applied via Supabase MCP

**Step 1: Apply migration**

Run via `apply_migration` MCP tool with name `create_audit_trail`:

```sql
CREATE TABLE public.audit_trail (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  old_value text,
  new_value text,
  performed_by uuid REFERENCES public.user_profiles(id),
  performed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- Indexes for common queries
CREATE INDEX idx_audit_trail_entity ON public.audit_trail(entity_type, entity_id);
CREATE INDEX idx_audit_trail_performed_at ON public.audit_trail(performed_at DESC);
CREATE INDEX idx_audit_trail_performed_by ON public.audit_trail(performed_by);

-- RLS: staff can read all, insert only via service role or authenticated
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view audit trail"
  ON public.audit_trail FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert audit trail"
  ON public.audit_trail FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

**Step 2: Verify**

Run via `execute_sql`: `SELECT table_name FROM information_schema.tables WHERE table_name = 'audit_trail';`

Expected: 1 row returned.

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: create audit_trail table with RLS policies"
```

---

### Task 5: Update TypeScript Types

**Files:**
- Modify: `src/types/database.ts`

**Step 1: Add new types**

Add after the existing type definitions:

```typescript
// Client importance levels
export type ClientImportance = 'regular' | 'vip' | 'vvip';

// Receiving banks for deposits
export type ReceivingBank = 'mizrahi' | 'bank_of_jerusalem' | 'currencycloud';

// Compliance status for withdrawals
export type ComplianceStatus = 'pending' | 'approved' | 'rejected';

// Audit trail entry
export interface AuditTrailEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  performed_by: string | null;
  performed_at: string;
  notes: string | null;
  // Joined fields
  performer?: {
    full_name: string;
    email: string;
  };
}
```

**Step 2: Update the Client interface** (if it exists as an interface) or note that `client` is typed as `any` in the page component. Add `importance` and `assigned_salesperson_id` to any existing Client type.

**Step 3: Update the LedgerEntry interface** (if it exists) to include the new deposit and withdrawal fields:

```typescript
// Add to existing LedgerEntry or create if missing
export interface LedgerEntry {
  id: string;
  client_id: string;
  deal_id: string | null;
  entry_type: 'funds_received' | 'funds_sent' | 'fee_charged' | 'adjustment';
  currency: string;
  amount: number;
  running_balance: number;
  value_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  // Deposit fields
  receiving_bank: ReceivingBank | null;
  takbul_number: string | null;
  sender_bank_name: string | null;
  sender_account_holder: string | null;
  sender_iban: string | null;
  sender_swift: string | null;
  // Withdrawal fields
  compliance_status: ComplianceStatus | null;
  compliance_approved_by: string | null;
  compliance_approved_at: string | null;
}
```

**Step 4: Commit**

```bash
git add src/types/database.ts && git commit -m "feat: add TypeScript types for importance, deposits, withdrawals, and audit trail"
```

---

### Task 6: Add Role Permission Helpers

**Files:**
- Modify: `src/lib/roles.ts`

**Step 1: Add new permission functions**

```typescript
// Check if a role can edit client admin fields (importance, salesperson, account manager)
export function canEditClientAdmin(role: UserRole | null): boolean {
  return role === 'management';
}

// Check if a role can approve/reject withdrawals
export function canApproveWithdrawals(role: UserRole | null): boolean {
  return role === 'compliance_officer' || role === 'management';
}
```

**Step 2: Commit**

```bash
git add src/lib/roles.ts && git commit -m "feat: add permission helpers for client admin and withdrawal approval"
```

---

### Task 7: Audit Trail Helper

**Files:**
- Create: `src/lib/audit.ts`

**Step 1: Create the audit helper**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/lib/audit.ts && git commit -m "feat: add audit trail logging helper"
```

---

### Task 8: Update Client Fetch Query

**Files:**
- Modify: `src/app/(dashboard)/clients/[id]/page.tsx`

**Step 1: Update the Supabase select query** (around line 324-330)

Change the client fetch to also join the salesperson:

```typescript
const { data } = await supabase
  .from('clients')
  .select(
    `
    *,
    individual_details (*),
    corporate_details (*),
    account_manager:user_profiles!clients_assigned_account_manager_id_fkey (id, full_name, email),
    salesperson:user_profiles!clients_assigned_salesperson_id_fkey (id, full_name, email)
  `
  )
  .eq('id', clientId)
  .single();
```

**Step 2: Commit**

```bash
git add src/app/(dashboard)/clients/[id]/page.tsx && git commit -m "feat: include salesperson join in client fetch query"
```

---

### Task 9: Client Header — Importance Badge & Salesperson

**Files:**
- Modify: `src/app/(dashboard)/clients/[id]/page.tsx`

**Step 1: Add importance style map** (near the other status maps, around line 57-78)

```typescript
const IMPORTANCE_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  regular: { bg: 'bg-[#F4F5F7]', text: 'text-[#717D93]', dot: 'bg-[#CBD5E1]' },
  vip: { bg: 'bg-[#fffbeb]', text: 'text-[#d97706]', dot: 'bg-[#f59e0b]' },
  vvip: { bg: 'bg-[#f5f3ff]', text: 'text-[#7c3aed]', dot: 'bg-[#8b5cf6]' },
};
```

**Step 2: Add importance badge to header** (around line 428, after the risk rating pill)

```tsx
{client.importance !== 'regular' && (
  <StatusPill
    {...(IMPORTANCE_MAP[client.importance] || IMPORTANCE_MAP.regular)}
    label={client.importance.toUpperCase()}
  />
)}
```

**Step 3: Update subtitle** (around line 433) to show salesperson

```tsx
<p className="text-[13px] text-[#717D93]">
  <span className="capitalize">{client.client_type.replace(/_/g, ' ')}</span>
  {' · Managed by '}
  <span className="text-[#42526E]">{client.account_manager?.full_name || 'Unassigned'}</span>
  {client.salesperson && (
    <>
      {' · Sales: '}
      <span className="text-[#42526E]">{client.salesperson.full_name}</span>
    </>
  )}
</p>
```

**Step 4: Add importance and salesperson to summary card** (around line 540-545, add new rows)

```typescript
{ label: 'Importance', value: (client.importance || 'regular').toUpperCase() },
{ label: 'Salesperson', value: client.salesperson?.full_name || 'Unassigned' },
```

**Step 5: Commit**

```bash
git add src/app/(dashboard)/clients/[id]/page.tsx && git commit -m "feat: add importance badge and salesperson to client header"
```

---

### Task 10: Admin Edit Dialog for Client Fields

**Files:**
- Create: `src/components/clients/admin-edit-dialog.tsx`
- Modify: `src/app/(dashboard)/clients/[id]/page.tsx`

**Step 1: Create the admin edit dialog component**

Create `src/components/clients/admin-edit-dialog.tsx`:

```tsx
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

    if (importance !== client.importance) {
      updates.importance = importance;
      auditPromises.push(logAuditEvent({
        entityType: 'client',
        entityId: client.id,
        action: 'importance_changed',
        oldValue: client.importance,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md space-y-5">
        <h2 className="text-[16px] font-semibold text-[#253859]">Edit Client Settings</h2>

        {/* Importance */}
        <div>
          <label className="text-[12px] font-medium text-[#717D93] block mb-1.5">Importance</label>
          <select
            value={importance}
            onChange={(e) => setImportance(e.target.value as ClientImportance)}
            className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-[13px] text-[#253859]"
          >
            <option value="regular">Regular</option>
            <option value="vip">VIP</option>
            <option value="vvip">VVIP</option>
          </select>
        </div>

        {/* Account Manager */}
        <div>
          <label className="text-[12px] font-medium text-[#717D93] block mb-1.5">Account Manager / CSR</label>
          <select
            value={accountManagerId}
            onChange={(e) => setAccountManagerId(e.target.value)}
            className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-[13px] text-[#253859]"
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
            className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-[13px] text-[#253859]"
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
```

**Step 2: Add the dialog trigger to the client page**

In `src/app/(dashboard)/clients/[id]/page.tsx`:

- Import: `import { AdminEditDialog } from '@/components/clients/admin-edit-dialog';`
- Import: `import { canEditClientAdmin } from '@/lib/roles';`
- Import icon: Add `Settings` to the lucide imports
- Add state: `const [adminEditOpen, setAdminEditOpen] = useState(false);`
- Add the gear button in the header (next to the existing action buttons), visible only when `canEditClientAdmin(role)`:

```tsx
{canEditClientAdmin(role) && (
  <Button
    size="sm"
    variant="outline"
    onClick={() => setAdminEditOpen(true)}
    className="border-[#E2E8F0] text-[#717D93] hover:bg-[#F4F5F7] hover:text-[#253859] h-8 text-[12px]"
  >
    <Settings className="h-3.5 w-3.5 mr-1.5" />
    Edit Settings
  </Button>
)}
```

- Add the dialog component at the end of the return JSX:

```tsx
<AdminEditDialog
  open={adminEditOpen}
  onClose={() => setAdminEditOpen(false)}
  client={client}
  staffUserId={profile?.id || ''}
  onSaved={() => {
    // Re-fetch client data
    window.location.reload();
  }}
/>
```

**Step 3: Commit**

```bash
git add src/components/clients/admin-edit-dialog.tsx src/app/(dashboard)/clients/[id]/page.tsx && git commit -m "feat: add admin edit dialog for importance, salesperson, and account manager"
```

---

### Task 11: Split Transfers Tab — Deposits Section

**Files:**
- Modify: `src/app/(dashboard)/clients/[id]/page.tsx`

**Step 1: Update the transfers fetch** to also join `compliance_approved_by` staff name

```typescript
const { data } = await supabase
  .from('ledger_entries')
  .select('*, approver:user_profiles!ledger_entries_compliance_approved_by_fkey(full_name)')
  .eq('client_id', clientId)
  .order('created_at', { ascending: false });
```

**Step 2: Replace the transfers tab content** with a split view

Split the existing single table into two sections using sub-tab toggles or stacked sections:

- A toggle row at the top: `Deposits | Withdrawals` (styled as sub-tabs within the Transfers tab)
- Default to showing Deposits
- Filter: deposits = entries where `entry_type === 'funds_received'`, withdrawals = entries where `entry_type === 'funds_sent'`

**Step 3: Deposits table columns:**

```tsx
<TableHead>Date</TableHead>
<TableHead>Amount</TableHead>
<TableHead>Receiving Bank</TableHead>
<TableHead>Takbul No.</TableHead>
<TableHead>Sender</TableHead>
<TableHead>Reference</TableHead>
<TableHead>Linked Deal</TableHead>
```

Display values:
- Receiving bank: capitalize and replace underscores (e.g. `bank_of_jerusalem` → `Bank of Jerusalem`)
- Sender: show `sender_bank_name` + truncated `sender_iban`
- Linked deal: show deal reference if `deal_id` is set

**Step 4: Commit**

```bash
git add src/app/(dashboard)/clients/[id]/page.tsx && git commit -m "feat: split transfers tab with deposits section"
```

---

### Task 12: Record New Deposit Dialog

**Files:**
- Create: `src/components/clients/record-deposit-dialog.tsx`
- Modify: `src/app/(dashboard)/clients/[id]/page.tsx`

**Step 1: Create the deposit dialog**

Create `src/components/clients/record-deposit-dialog.tsx` with a form:
- Amount (number input)
- Currency (text input or select: GBP, USD, EUR, ILS)
- Receiving Bank (select: Mizrahi, Bank of Jerusalem, CurrencyCloud)
- Takbul Number (text input)
- Sender Bank Name (text input)
- Sender Account Holder (text input)
- Sender IBAN (text input)
- Sender SWIFT (text input)
- Notes (textarea)
- Link to Deal (optional select, populated from client's deals)

On save:
1. Insert into `ledger_entries` with `entry_type: 'funds_received'`
2. Log to audit trail: `{ entityType: 'ledger_entry', action: 'deposit_recorded' }`
3. Close dialog and refresh transfers list

**Step 2: Add "Record Deposit" button** to the deposits section in the transfers tab

**Step 3: Commit**

```bash
git add src/components/clients/record-deposit-dialog.tsx src/app/(dashboard)/clients/[id]/page.tsx && git commit -m "feat: add record deposit dialog with audit logging"
```

---

### Task 13: Withdrawals Section & Record Withdrawal Dialog

**Files:**
- Create: `src/components/clients/record-withdrawal-dialog.tsx`
- Modify: `src/app/(dashboard)/clients/[id]/page.tsx`

**Step 1: Add withdrawals table** in the transfers tab (below deposits or as second sub-tab)

Columns:
```tsx
<TableHead>Date</TableHead>
<TableHead>Amount</TableHead>
<TableHead>Beneficiary</TableHead>
<TableHead>Linked Deal</TableHead>
<TableHead>Compliance</TableHead>
<TableHead>Approved By</TableHead>
<TableHead>Reference</TableHead>
```

Compliance column shows a coloured pill:
- pending: gray
- approved: green
- rejected: red

**Step 2: Create the withdrawal dialog**

Create `src/components/clients/record-withdrawal-dialog.tsx` with a form:
- Amount (number input)
- Currency (select: GBP, USD, EUR, ILS)
- Beneficiary (select from client's saved beneficiaries — query `beneficiaries` table)
- Link to Deal (optional select)
- Notes (textarea)

On save:
1. Insert into `ledger_entries` with `entry_type: 'funds_sent'`, `compliance_status: 'pending'`
2. Log to audit trail: `{ entityType: 'ledger_entry', action: 'withdrawal_recorded' }`

**Step 3: Add "Record Withdrawal" button** to the withdrawals section

**Step 4: Commit**

```bash
git add src/components/clients/record-withdrawal-dialog.tsx src/app/(dashboard)/clients/[id]/page.tsx && git commit -m "feat: add withdrawals section and record withdrawal dialog"
```

---

### Task 14: Withdrawal Compliance Approval

**Files:**
- Modify: `src/app/(dashboard)/clients/[id]/page.tsx`

**Step 1: Add approve/reject buttons** to each withdrawal row where `compliance_status === 'pending'`

Only visible when `canApproveWithdrawals(role)` is true.

```tsx
{canApproveWithdrawals(role) && transfer.compliance_status === 'pending' && (
  <div className="flex gap-1">
    <Button size="sm" onClick={() => handleComplianceAction(transfer.id, 'approved')}
      className="bg-[#059669] hover:bg-[#047857] text-white h-6 text-[11px] px-2">
      Approve
    </Button>
    <Button size="sm" variant="outline" onClick={() => handleComplianceAction(transfer.id, 'rejected')}
      className="border-[#dc2626] text-[#dc2626] hover:bg-[#fef2f2] h-6 text-[11px] px-2">
      Reject
    </Button>
  </div>
)}
```

**Step 2: Implement `handleComplianceAction`**

```typescript
const handleComplianceAction = async (entryId: string, status: 'approved' | 'rejected') => {
  const { error } = await supabase
    .from('ledger_entries')
    .update({
      compliance_status: status,
      compliance_approved_by: profile?.id,
      compliance_approved_at: new Date().toISOString(),
    })
    .eq('id', entryId);

  if (!error) {
    await logAuditEvent({
      entityType: 'ledger_entry',
      entityId: entryId,
      action: `withdrawal_${status}`,
      oldValue: 'pending',
      newValue: status,
      performedBy: profile?.id || '',
    });

    // Refresh transfers
    setTransfers([]);
    // The useEffect will re-fetch
  }
};
```

**Step 3: Commit**

```bash
git add src/app/(dashboard)/clients/[id]/page.tsx && git commit -m "feat: add compliance approval/rejection for withdrawals"
```

---

### Task 15: Activity Feed (Audit Trail UI)

**Files:**
- Modify: `src/app/(dashboard)/clients/[id]/page.tsx`

**Step 1: Add audit trail state and fetch**

```typescript
const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
const [auditLoading, setAuditLoading] = useState(false);
```

Fetch audit trail in a useEffect (triggered when overview tab is active):

```typescript
useEffect(() => {
  if (activeTab !== 'overview') return;
  const fetchAudit = async () => {
    setAuditLoading(true);
    const { data } = await supabase
      .from('audit_trail')
      .select('*, performer:user_profiles!audit_trail_performed_by_fkey(full_name)')
      .eq('entity_type', 'client')
      .eq('entity_id', clientId)
      .order('performed_at', { ascending: false })
      .limit(50);
    if (data) setAuditTrail(data);
    setAuditLoading(false);
  };
  fetchAudit();
}, [activeTab, clientId]);
```

**Step 2: Add Activity section** at the bottom of the overview tab, below the KYC Compliance card

```tsx
{/* Activity Feed */}
<div className="lg:col-span-3 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
  <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8] mb-4">
    Recent Activity
  </h2>
  {auditLoading ? (
    <p className="text-[13px] text-[#717D93]">Loading...</p>
  ) : auditTrail.length === 0 ? (
    <p className="text-[13px] text-[#717D93]">No activity recorded yet</p>
  ) : (
    <div className="space-y-3">
      {auditTrail.map((entry) => (
        <div key={entry.id} className="flex items-start gap-3 py-2 border-b border-[#E2E8F0] last:border-0">
          <div className="w-2 h-2 rounded-full bg-[#01A0FF] mt-1.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-[#253859]">
              <span className="font-medium">{entry.performer?.full_name || 'System'}</span>
              {' '}
              {formatAuditAction(entry.action)}
              {entry.old_value && entry.new_value && (
                <span className="text-[#717D93]"> from {entry.old_value} to {entry.new_value}</span>
              )}
              {!entry.old_value && entry.new_value && (
                <span className="text-[#717D93]"> to {entry.new_value}</span>
              )}
            </p>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">{formatDate(entry.performed_at)}</p>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```

**Step 3: Add `formatAuditAction` helper** (above the component or inline)

```typescript
function formatAuditAction(action: string): string {
  const labels: Record<string, string> = {
    importance_changed: 'changed importance',
    salesperson_changed: 'changed salesperson',
    account_manager_changed: 'changed account manager',
    deposit_recorded: 'recorded a deposit',
    withdrawal_recorded: 'recorded a withdrawal',
    withdrawal_approved: 'approved a withdrawal',
    withdrawal_rejected: 'rejected a withdrawal',
    status_changed: 'changed status',
    kyc_status_changed: 'changed KYC status',
  };
  return labels[action] || action.replace(/_/g, ' ');
}
```

**Step 4: Commit**

```bash
git add src/app/(dashboard)/clients/[id]/page.tsx && git commit -m "feat: add activity feed showing audit trail on client overview"
```

---

### Task 16: Build Verification & Push

**Step 1: Run the build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 2: Fix any TypeScript or build errors**

**Step 3: Commit any fixes and push**

```bash
git push origin main
```
