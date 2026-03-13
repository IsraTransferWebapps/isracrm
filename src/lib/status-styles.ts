// Shared status badge styles for deals, transfers, and client statuses.
// Used by both the CRM and client portal.

export interface StatusStyle {
  bg: string;
  text: string;
  dot: string;
  label: string;
}

export const DEAL_STATUS_STYLES: Record<string, StatusStyle> = {
  quoted: { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400', label: 'Quoted' },
  booked: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400', label: 'Booked' },
  funds_received: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400', label: 'Funds Received' },
  funds_sent: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400', label: 'Funds Sent' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'Completed' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400', label: 'Cancelled' },
};

export const DEAL_TYPE_STYLES: Record<string, StatusStyle> = {
  spot: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400', label: 'Spot' },
  forward: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400', label: 'Forward' },
  same_day: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-400', label: 'Same Day' },
};

export const TRANSFER_TYPE_STYLES: Record<string, StatusStyle> = {
  funds_received: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'Deposit' },
  funds_sent: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400', label: 'Withdrawal' },
  fee_charged: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400', label: 'Fee' },
  adjustment: { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400', label: 'Adjustment' },
};

export const CLIENT_STATUS_STYLES: Record<string, StatusStyle> = {
  prospect: { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400', label: 'Prospect' },
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'Active' },
  dormant: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400', label: 'Dormant' },
  suspended: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400', label: 'Suspended' },
  closed: { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400', label: 'Closed' },
};
