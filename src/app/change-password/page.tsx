'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ChangePasswordPage() {
  const { user, refreshProfile } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('يجب ألا تقل كلمة المرور الجديدة عن 6 أحرف أو أرقام.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Update password in Supabase Auth
      const { error: updateAuthError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateAuthError) {
        throw updateAuthError;
      }

      // 2. Mark must_change_password as false in public.profiles
      if (user) {
        const { error: updateProfError } = await supabase
          .from('profiles')
          .update({
            must_change_password: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateProfError) {
          throw updateProfError;
        }

        await refreshProfile();
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'حدث خطأ أثناء تغيير كلمة المرور.';
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#fbf8f5] via-[#f5eee7] to-[#ebdcd0] dark:from-[#18120e] dark:via-[#22140c] dark:to-[#120b07]">
      <div className="w-full max-w-md bg-white dark:bg-[#231b15] border border-brown-200/90 dark:border-brown-900 rounded-3xl p-6 sm:p-8 shadow-warm-xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 shadow-sm">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-brown-950 dark:text-brown-50">
            تغيير كلمة المرور المؤقتة
          </h1>
          <p className="text-xs sm:text-sm text-brown-600 dark:text-brown-400 mt-1 max-w-xs leading-relaxed">
            لأمان حسابك، يُلزم النظام باختيار كلمة مرور شخصية جديدة للاستمرار في استخدام التطبيق.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-rose-800 dark:text-rose-200 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1.5">
              كلمة المرور الجديدة
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل 6 خانات على الأقل"
                dir="ltr"
                className="w-full text-right pl-10 pr-10 py-2.5 bg-brown-50/50 dark:bg-brown-950/50 border border-brown-300 dark:border-brown-800 rounded-xl text-brown-950 dark:text-brown-50 text-sm focus:outline-none focus:ring-2 focus:ring-brown-600 font-medium"
                required
              />
              <Lock className="w-4 h-4 text-brown-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brown-400 hover:text-brown-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1.5">
              تأكيد كلمة المرور الجديدة
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور"
                dir="ltr"
                className="w-full text-right pl-10 pr-10 py-2.5 bg-brown-50/50 dark:bg-brown-950/50 border border-brown-300 dark:border-brown-800 rounded-xl text-brown-950 dark:text-brown-50 text-sm focus:outline-none focus:ring-2 focus:ring-brown-600 font-medium"
                required
              />
              <Lock className="w-4 h-4 text-brown-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full py-3 rounded-xl mt-3 font-bold"
          >
            حفظ ومتابعة
          </Button>
        </form>
      </div>
    </div>
  );
}
