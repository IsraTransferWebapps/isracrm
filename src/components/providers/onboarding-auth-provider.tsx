'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { OnboardingSession, ClientType, ClientStatus } from '@/types/database';

interface OnboardingAuthContextType {
  user: User | null;
  session: OnboardingSession | null;
  clientId: string | null;
  clientType: ClientType | null;
  clientStatus: ClientStatus | null;
  clientName: string | null;
  accountManagerId: string | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const OnboardingAuthContext = createContext<OnboardingAuthContextType | undefined>(undefined);

export function OnboardingAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [clientStatus, setClientStatus] = useState<ClientStatus | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [accountManagerId, setAccountManagerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the Supabase client so the reference is stable across renders
  const supabase = useMemo(() => createClient(), []);

  const fetchSession = useCallback(async (userId: string) => {
    try {
      const { data, error: queryError } = await supabase
        .from('onboarding_sessions')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      if (queryError) {
        console.error('Failed to fetch onboarding session:', queryError);
        // Don't crash — just leave session as null
        return;
      }

      setSession(data as OnboardingSession | null);

      // Fetch client record for portal access gating
      if (data?.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select(`
            status,
            assigned_account_manager_id,
            client_type,
            individual_details (first_name, last_name, title),
            corporate_details (company_name)
          `)
          .eq('id', data.client_id)
          .single();

        if (clientData) {
          setClientStatus(clientData.status as ClientStatus);
          setAccountManagerId(clientData.assigned_account_manager_id);
          // Derive display name
          if (clientData.client_type === 'corporate' && clientData.corporate_details) {
            const corp = Array.isArray(clientData.corporate_details)
              ? clientData.corporate_details[0]
              : clientData.corporate_details;
            setClientName(corp?.company_name ?? null);
          } else if (clientData.individual_details) {
            const ind = Array.isArray(clientData.individual_details)
              ? clientData.individual_details[0]
              : clientData.individual_details;
            setClientName(
              [ind?.title, ind?.first_name, ind?.last_name].filter(Boolean).join(' ') || null
            );
          }
        }
      }
    } catch (err) {
      console.error('Unexpected error fetching session:', err);
    }
  }, [supabase]);

  useEffect(() => {
    let ignore = false;

    const initialize = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (ignore) return;

        if (authError) {
          console.error('Auth getUser error:', authError);
          setError(authError.message);
          setLoading(false);
          return;
        }

        setUser(authUser);
        if (authUser) {
          await fetchSession(authUser.id);
        }
      } catch (err) {
        if (ignore) return;
        console.error('Unexpected auth initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize auth');
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    initialize();

    let subscription: { unsubscribe: () => void } | null = null;

    try {
      const { data } = supabase.auth.onAuthStateChange(
        async (_event, authSession) => {
          if (ignore) return;
          const authUser = authSession?.user ?? null;
          setUser(authUser);
          if (authUser) {
            await fetchSession(authUser.id);
          } else {
            setSession(null);
          }
          setLoading(false);
        }
      );
      subscription = data.subscription;
    } catch (err) {
      console.error('Failed to set up auth listener:', err);
    }

    return () => {
      ignore = true;
      subscription?.unsubscribe();
    };
  }, [supabase, fetchSession]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
    setUser(null);
    setSession(null);
    setClientStatus(null);
    setClientName(null);
    setAccountManagerId(null);
  };

  const refreshSession = async () => {
    if (user) {
      await fetchSession(user.id);
    }
  };

  return (
    <OnboardingAuthContext.Provider
      value={{
        user,
        session,
        clientId: session?.client_id ?? null,
        clientType: session?.client_type ?? null,
        clientStatus,
        clientName,
        accountManagerId,
        loading,
        error,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </OnboardingAuthContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingAuthContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingAuthProvider');
  }
  return context;
}
