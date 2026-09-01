'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { UserProfile, UserRole } from '@/types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const supabase = createClient();

  const fetchProfile = async (userId: string, userEmail?: string) => {
    try {
      // First check localStorage cache for offline support (only in browser)
      let cachedProfile: string | null = null;
      if (typeof window !== 'undefined') {
        try {
          cachedProfile = localStorage.getItem(`user_profile_${userId}`);
          if (cachedProfile) {
            const parsed = JSON.parse(cachedProfile);
            setProfile(parsed);
          }
        } catch (e) {
          console.error('Failed to parse cached profile:', e);
        }
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          department:departments(id, name)
        `)
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Error fetching profile:', error);
        // If we have a cached profile, keep using it (offline mode)
        if (cachedProfile) {
          return;
        }
        // Only clear profile if fetch fails and no cache exists
        setProfile(null);
        return;
      }

      const profileData: UserProfile = {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role as UserRole,
        company_id: data.company_id,
        department_id: data.department_id,
        department_name: (data.department as any)?.name || 'General',
        manager_id: data.manager_id,
        position: data.position,
        phone: data.phone,
        avatar_url: data.avatar_url,
        join_date: data.join_date || '2026-01-01',
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
      
      setProfile(profileData);
      
      // Cache profile for offline support (only in browser)
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`user_profile_${data.id}`, JSON.stringify(profileData));
        } catch (e) {
          console.error('Failed to cache profile:', e);
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      // Try to use cached profile if available (only in browser)
      if (typeof window !== 'undefined') {
        try {
          const cachedProfile = localStorage.getItem(`user_profile_${userId}`);
          if (cachedProfile) {
            setProfile(JSON.parse(cachedProfile));
          }
        } catch (e) {
          console.error('Failed to parse cached profile:', e);
        }
      }
    }
  };

  useEffect(() => {
    // Initial session check
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('Session check error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email);
        } else {
          setUser(null);
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setIsLoading(false);
        return { error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user.id, data.user.email);
      }

      setIsLoading(false);
      return {};
    } catch (err: any) {
      setIsLoading(false);
      return { error: err.message || 'An unexpected error occurred during sign in.' };
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    
    // Clear cached profile from localStorage (only in browser)
    if (typeof window !== 'undefined' && user?.id) {
      try {
        localStorage.removeItem(`user_profile_${user.id}`);
      } catch (e) {
        console.error('Failed to clear cached profile:', e);
      }
    }
    
    setUser(null);
    setProfile(null);
    setIsLoading(false);
    router.push('/login');
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
