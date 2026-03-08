'use client';

import { createContext, useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { UserProfile, UserRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Stable Supabase client reference — only create once
  const supabase = useMemo(() => createClient(), []);

  // Fetch profile helper — not wrapped in useCallback to avoid
  // dependency chain issues. Called only from the main effect.
  const fetchProfileForUser = async (userId: string, ignore: boolean) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!ignore && data) {
      setProfile(data as UserProfile);
    }
    if (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    // Local ignore flag — works correctly with React 18 strict mode.
    let ignore = false;

    // We rely entirely on onAuthStateChange which fires INITIAL_SESSION
    // automatically. This avoids calling getSession() which can deadlock
    // with navigator.locks in React strict mode + singleton client.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (ignore) return;

      if (session?.user) {
        setUser(session.user);
        await fetchProfileForUser(session.user.id, ignore);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data as UserProfile);
      }
      if (error) {
        console.error('Error refreshing profile:', error);
      }
    }
  }, [user?.id, supabase]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role ?? null,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
