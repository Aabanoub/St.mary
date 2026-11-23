'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useSiteLock } from '@/context/SiteLockContext';
import { Button } from '@/components/ui/Button';
import { Lock, Clock, LogOut, RefreshCw, PhoneCall, ShieldCheck } from 'lucide-react';

export function SiteLockScreen() {
  const { user, profile, role, signOut } = useAuth();
  const { lockConfig, isLoadingLock } = useSiteLock();

  if (isLoadingLock) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#fbf8f5] dark:bg-[#18120e] flex flex-col justify-between p-4 sm:p-6 lg:p-8 selection:bg-amber-200">
      {/* Top Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-brown-200/60 dark:border-brown-900/40">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-brown-700 flex items-center justify-center p-2 shadow-warm">
            <Image
              src="/icons/icon.svg"
              alt="شعار كنيسة العذراء مريم"
              width={32}
              height={32}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-brown-950 dark:text-brown-50 leading-tight">
              كنيسة السيدة العذراء مريم
            </h1>
            <p className="text-xs font-semibold text-brown-600 dark:text-brown-400">
              خدمة إعداد الخدام
            </p>
          </div>
        </div>

        {user ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-brown-600 dark:text-brown-400 hidden sm:inline">
              مرحباً {profile?.full_name}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut()}
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
              className="text-xs cursor-pointer border-brown-300 dark:border-brown-700"
            >
              تسجيل الخروج
            </Button>
          </div>
        ) : (
          <Link href="/login">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-amber-600" />}
              className="text-xs font-bold border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
            >
              دخول المشرف العام
            </Button>
          </Link>
        )}
      </header>

      {/* Main Lock Content Card */}
      <main className="max-w-2xl w-full mx-auto my-auto py-10 px-4">
        <div className="bg-white dark:bg-[#231b15] rounded-3xl p-6 sm:p-10 border border-brown-200/80 dark:border-brown-800/80 shadow-warm-lg text-center space-y-6 relative overflow-hidden">
          {/* Subtle Golden Glow Background Accent */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-amber-400/10 dark:bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />

          {/* Icon Badge */}
          <div className="relative inline-flex items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-700 to-amber-500 text-white flex items-center justify-center shadow-warm-lg ring-8 ring-amber-100/70 dark:ring-amber-950/50">
              <Lock className="w-10 h-10 stroke-[2.2]" />
            </div>
          </div>

          {/* Status Badge */}
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 text-xs font-bold border border-amber-300 dark:border-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping inline-block" />
              وضع الصيانة والتحديث المؤقت
            </span>
          </div>

          {/* Customizable Title */}
          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-brown-950 dark:text-brown-50 leading-tight">
              {lockConfig.title || 'الموقع مغلق مؤقتاً لأعمال الصيانة والتطوير'}
            </h2>

            {/* Customizable Message */}
            <p className="text-sm sm:text-base text-brown-700 dark:text-brown-300 leading-relaxed max-w-xl mx-auto whitespace-pre-line">
              {lockConfig.message ||
                'أحباءنا في خدمة إعداد خدام، نعتذر عن هذا التوقف المؤقت. نقوم بتحديث وتطوير المنصة لتقديم أفضل تجربة ممكنة. سنعود للعمل قريباً جداً بنعمة ربنا.'}
            </p>
          </div>

          {/* Estimated Return Time (if provided) */}
          {lockConfig.estimated_unlock_time && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-brown-50 dark:bg-brown-900/40 border border-brown-200 dark:border-brown-800 text-brown-900 dark:text-brown-200 text-xs font-bold">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>الموعد المتوقع للعودة:</span>
              <span className="text-amber-700 dark:text-amber-400 font-extrabold font-mono">
                {lockConfig.estimated_unlock_time}
              </span>
            </div>
          )}

          {/* Emergency Contact (if provided) */}
          {lockConfig.contact_info && (
            <div className="flex items-center justify-center gap-2 text-xs text-brown-600 dark:text-brown-400">
              <PhoneCall className="w-3.5 h-3.5 text-brown-500" />
              <span>للطوارئ والتواصل: <strong>{lockConfig.contact_info}</strong></span>
            </div>
          )}

          {/* Bible Verse */}
          <div className="pt-4 border-t border-brown-100 dark:border-brown-900/60">
            <blockquote className="text-xs sm:text-sm text-brown-600 dark:text-brown-400 italic">
              «تَوَكَّلْ عَلَى الرَّبِّ بِكُلِّ قَلْبِكَ، وَعَلَى فَهْمِكَ لاَ تَعْتَمِدْ»
              <span className="block text-[11px] not-italic font-bold text-brown-500 mt-0.5">
                (سفر الأمثال 3: 5)
              </span>
            </blockquote>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => window.location.reload()}
              leftIcon={<RefreshCw className="w-4 h-4" />}
              className="w-full sm:w-auto font-bold border-brown-300 dark:border-brown-700 hover:bg-brown-50 dark:hover:bg-brown-900/40 cursor-pointer"
            >
              إعادة فحص حالة الموقع ↻
            </Button>

            {!user && (
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<ShieldCheck className="w-4 h-4" />}
                  className="w-full font-bold bg-amber-700 hover:bg-amber-800 text-white cursor-pointer"
                >
                  تسجيل دخول المسؤولين
                </Button>
              </Link>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto pt-6 text-center text-xs text-brown-500 border-t border-brown-200/60 dark:border-brown-900/40">
        كنيسة السيدة العذراء مريم - خدمة إعداد الخدام
      </footer>
    </div>
  );
}
