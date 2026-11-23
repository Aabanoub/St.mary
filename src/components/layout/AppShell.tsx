'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useAuth } from '@/context/AuthContext';
import { useSiteLock } from '@/context/SiteLockContext';
import { SiteLockScreen } from './SiteLockScreen';
import { Loader2, Lock } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isLoading, user, role } = useAuth();
  const { lockConfig, isAccessBlocked, quickToggleLock } = useSiteLock();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fbf8f5] dark:bg-[#18120e]">
        <div className="w-16 h-16 rounded-2xl bg-brown-700 flex items-center justify-center mb-4 shadow-warm-lg animate-pulse">
          <Loader2 className="w-8 h-8 text-amber-300 animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-brown-950 dark:text-brown-50">
          كنيسة السيدة العذراء مريم
        </h2>
        <p className="text-xs text-brown-600 dark:text-brown-400 mt-1">
          جاري تحميل بيانات الخدمة...
        </p>
      </div>
    );
  }

  // If site is locked and current user is blocked, render lock screen
  if (isAccessBlocked) {
    return <SiteLockScreen />;
  }

  // If user is not authenticated, render without shell (e.g. login)
  if (!user) {
    return <>{children}</>;
  }

  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin';

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf8f5] dark:bg-[#18120e]">
      {/* Super Admin Persistent Site Lock Alert Banner */}
      {isSuperAdmin && lockConfig.is_locked && (
        <div className="bg-amber-600 dark:bg-amber-700 text-white px-4 py-2 text-xs sm:text-sm font-bold flex flex-wrap items-center justify-between gap-2 shadow-sm sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 animate-pulse shrink-0" />
            <span>الموقع مقفل حالياً أمام المخدومين ({lockConfig.title})</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/system-lock"
              className="underline hover:text-amber-100 transition-colors"
            >
              إدارة إعدادات ورسالة القفل
            </Link>
            <button
              onClick={() => quickToggleLock(false)}
              className="px-2.5 py-1 bg-white text-amber-900 rounded-lg text-xs font-bold hover:bg-amber-50 cursor-pointer transition-colors shadow-xs"
            >
              إلغاء القفل وفتح الموقع
            </button>
          </div>
        </div>
      )}

      {/* Admin Info Banner when site is locked but admins are allowed */}
      {isAdmin && lockConfig.is_locked && lockConfig.allow_admins && (
        <div className="bg-amber-700/90 text-amber-50 px-4 py-2 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>تنبيه: الموقع مغلق حالياً أمام المخدومين ({lockConfig.title}). تم السماح لك بالدخول بصفتك خادماً/مشرفاً.</span>
          </div>
        </div>
      )}

      <Navbar />
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 w-full overflow-x-hidden">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

