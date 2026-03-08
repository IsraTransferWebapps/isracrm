import type { UserRole } from '@/types/database';

// Define which routes each role can access
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  account_manager: ['/clients', '/deals', '/search', '/settings'],
  compliance_officer: ['/clients', '/compliance', '/search', '/settings'],
  management: ['/clients', '/deals', '/compliance', '/dashboard', '/search', '/settings'],
};

// Check if a role can access a given path
export function canAccessPath(role: UserRole | null, pathname: string): boolean {
  if (!role) return false;
  const allowedPaths = ROLE_PERMISSIONS[role];
  return allowedPaths.some((path) => pathname.startsWith(path));
}

// Get the default landing page for a role
export function getDefaultPath(role: UserRole): string {
  switch (role) {
    case 'management':
      return '/dashboard';
    case 'compliance_officer':
      return '/compliance';
    case 'account_manager':
    default:
      return '/clients';
  }
}

// Human-readable role labels
export const ROLE_LABELS: Record<UserRole, string> = {
  account_manager: 'Account Manager',
  compliance_officer: 'Compliance Officer',
  management: 'Management',
};

// Check if a role can see profit/margin data
export function canViewMargins(role: UserRole | null): boolean {
  return role === 'management';
}

// Check if a role can manage compliance data
export function canManageCompliance(role: UserRole | null): boolean {
  return role === 'compliance_officer' || role === 'management';
}

// Check if a role can create/book deals
export function canManageDeals(role: UserRole | null): boolean {
  return role === 'account_manager' || role === 'management';
}
