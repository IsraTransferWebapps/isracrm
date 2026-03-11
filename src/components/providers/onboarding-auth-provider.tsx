'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { OnboardingSession, ClientType } from '@/types/database';

interface OnboardingAuthContextType {
  user: User | null;
  session: OnboardingSession | null;
  clientId: string | null;
  clientType: ClientType | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const OnboardingAuthContext = createContext<OnboardingAuthContextType | undefined>(undefined);

export function OnboardingAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<OnboardingSession | null>(null);
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
