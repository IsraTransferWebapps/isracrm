'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { OnboardingSession, ClientType } from '@/types/database';

interface OnboardingAuthContextType {
  user: User | null;
  session: OnboardingSession | null;
  clientId: string | null;
  clientType: ClientType | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const OnboardingAuthContext = createContext<OnboardingAuthContextType | undefined>(undefined);

export function OnboardingAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchSession = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('onboarding_sessions')
      .select('*')
      .eq('auth_user_id', userId)
      .single();

    setSession(data as OnboardingSession | null);
  }, [supabase]);

  useEffect(() => {
    let ignore = false;

    const initialize = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (ignore) return;

      setUser(authUser);
      if (authUser) {
        await fetchSession(authUser.id);
      }
      setLoading(false);
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
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

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, [supabase, fetchSession]);

  const signOut = async () => {
    await supabase.auth.signOut();
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
