'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Profile, UserRole, AdminPermission } from '@/types/database';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  permissions: Set<AdminPermission>;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (perm: AdminPermission) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  permissions: new Set(),
  isLoading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
  hasPermission: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<Set<AdminPermission>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchProfileAndPermissions = useCallback(async (userId: string) => {
    try {
      // 1. Fetch Profile
      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profError) {
        console.error('Error fetching profile:', profError);
        return;
      }

      setProfile(prof);

      // 2. If Admin, fetch permissions
      if (prof.role === 'admin') {
        const { data: perms } = await supabase
          .from('admin_permissions')
          .select('permission, granted, valid_until')
          .eq('admin_id', userId)
          .eq('granted', true);

        const permSet = new Set<AdminPermission>();
        perms?.forEach((p) => {
          if (!p.valid_until || new Date(p.valid_until) > new Date()) {
            permSet.add(p.permission as AdminPermission);
          }
        });
        setPermissions(permSet);
      } else if (prof.role === 'super_admin') {
        // Super admin has all permissions
        setPermissions(
          new Set<AdminPermission>([
            'scan_attendance',
            'view_attendance',
            'correct_attendance',
            'create_reading_plans',
            'edit_reading_plans',
            'view_reading_progress',
            'create_exams',
            'edit_exams',
            'view_exam_results',
            'send_notifications',
          ])
        );
      } else {
        setPermissions(new Set());
      }
    } catch (e) {
      console.error('Exception loading profile/permissions:', e);
    }
  }, []);

  useEffect(() => {
    let permChannel: ReturnType<typeof supabase.channel> | null = null;

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfileAndPermissions(currentUser.id).finally(() => {
          setIsLoading(false);
        });

        // Realtime listener for permission updates on this user
        permChannel = supabase
          .channel(`admin_perms_realtime_${currentUser.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'admin_permissions',
              filter: `admin_id=eq.${currentUser.id}`,
            },
            () => {
              fetchProfileAndPermissions(currentUser.id);
            }
          )
          .subscribe();
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfileAndPermissions(currentUser.id);
      } else {
        setProfile(null);
        setPermissions(new Set());
      }
      setIsLoading(false);
    });

    // Re-check permissions when switching back to this tab
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            fetchProfileAndPermissions(session.user.id);
          }
        });
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      subscription.unsubscribe();
      if (permChannel) supabase.removeChannel(permChannel);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [fetchProfileAndPermissions]);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileAndPermissions(user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setPermissions(new Set());
    router.push('/login');
  };

  const hasPermission = (perm: AdminPermission): boolean => {
    if (!profile) return false;
    if (profile.role === 'super_admin') return true;
    if (profile.role === 'admin') return permissions.has(perm);
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role ?? null,
        permissions,
        isLoading,
        refreshProfile,
        signOut,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
