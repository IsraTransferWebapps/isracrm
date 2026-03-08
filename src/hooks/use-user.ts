'use client';

import { useContext } from 'react';
import { AuthContext } from '@/components/providers/auth-provider';

// Hook to access the current authenticated user and their profile
export function useUser() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useUser must be used within an AuthProvider');
  }
  return context;
}
