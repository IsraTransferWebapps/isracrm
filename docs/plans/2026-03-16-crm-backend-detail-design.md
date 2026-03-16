# CRM Backend Detail — Design Document

**Date:** 2026-03-16
**Status:** Approved

## Overview

Enhancements to the staff CRM backend covering five areas: client pages, trades, deposits, withdrawals, and audit trail. The goal is to add missing fields, compliance workflows, and a full audit trail for all approvals and status changes.

## 1. Client Pages

### Database Changes

Add two columns to `clients`:

- `importance` — enum (`regular`, `vip`, `vvip`), default `regular`
- `assigned_salesperson_id` — FK to `user_profiles`, nullable

### Auto-Upgrade Logic

Trigger on `clients` when `total_lifetime_volume` is updated:

- ≥ $1,000,000 (100,000,000 in pence) → set importance to `vvip`
- ≥ $500,000 (50,000,000 in pence) → set importance to `vip`
- Never auto-downgrades

### UI Changes

**Header bar:** Add importance badge (gold VIP, purple VVIP, hidden for Regular).

**Subtitle:** Show salesperson alongside account manager: "Managed by Sarah Cohen · Sales: David Levy"

**Summary card:** Add Importance and Salesperson rows.

**Admin actions:** Gear/edit button (management role only) opening a dialog to change importance, assign salesperson, change account manager. Non-admin staff can view but not edit.

## 2. Trades

No changes needed. Current fields are sufficient: deal reference, type, sell/buy currency+amount, exchange rate, status, date. The `deals` table already has `status_history` (jsonb) for tracking changes.

## 3. Deposits (Funds Received)

### Database Changes

Add columns to `ledger_entries`:

- `receiving_bank` — enum (`mizrahi`, `bank_of_jerusalem`, `currencycloud`), nullable
- `takbul_number` — text, nullable
- `sender_bank_name` — text, nullable
- `sender_account_holder` — text, nullable
- `sender_iban` — text, nullable
- `sender_swift` — text, nullable

### UI Changes

Within the existing **Transfers tab**, split into two sections: Deposits (funds_received entries) and Withdrawals (funds_sent entries).

**Deposits section columns:**

- Date
- Amount & Currency
- Receiving Bank (Mizrahi / Bank of Jerusalem / CurrencyCloud)
- Takbul Number
- Sender Details (bank name, account holder, IBAN)
- Reference/Notes
- Linked Deal

**Actions:**

- Record new deposit — form with amount, currency, receiving bank, takbul number, sender bank details
- Allocate to deal — link a deposit to an existing trade
- All actions logged to audit trail

## 4. Withdrawals (Funds Sent)

### Database Changes

Add columns to `ledger_entries`:

- `compliance_status` — enum (`pending`, `approved`, `rejected`), nullable
- `compliance_approved_by` — FK to `user_profiles`, nullable
- `compliance_approved_at` — timestamp, nullable

### UI Changes

**Withdrawals section columns:**

- Date
- Amount & Currency
- Beneficiary (name, bank, IBAN/account)
- Linked Deal
- Compliance Status (pending / approved / rejected)
- Approved By (staff name)
- Approved At
- Reference/Notes

**Actions:**

- Record new withdrawal — form with amount, currency, select beneficiary, linked deal
- Approve/Reject — visible to compliance and admin roles only, opens confirmation dialog
- All status changes logged to audit trail

## 5. Audit Trail

### Database Changes

New `audit_trail` table:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| entity_type | text | 'client', 'deal', 'ledger_entry' |
| entity_id | uuid | FK to the relevant table |
| action | text | e.g. 'compliance_approved', 'status_changed', 'importance_changed' |
| old_value | text | Previous value (nullable) |
| new_value | text | New value |
| performed_by | uuid | FK to user_profiles |
| performed_at | timestamptz | Default now() |
| notes | text | Optional context |

### UI Changes

**Activity section** at the bottom of each client detail page:

- Chronological feed of all actions on that client and their related deals/transactions
- Filterable by action type
- Shows: who, what changed (old → new), when

### What Gets Logged

- Compliance approvals/rejections on withdrawals
- Client importance changes (manual and auto-upgrade)
- Account manager / salesperson assignment changes
- KYC status changes
- Any other status changes on deals or ledger entries

## Permissions Summary

| Action | Who can do it |
|--------|---------------|
| View client fields | All staff |
| Edit importance / salesperson / account manager | Management only |
| Record deposit | All staff |
| Record withdrawal | All staff |
| Approve/reject withdrawal | Compliance + Management |
| View audit trail | All staff |
