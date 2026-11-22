'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase/client';
import {
  Bell,
  Sun,
  Moon,
  LogOut,
  QrCode,
  ShieldCheck,
  Download,
  User as UserIcon,
} from 'lucide-react';
import { getRoleBadgeConfig } from '@/lib/utils/formatters';
import { usePwaInstall } from '@/hooks/usePwaInstall';

export function Navbar() {
  const { profile, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isInstalled } = usePwaInstall();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile) return;

    // Fetch unread notifications count
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notification_recipients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);

      setUnreadCount(count || 0);
    };

    fetchUnread();

    // Listen to changes
    const channel = supabase
      .channel('navbar_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_recipients',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          fetchUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const roleBadge = getRoleBadgeConfig(role || 'user');

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#1f1712]/95 backdrop-blur border-b border-brown-200/80 dark:border-brown-900/80 shadow-warm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Church Brand */}
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-brown-700 flex items-center justify-center p-1.5 shadow-sm group-hover:bg-brown-800 transition-colors">
            <Image
              src="/icons/icon.svg"
              alt="شعار كنيسة العذراء مريم"
              width={32}
              height={32}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-brown-950 dark:text-brown-50 text-base md:text-lg leading-tight">
              كنيسة السيدة العذراء مريم
            </span>
            <span className="text-xs font-semibold text-brown-600 dark:text-brown-400">
              إعداد خدام
            </span>
          </div>
        </Link>

        {/* User & Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Quick QR button for Users */}
          {role === 'user' && (
            <Link
              href="/attendance/my-qr"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-brown-100 hover:bg-brown-200 text-brown-900 dark:bg-brown-900/80 dark:hover:bg-brown-800 dark:text-brown-100 transition-colors"
            >
              <QrCode className="w-4 h-4 text-brown-700 dark:text-brown-300" />
              <span>كود الحضور</span>
            </Link>
          )}

          {/* Quick Scanner button for Admins */}
          {(role === 'admin' || role === 'super_admin') && (
            <Link
              href="/attendance/scan"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-brown-700 hover:bg-brown-800 text-white shadow-sm transition-colors"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">مسح QR</span>
            </Link>
          )}

          {/* Install App Quick Button (Hidden if already installed) */}
          {!isInstalled && (
            <button
              onClick={() => window.dispatchEvent(new Event('open-pwa-install'))}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 border border-amber-300/60 dark:border-amber-800/60 transition-colors cursor-pointer"
              title="تثبيت التطبيق على جهازك"
            >
              <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>تثبيت التطبيق</span>
            </button>
          )}

          {/* Notifications Link */}
          <Link
            href="/notifications"
            className="relative p-2 text-brown-700 dark:text-brown-300 hover:bg-brown-50 dark:hover:bg-brown-900/50 rounded-lg transition-colors"
            title="الإشعارات"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-rose-500 rounded-full px-1 shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-brown-700 dark:text-brown-300 hover:bg-brown-50 dark:hover:bg-brown-900/50 rounded-lg transition-colors cursor-pointer"
            title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
            aria-label="تبديل المظهر"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Profile Badge & Info */}
          {profile && (
            <div className="hidden md:flex items-center gap-2 pl-2 border-r border-brown-200 dark:border-brown-900/80 mr-1">
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-brown-950 dark:text-brown-50 max-w-[130px] truncate text-right">
                  {profile.full_name}
                </span>
                <span className="text-[10px] text-right text-brown-500 dark:text-brown-400">
                  {roleBadge.label}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-brown-200 dark:bg-brown-800 flex items-center justify-center text-brown-800 dark:text-brown-200 font-bold text-xs">
                {profile.full_name ? profile.full_name.charAt(0) : <UserIcon className="w-4 h-4" />}
              </div>
            </div>
          )}

          {/* Sign Out Button */}
          <button
            onClick={signOut}
            className="p-2 text-brown-600 dark:text-brown-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
