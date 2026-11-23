'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { SiteLockConfig } from '@/types/database';

const DEFAULT_LOCK_CONFIG: SiteLockConfig = {
  is_locked: false,
  title: 'الموقع مغلق مؤقتاً لأعمال الصيانة والتطوير',
  message: 'أحباءنا في خدمة إعداد خدام، نعتذر عن هذا التوقف المؤقت. نقوم بتحديث النظام لتقديم تجربة روحية أفضل. سنعود للعمل قريباً جداً بنعمة ربنا وصلاواتكم.',
  allow_admins: false,
  estimated_unlock_time: '',
  contact_info: '',
};

interface SiteLockContextType {
  lockConfig: SiteLockConfig;
  isLoadingLock: boolean;
  isAccessBlocked: boolean;
  updateLockSettings: (newConfig: Partial<SiteLockConfig>) => Promise<{ success: boolean; error?: string }>;
  quickToggleLock: (shouldLock: boolean) => Promise<{ success: boolean; error?: string }>;
}

const SiteLockContext = createContext<SiteLockContextType>({
  lockConfig: DEFAULT_LOCK_CONFIG,
  isLoadingLock: true,
  isAccessBlocked: false,
  updateLockSettings: async () => ({ success: false }),
  quickToggleLock: async () => ({ success: false }),
});

export function SiteLockProvider({ children }: { children: React.ReactNode }) {
  const { role, profile } = useAuth();
  const [lockConfig, setLockConfig] = useState<SiteLockConfig>(DEFAULT_LOCK_CONFIG);
  const [isLoadingLock, setIsLoadingLock] = useState(true);

  const fetchLockSetting = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'site_lock')
        .maybeSingle();

      if (error) {
        console.warn('Error fetching site_lock setting:', error.message);
        return;
      }

      if (data && data.value) {
        setLockConfig({
          ...DEFAULT_LOCK_CONFIG,
          ...data.value,
        });
      }
    } catch (err) {
      console.error('Exception fetching site_lock:', err);
    } finally {
      setIsLoadingLock(false);
    }
  }, []);

  useEffect(() => {
    fetchLockSetting();

    // Subscribe to realtime changes on system_settings
    const channel = supabase
      .channel('realtime_site_lock')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings',
          filter: 'key=eq.site_lock',
        },
        (payload: any) => {
          if (payload.new && payload.new.value) {
            setLockConfig({
              ...DEFAULT_LOCK_CONFIG,
              ...payload.new.value,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLockSetting]);

  // Determine whether current user / visitor is blocked from accessing the site
  const isAccessBlocked = useMemo(() => {
    if (isLoadingLock || !lockConfig.is_locked) {
      return false;
    }

    // Super Admin is NEVER blocked
    if (role === 'super_admin') {
      return false;
    }

    // If allow_admins is enabled and the user is an admin, they are allowed
    if (role === 'admin' && lockConfig.allow_admins) {
      return false;
    }

    // All others (guests, makhdomeen/users, and admins when allow_admins=false) are blocked
    return true;
  }, [isLoadingLock, lockConfig, role]);

  const updateLockSettings = async (
    updates: Partial<SiteLockConfig>
  ): Promise<{ success: boolean; error?: string }> => {
    if (role !== 'super_admin') {
      return { success: false, error: 'غير مصرح: المشرف العام فقط يمكنه تغيير إعدادات قفل الموقع.' };
    }

    try {
      const mergedConfig: SiteLockConfig = {
        ...lockConfig,
        ...updates,
      };

      const { error } = await supabase
        .from('system_settings')
        .upsert(
          {
            key: 'site_lock',
            value: mergedConfig,
            updated_at: new Date().toISOString(),
            updated_by: profile?.id || null,
          },
          { onConflict: 'key' }
        );

      if (error) throw error;

      // Log into activity_logs
      await supabase.from('activity_logs').insert({
        actor_id: profile?.id || null,
        action: updates.is_locked !== undefined
          ? (updates.is_locked ? 'LOCK_SITE' : 'UNLOCK_SITE')
          : 'UPDATE_SITE_LOCK_CONFIG',
        entity_type: 'system_setting',
        entity_id: 'site_lock',
        details: mergedConfig,
      });

      setLockConfig(mergedConfig);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ الإعدادات';
      console.error('Error updating site_lock setting:', err);
      return { success: false, error: msg };
    }
  };

  const quickToggleLock = async (shouldLock: boolean) => {
    return updateLockSettings({ is_locked: shouldLock });
  };

  return (
    <SiteLockContext.Provider
      value={{
        lockConfig,
        isLoadingLock,
        isAccessBlocked,
        updateLockSettings,
        quickToggleLock,
      }}
    >
      {children}
    </SiteLockContext.Provider>
  );
}

export function useSiteLock() {
  const context = useContext(SiteLockContext);
  if (!context) {
    throw new Error('useSiteLock must be used within a SiteLockProvider');
  }
  return context;
}
