'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { normalizePhone, isValidEgyptianPhone } from '@/lib/utils/formatters';
import { Eye, EyeOff, Lock, Phone, AlertCircle, Loader2, Smartphone, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { useSiteLock } from '@/context/SiteLockContext';

export default function LoginPage() {
  const { isInstalled } = usePwaInstall();
  const { lockConfig } = useSiteLock();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError('يرجى إدخال رقم الهاتف المسجل.');
      return;
    }

    if (!isValidEgyptianPhone(normalized)) {
      setError('رقم الهاتف غير صحيح. يرجى إدخال رقم هاتف مصري صحيح (11 رقماً).');
      return;
    }

    if (!password) {
      setError('يرجى إدخال كلمة المرور.');
      return;
    }

    setIsLoading(true);

    try {
      // Map phone to internal church email format
      const email = `${normalized}@stmary.app`;

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('رقم الهاتف أو كلمة المرور غير صحيحة. يرجى التأكد والمحاولة مرة أخرى.');
        } else {
          setError(authError.message || 'حدث خطأ أثناء تسجيل الدخول.');
        }
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Fetch profile to check if user must change password & role
        const { data: profile } = await supabase
          .from('profiles')
          .select('must_change_password, is_active, role')
          .eq('id', data.user.id)
          .single();

        if (profile && !profile.is_active) {
          await supabase.auth.signOut();
          setError('تم تعطيل هذا الحساب. يرجى مراجعة إدارة الخدمة.');
          setIsLoading(false);
          return;
        }

        // If site is locked, verify permission
        if (lockConfig.is_locked) {
          const isAllowed = profile?.role === 'super_admin' || (profile?.role === 'admin' && lockConfig.allow_admins);
          if (!isAllowed) {
            await supabase.auth.signOut();
            setError(
              lockConfig.title
                ? `الموقع مغلق للصيانة حالياً: ${lockConfig.title}`
                : 'الموقع مغلق حالياً أمام المخدومين لأعمال الصيانة والتطوير.'
            );
            setIsLoading(false);
            return;
          }
        }

        if (profile?.must_change_password) {
          router.push('/change-password');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع.';
      setError(message);
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (quickPhone: string, quickPass: string) => {
    setPhone(quickPhone);
    setPassword(quickPass);
    setError(null);
    setIsLoading(true);

    try {
      const email = `${quickPhone}@stmary.app`;
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: quickPass,
      });

      if (authError) {
        setError(authError.message || 'حدث خطأ أثناء تسجيل الدخول.');
        setIsLoading(false);
        return;
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('must_change_password, is_active, role')
          .eq('id', data.user.id)
          .single();

        if (lockConfig.is_locked) {
          const isAllowed = profile?.role === 'super_admin' || (profile?.role === 'admin' && lockConfig.allow_admins);
          if (!isAllowed) {
            await supabase.auth.signOut();
            setError('الموقع مغلق حالياً أمام المخدومين لأعمال الصيانة والتطوير.');
            setIsLoading(false);
            return;
          }
        }

        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#fbf8f5] via-[#f5eee7] to-[#ebdcd0] dark:from-[#18120e] dark:via-[#22140c] dark:to-[#120b07]">
      <div className="w-full max-w-md bg-white dark:bg-[#231b15] border border-brown-200/90 dark:border-brown-900 rounded-3xl p-6 sm:p-8 shadow-warm-xl">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-brown-700 flex items-center justify-center p-2.5 shadow-warm-lg mb-4 ring-4 ring-brown-100 dark:ring-brown-900/60">
            <Image
              src="/icons/icon.svg"
              alt="شعار كنيسة السيدة العذراء مريم"
              width={64}
              height={64}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-brown-950 dark:text-brown-50 leading-tight">
            كنيسة السيدة العذراء مريم
          </h1>
          <p className="text-sm font-semibold text-brown-600 dark:text-brown-400 mt-1">
            خدمة إعداد خدام
          </p>
          <div className="w-16 h-1 bg-brown-500 rounded-full mt-3 opacity-60" />
        </div>

        {/* Site Lock Notification Banner */}
        {lockConfig.is_locked && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-200">
            <div className="flex items-center gap-2 font-black mb-1 text-amber-900 dark:text-amber-100">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>وضع الصيانة مفعل: {lockConfig.title}</span>
            </div>
            <p className="leading-relaxed text-amber-800 dark:text-amber-300">
              {lockConfig.allow_admins
                ? 'الموقع مغلق أمام المخدومين. تسجيل الدخول متاح للمشرفين والخدام والمشرف العام.'
                : 'تسجيل الدخول متاح للمشرف العام فقط أثناء فترة الصيانة والتحديث.'}
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 text-rose-800 dark:text-rose-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Phone Field */}
          <div>
            <label
              htmlFor="phone"
              className="block text-xs md:text-sm font-bold text-brown-900 dark:text-brown-200 mb-1.5"
            >
              رقم الهاتف
            </label>
            <div className="relative">
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="مثال: 01012345678"
                dir="ltr"
                className="w-full text-right pl-4 pr-11 py-2.5 bg-brown-50/50 dark:bg-brown-950/50 border border-brown-300 dark:border-brown-800 rounded-xl text-brown-950 dark:text-brown-50 placeholder:text-brown-400 focus:outline-none focus:ring-2 focus:ring-brown-600 focus:border-transparent text-sm md:text-base font-medium"
                required
                autoComplete="username"
              />
              <Phone className="w-5 h-5 text-brown-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-brown-500 dark:text-brown-400 mt-1">
              أدخل رقم الهاتف المسجل به في الخدمة
            </p>
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs md:text-sm font-bold text-brown-900 dark:text-brown-200 mb-1.5"
            >
              كلمة المرور
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                dir="ltr"
                className="w-full text-right pl-11 pr-11 py-2.5 bg-brown-50/50 dark:bg-brown-950/50 border border-brown-300 dark:border-brown-800 rounded-xl text-brown-950 dark:text-brown-50 placeholder:text-brown-400 focus:outline-none focus:ring-2 focus:ring-brown-600 focus:border-transparent text-sm md:text-base font-medium"
                required
                autoComplete="current-password"
              />
              <Lock className="w-5 h-5 text-brown-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brown-400 hover:text-brown-700 dark:hover:text-brown-200 focus:outline-none cursor-pointer"
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-[11px] text-brown-500 dark:text-brown-400 mt-1">
              إذا كانت هذه أول مرة تسجل فيها، فكلمة المرور المؤقتة هي رقم هاتفك
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full text-base py-3 rounded-xl mt-2 font-bold shadow-warm"
          >
            تسجيل الدخول
          </Button>

          {/* Quick Demo Login Shortcuts */}
          <div className="pt-4 border-t border-brown-200/80 dark:border-brown-900/60 space-y-2 mt-4">
            <span className="text-[11px] font-bold text-brown-600 dark:text-brown-400 block text-center">
              ⚡ تجربة الحسابات السريعة (بنقرة واحدة):
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('01288680312', 'Sh2121982')}
                disabled={isLoading}
                className="p-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 hover:bg-amber-100 dark:bg-amber-950/40 text-center transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <span className="block text-[11px] font-black text-amber-950 dark:text-amber-200">مشرف عام</span>
                <span className="block text-[9px] text-amber-700 dark:text-amber-400 font-mono">Super Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('01100000002', 'Admin@123456')}
                disabled={isLoading}
                className="p-2 rounded-xl border border-brown-300 dark:border-brown-700 bg-brown-50/70 hover:bg-brown-100 dark:bg-brown-900/40 text-center transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <span className="block text-[11px] font-black text-brown-950 dark:text-brown-200">مشرف خدمة</span>
                <span className="block text-[9px] text-brown-600 dark:text-brown-400 font-mono">Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('01211112233', 'User@123456')}
                disabled={isLoading}
                className="p-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 dark:bg-emerald-950/40 text-center transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <span className="block text-[11px] font-black text-emerald-950 dark:text-emerald-200">مخدوم</span>
                <span className="block text-[9px] text-emerald-700 dark:text-emerald-400 font-mono">User</span>
              </button>
            </div>
          </div>
        </form>

        {/* Footer info */}
        <div className="mt-8 pt-5 border-t border-brown-100 dark:border-brown-900/60 text-center space-y-3">
          {!isInstalled && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('open-pwa-install'))}
              className="inline-flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200 hover:text-brown-900 transition-all cursor-pointer bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 px-3.5 py-1.5 rounded-full border border-amber-300/70 dark:border-amber-800/70 shadow-sm"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>تثبيت التطبيق على جهازك الآن</span>
            </button>
          )}

          <p className="text-xs text-brown-500 dark:text-brown-400">
            الحسابات يتم إنشاؤها وتفعيلها فقط عبر إدارة الخدمة والمشرف العام.
          </p>
        </div>
      </div>
    </div>
  );
}
