'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useSiteLock } from '@/context/SiteLockContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Lock,
  Unlock,
  ShieldAlert,
  ShieldCheck,
  Save,
  CheckCircle2,
  Clock,
  Eye,
  AlertTriangle,
  Sparkles,
  Info,
  PhoneCall,
  History,
} from 'lucide-react';
import { formatDateArabic } from '@/lib/utils/formatters';

const PRESET_TITLES = [
  'الموقع مغلق مؤقتاً لأعمال الصيانة والتطوير',
  'تحديثات هامة جارية على منصة الخدمة',
  'الموقع مغلق مؤقتاً للاستعداد للاختبار الروحي',
  'توقف مؤقت لأعمال الصيانة الدورية',
];

export default function SystemLockPage() {
  const { role, profile } = useAuth();
  const { lockConfig, updateLockSettings, quickToggleLock, isLoadingLock } = useSiteLock();

  const [title, setTitle] = useState(lockConfig.title);
  const [message, setMessage] = useState(lockConfig.message);
  const [estimatedUnlockTime, setEstimatedUnlockTime] = useState(lockConfig.estimated_unlock_time || '');
  const [allowAdmins, setAllowAdmins] = useState(lockConfig.allow_admins);
  const [contactInfo, setContactInfo] = useState(lockConfig.contact_info || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingAdmins, setIsTogglingAdmins] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Sync state when lockConfig updates from DB/realtime
  useEffect(() => {
    setTitle(lockConfig.title);
    setMessage(lockConfig.message);
    setEstimatedUnlockTime(lockConfig.estimated_unlock_time || '');
    setAllowAdmins(lockConfig.allow_admins);
    setContactInfo(lockConfig.contact_info || '');
  }, [lockConfig]);

  // Fetch recent lock activity logs
  const fetchLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, actor:profiles(full_name, phone)')
        .eq('entity_id', 'site_lock')
        .order('created_at', { ascending: false })
        .limit(6);

      if (!error && data) {
        setRecentLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (role === 'super_admin') {
      fetchLogs();
    }
  }, [role]);

  if (role !== 'super_admin') {
    return (
      <AppShell>
        <div className="p-8 text-center bg-white dark:bg-[#231b15] rounded-3xl border border-brown-200">
          <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-brown-950 dark:text-brown-50">
            غير مصرح بالدخول
          </h2>
          <p className="text-xs text-brown-500 mt-1">
            هذه الصفحة مخصصة للمشرف العام فقط لإدارة قفل الموقع وإعدادات الصيانة.
          </p>
        </div>
      </AppShell>
    );
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    const res = await updateLockSettings({
      title,
      message,
      estimated_unlock_time: estimatedUnlockTime,
      allow_admins: allowAdmins,
      contact_info: contactInfo,
    });

    setIsSaving(false);
    if (res.success) {
      setSaveSuccess(true);
      fetchLogs();
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setSaveError(res.error || 'حدث خطأ أثناء حفظ الإعدادات');
    }
  };

  const handleToggleAllowAdmins = async (newVal: boolean) => {
    setAllowAdmins(newVal);
    setIsTogglingAdmins(true);
    setSaveError(null);

    const res = await updateLockSettings({
      allow_admins: newVal,
      title,
      message,
      estimated_unlock_time: estimatedUnlockTime,
      contact_info: contactInfo,
    });

    setIsTogglingAdmins(false);
    if (res.success) {
      setSaveSuccess(true);
      fetchLogs();
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setSaveError(res.error || 'حدث خطأ أثناء تعديل إذن الخدام');
    }
  };

  const handleToggleLock = async (shouldLock: boolean) => {
    const confirmMsg = shouldLock
      ? 'هل أنت متأكد من قفل الموقع الآن؟ سيتم حظر المخدومين من الوصول وعرض الرسالة المخصصة.'
      : 'هل تريد إلغاء القفل وفتح الموقع لجميع المستخدمين الآن؟';

    if (!confirm(confirmMsg)) return;

    setIsSaving(true);
    const res = await updateLockSettings({
      is_locked: shouldLock,
      allow_admins: allowAdmins,
      title,
      message,
      estimated_unlock_time: estimatedUnlockTime,
      contact_info: contactInfo,
    });
    setIsSaving(false);

    if (res.success) {
      setSaveSuccess(true);
      fetchLogs();
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      alert(res.error || 'حدث خطأ أثناء تغيير حالة الموقع');
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 text-xs font-bold mb-1 border border-amber-300 dark:border-amber-800">
              <Lock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>إدارة النظام والصيانة</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-brown-950 dark:text-brown-50">
              قفل المنصة والرسائل المخصصة (Maintenance Mode)
            </h1>
            <p className="text-xs text-brown-500 mt-0.5">
              تحكم كامل في إغلاق الموقع أمام المخدومين أثناء الصيانة أو التحديثات مع تخصيص الرسالة المعروضة.
            </p>
          </div>
        </div>

        {/* Master Status Card */}
        <div
          className={`rounded-3xl p-6 sm:p-8 border transition-all ${
            lockConfig.is_locked
              ? 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-400 dark:border-amber-700 shadow-warm'
              : 'bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 shadow-xs'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-warm ${
                  lockConfig.is_locked
                    ? 'bg-amber-600 text-white ring-4 ring-amber-200 dark:ring-amber-950'
                    : 'bg-emerald-600 text-white ring-4 ring-emerald-200 dark:ring-emerald-950'
                }`}
              >
                {lockConfig.is_locked ? (
                  <Lock className="w-7 h-7" />
                ) : (
                  <Unlock className="w-7 h-7" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base sm:text-lg font-black text-brown-950 dark:text-brown-50">
                    حالة الموقع الحالية:
                  </span>
                  <Badge variant={lockConfig.is_locked ? 'warning' : 'success'} size="md">
                    {lockConfig.is_locked ? '🔒 مغلق (وضع الصيانة مفعل)' : '🟢 مفتوح ومتاح للجميع'}
                  </Badge>
                </div>
                <p className="text-xs text-brown-600 dark:text-brown-400 max-w-lg">
                  {lockConfig.is_locked
                    ? 'الموقع حالياً محجوب عن المخدومين وتظهر لهم شاشة القفل بالرسالة المخصصة. المشرف العام فقط (والمشرفون إن تم السماح لهم) يمكنهم الدخول.'
                    : 'الموقع يعمل بشكل طبيعي لجميع المخدومين والخدام ويمكنهم تسجيل الحضور ومتابعة القراءات والامتحانات.'}
                </p>
              </div>
            </div>

            {/* Quick Lock / Unlock Action Button */}
            <div className="shrink-0 flex items-center gap-3">
              {lockConfig.is_locked ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => handleToggleLock(false)}
                  disabled={isSaving}
                  leftIcon={<Unlock className="w-5 h-5 text-emerald-300" />}
                  className="font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-warm cursor-pointer"
                >
                  فتح الموقع لجميع المستخدمين الآن ✓
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleToggleLock(true)}
                  disabled={isSaving}
                  leftIcon={<Lock className="w-5 h-5 text-amber-600" />}
                  className="font-bold border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-sm cursor-pointer"
                >
                  قفل الموقع الآن (تفعيل الصيانة) 🔒
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Configuration Form & Live Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Settings Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card>
              <CardHeader
                title="تخصيص رسالة وإعدادات شاشة القفل"
                subtitle="حدد العنوان والرسالة التي ستظهر للمخدومين عند زيارة الموقع وهو مغلق"
                icon={<Lock className="w-5 h-5 text-brown-600" />}
              />

              <form onSubmit={handleSaveConfig} className="space-y-4">
                {/* Presets */}
                <div>
                  <label className="block text-xs font-bold text-brown-700 dark:text-brown-300 mb-1.5">
                    نماذج جاهزة سريعة للعنوان:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_TITLES.map((pt) => (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => setTitle(pt)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          title === pt
                            ? 'bg-brown-700 text-white border-brown-700'
                            : 'bg-brown-50 dark:bg-brown-900/40 text-brown-800 dark:text-brown-200 border-brown-200 dark:border-brown-800 hover:border-brown-400'
                        }`}
                      >
                        {pt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                    عنوان الإغلاق (Title) *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="مثال: الموقع مغلق مؤقتاً لأعمال الصيانة والتطوير"
                    className="w-full py-2 px-3 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-sm font-bold text-brown-950 dark:text-brown-50 focus:outline-none focus:ring-2 focus:ring-brown-600"
                  />
                </div>

                {/* Message Body */}
                <div>
                  <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                    نص الرسالة التفصيلية للمخدومين (Message) *
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={4}
                    placeholder="اكتب التوضيح أو التهنئة أو طلب الصلاة أو سبب الإغلاق..."
                    className="w-full py-2.5 px-3 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-sm text-brown-900 dark:text-brown-100 focus:outline-none focus:ring-2 focus:ring-brown-600 leading-relaxed"
                  />
                  <span className="text-[11px] text-brown-500 mt-0.5 block">
                    يمكنك كتابة عدة أسطر؛ ستظهر بنفس التنسيق تماماً على شاشة المخدوم.
                  </span>
                </div>

                {/* Estimated Return Time & Emergency Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>الموعد المتوقع للعودة (اختياري)</span>
                    </label>
                    <input
                      type="text"
                      value={estimatedUnlockTime}
                      onChange={(e) => setEstimatedUnlockTime(e.target.value)}
                      placeholder="مثال: اليوم الساعة ٨:٠٠ م أو خلال ساعتين"
                      className="w-full py-2 px-3 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brown-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1 flex items-center gap-1">
                      <PhoneCall className="w-3.5 h-3.5 text-brown-500" />
                      <span>للتواصل في الطوارئ (اختياري)</span>
                    </label>
                    <input
                      type="text"
                      value={contactInfo}
                      onChange={(e) => setContactInfo(e.target.value)}
                      placeholder="مثال: رقم هاتف أو تواصل مع أمين الخدمة"
                      className="w-full py-2 px-3 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brown-600"
                    />
                  </div>
                </div>

                {/* Allow Admins Toggle */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    allowAdmins
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 shadow-xs'
                      : 'bg-brown-50 dark:bg-brown-900/30 border-brown-200 dark:border-brown-800'
                  } flex items-start gap-3`}
                >
                  <input
                    type="checkbox"
                    id="allow_admins"
                    checked={allowAdmins}
                    disabled={isTogglingAdmins}
                    onChange={(e) => handleToggleAllowAdmins(e.target.checked)}
                    className="w-5 h-5 mt-0.5 text-brown-700 rounded border-brown-300 focus:ring-brown-600 cursor-pointer"
                  />
                  <div className="flex-1">
                    <label htmlFor="allow_admins" className="cursor-pointer select-none">
                      <div className="flex items-center gap-2 mb-1">
                        <strong className="text-sm text-brown-950 dark:text-brown-100 font-bold">
                          السماح للمشرفين والخدام بالدخول أثناء القفل
                        </strong>
                        <Badge variant={allowAdmins ? 'success' : 'default'} size="sm">
                          {allowAdmins ? '✓ مسموح للخدام' : 'محجوب (المشرف العام فقط)'}
                        </Badge>
                        {isTogglingAdmins && (
                          <span className="text-[10px] text-brown-500 animate-pulse">جاري الحفظ الفوري...</span>
                        )}
                      </div>
                      <span className="text-brown-600 dark:text-brown-400 text-xs block leading-relaxed">
                        عند تفعيل هذا الخيار، سيتمكن الخدام والمشرفون من الدخول بحساباتهم وتصفح النظام، بينما يظل محجوباً تماماً عن المخدومين فقط. (يتم الحفظ والتطبيق فوراً بمجرد النقر).
                      </span>
                    </label>
                  </div>
                </div>

                {/* Save Feedback */}
                {saveSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>تم حفظ الإعدادات والرسالة بنجاح وتحديثها فورياً على جميع الأجهزة!</span>
                  </div>
                )}

                {saveError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-xs text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>{saveError}</span>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-brown-100 dark:border-brown-900/60">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSaving}
                    leftIcon={<Save className="w-4 h-4" />}
                    className="font-bold cursor-pointer"
                  >
                    حفظ نص الرسالة والإعدادات
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Live Preview Column (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brown-600 dark:text-brown-400 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-amber-600" />
                <span>معاينة حية فورية لشاشة المخدوم</span>
              </span>
              <Badge variant="warning" size="sm">
                مظهر شاشة القفل
              </Badge>
            </div>

            {/* Preview Box Container */}
            <div className="rounded-3xl border-2 border-dashed border-brown-300 dark:border-brown-700 p-4 bg-[#fbf8f5] dark:bg-[#18120e] shadow-inner">
              <div className="bg-white dark:bg-[#231b15] rounded-2xl p-5 border border-brown-200 dark:border-brown-800 text-center space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-500 text-white flex items-center justify-center mx-auto shadow-sm ring-4 ring-amber-100 dark:ring-amber-950">
                  <Lock className="w-6 h-6" />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200">
                    مغلق
                  </span>
                  <h3 className="text-sm font-black text-brown-950 dark:text-brown-50 leading-tight">
                    {title || 'عنوان الإغلاق...'}
                  </h3>
                  <p className="text-xs text-brown-600 dark:text-brown-400 leading-relaxed whitespace-pre-line line-clamp-4">
                    {message || 'نص الرسالة المخصصة...'}
                  </p>
                </div>

                {estimatedUnlockTime && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brown-50 dark:bg-brown-900/40 border border-brown-200 dark:border-brown-800 text-[11px] font-bold text-brown-800 dark:text-brown-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>الموعد المتوقع: {estimatedUnlockTime}</span>
                  </div>
                )}

                {contactInfo && (
                  <p className="text-[10px] text-brown-500">
                    للطوارئ: {contactInfo}
                  </p>
                )}

                <div className="pt-2 border-t border-brown-100 dark:border-brown-900/60">
                  <span className="text-[10px] text-brown-400 italic">
                    «تَوَكَّلْ عَلَى الرَّبِّ بِكُلِّ قَلْبِكَ» (أم 3: 5)
                  </span>
                </div>
              </div>
            </div>

            {/* Audit Logs Card */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3 text-xs font-bold text-brown-900 dark:text-brown-200">
                <History className="w-4 h-4 text-brown-600" />
                <span>سجل عمليات القفل والفتح الأخيرة</span>
              </div>

              {isLoadingLogs ? (
                <p className="text-xs text-brown-400 text-center py-4">جاري التحميل...</p>
              ) : recentLogs.length === 0 ? (
                <p className="text-xs text-brown-500 text-center py-4">لا توجد سجلات بعد.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2 rounded-xl bg-brown-50/60 dark:bg-brown-900/30 border border-brown-100 dark:border-brown-800 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-1.5">
                        {log.action === 'LOCK_SITE' ? (
                          <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        ) : log.action === 'UNLOCK_SITE' ? (
                          <Unlock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Save className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        )}
                        <span className="font-bold text-brown-900 dark:text-brown-100">
                          {log.action === 'LOCK_SITE'
                            ? 'قفل الموقع'
                            : log.action === 'UNLOCK_SITE'
                            ? 'فتح الموقع'
                            : 'تحديث رسالة القفل'}
                        </span>
                      </div>
                      <span className="text-[10px] text-brown-400 font-mono">
                        {formatDateArabic(log.created_at.split('T')[0])}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
