'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Users,
  ShieldCheck,
  CalendarCheck,
  TrendingUp,
  FileSpreadsheet,
  FileUp,
  Award,
  BookOpen,
  Bell,
  ScrollText,
  QrCode,
  Plus,
  ArrowLeft,
  ChevronLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  X,
  Lock,
  Unlock,
} from 'lucide-react';
import { formatDateArabic, formatShortDateArabic, getAttendanceStatusConfig } from '@/lib/utils/formatters';
import { useSiteLock } from '@/context/SiteLockContext';

export function SuperAdminDashboard() {
  const { profile } = useAuth();
  const { lockConfig } = useSiteLock();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalMeetings: 0,
    overallAttendanceRate: 0,
    totalExams: 0,
    totalReadingPlans: 0,
  });
  const [latestMeeting, setLatestMeeting] = useState<any>(null);
  const [meetingStats, setMeetingStats] = useState({
    present: 0,
    late: 0,
    absent: 0,
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Danger Zone - Reset All Data Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [confirmCodeInput, setConfirmCodeInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const loadSuperAdminData = async () => {
    try {
      // 1. Fetch counts
      const [
        { count: usersCount },
        { count: adminsCount },
        { count: meetingsCount },
        { count: examsCount },
        { count: plansCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('meetings').select('*', { count: 'exact', head: true }),
        supabase.from('exams').select('*', { count: 'exact', head: true }),
        supabase.from('reading_plans').select('*', { count: 'exact', head: true }),
      ]);

      // 2. Fetch latest meeting
      const { data: meetings } = await supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: false })
        .limit(1);

      const latest = meetings?.[0] || null;
      setLatestMeeting(latest);

      if (latest) {
        const { data: att } = await supabase
          .from('attendance')
          .select('status')
          .eq('meeting_id', latest.id);

        const pres = att?.filter((a) => a.status === 'present').length || 0;
        const lat = att?.filter((a) => a.status === 'late').length || 0;
        const abs = Math.max(0, (usersCount || 0) - (pres + lat));

        setMeetingStats({
          present: pres,
          late: lat,
          absent: abs,
        });
      } else {
        setMeetingStats({
          present: 0,
          late: 0,
          absent: 0,
        });
      }

      // 3. Activity logs
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('*, actor:profiles(full_name, role)')
        .order('created_at', { ascending: false })
        .limit(6);

      setRecentLogs(logs || []);

      setStats({
        totalUsers: usersCount || 0,
        totalAdmins: adminsCount || 0,
        totalMeetings: meetingsCount || 0,
        overallAttendanceRate: 85,
        totalExams: examsCount || 0,
        totalReadingPlans: plansCount || 0,
      });
    } catch (err) {
      console.error('Error loading super admin dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuperAdminData();
  }, []);

  const handleExecuteSystemReset = async () => {
    if (confirmCodeInput !== 'Reset.15.550right') {
      setResetError('كود التأكيد غير صحيح. يرجى إدخال الكود المطلوب بدقة.');
      return;
    }

    setIsResetting(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      const { data, error } = await supabase.rpc('super_admin_reset_all_data', {
        p_code: confirmCodeInput,
      });

      if (error) throw error;

      setResetSuccess(
        data?.message || 'تم تصفير وإعادة ضبط كافة بيانات النظام بنجاح مع الحفاظ على حسابات المشرفين.'
      );

      setTimeout(async () => {
        setIsResetModalOpen(false);
        setConfirmCodeInput('');
        setResetSuccess(null);
        await loadSuperAdminData();
      }, 2500);
    } catch (err: any) {
      const msg = err?.message || 'حدث خطأ أثناء محاولة تصفير البيانات';
      setResetError(msg);
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Super Admin Banner */}
      <div className="rounded-2xl bg-gradient-to-l from-brown-900 via-brown-800 to-brown-950 text-white p-6 sm:p-8 shadow-warm-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>لوحة القيادة المركزية - المشرف العام</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white">
            كنيسة السيدة العذراء مريم - إعداد خدام
          </h1>
          <p className="text-xs sm:text-sm text-brown-200 mt-1 max-w-2xl leading-relaxed">
            إدارة الحضور والغياب، وبرنامج القراءات اليومية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link href="/users">
            <Button
              variant="gold"
              size="md"
              leftIcon={<Users className="w-4 h-4" />}
              className="font-bold shadow-md"
            >
              إدارة الخدام والمخدومين
            </Button>
          </Link>
          <Link href="/attendance/scan">
            <Button
              variant="secondary"
              size="md"
              leftIcon={<QrCode className="w-4 h-4" />}
              className="font-bold"
            >
              مسح باركود
            </Button>
          </Link>
        </div>
      </div>

      {/* Site Lock Status Notification Banner on Dashboard */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          lockConfig.is_locked
            ? 'bg-amber-500/15 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 shadow-sm'
            : 'bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              lockConfig.is_locked
                ? 'bg-amber-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {lockConfig.is_locked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-brown-950 dark:text-brown-50">
                إتاحة الموقع للمخدومين:
              </span>
              <Badge variant={lockConfig.is_locked ? 'warning' : 'success'} size="sm">
                {lockConfig.is_locked ? '🔒 مغلق للصيانة' : '🟢 مفتوح للجميع'}
              </Badge>
            </div>
            <p className="text-[11px] text-brown-600 dark:text-brown-400 mt-0.5">
              {lockConfig.is_locked
                ? `الرسالة الحالية: "${lockConfig.title}"`
                : 'المنصة تعمل ومتاحة لجميع المخدومين والخدام بشكل طبيعي.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/system-lock">
            <Button
              variant={lockConfig.is_locked ? 'primary' : 'outline'}
              size="sm"
              leftIcon={<Lock className="w-3.5 h-3.5" />}
              className={`text-xs font-bold cursor-pointer ${
                lockConfig.is_locked ? 'bg-amber-700 hover:bg-amber-800 text-white' : ''
              }`}
            >
              {lockConfig.is_locked ? 'تعديل رسالة القفل' : 'قفل الموقع (صيانة)'}
            </Button>
          </Link>
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/users">
          <Card hoverEffect className="flex items-center gap-4 cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-brown-100 dark:bg-brown-900/60 flex items-center justify-center text-brown-800 dark:text-brown-200">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-brown-600 dark:text-brown-400 font-medium">
                إجمالي المشتركين
              </span>
              <div className="text-2xl font-black text-brown-950 dark:text-brown-50">
                {stats.totalUsers}
              </div>
              <span className="text-[11px] text-brown-500">حسابات مخدومين فعالة</span>
            </div>
          </Card>
        </Link>

        <Link href="/exams/permissions">
          <Card hoverEffect className="flex items-center gap-4 cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-brown-600 dark:text-brown-400 font-medium">
                المشرفين والخدام
              </span>
              <div className="text-2xl font-black text-amber-800 dark:text-amber-300">
                {stats.totalAdmins}
              </div>
              <span className="text-[11px] text-amber-600">بصلاحيات معتمدة</span>
            </div>
          </Card>
        </Link>

        <Link href="/attendance">
          <Card hoverEffect className="flex items-center gap-4 cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-brown-600 dark:text-brown-400 font-medium">
                اجتماعات السبت
              </span>
              <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300">
                {stats.totalMeetings}
              </div>
              <span className="text-[11px] text-emerald-600">جلسات الحضور</span>
            </div>
          </Card>
        </Link>

        <Link href="/attendance/reports">
          <Card hoverEffect className="flex items-center gap-4 cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-brown-700 text-white flex items-center justify-center shadow-sm">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-brown-600 dark:text-brown-400 font-medium">
                تقارير الحضور
              </span>
              <div className="text-xl font-bold text-brown-950 dark:text-brown-50">
                تصدير PDF
              </div>
              <span className="text-[11px] text-brown-600 dark:text-brown-400 font-bold">
                تحميل فوري رسمي
              </span>
            </div>
          </Card>
        </Link>
      </div>

      {/* Quick Action Hub */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <Link href="/users/import" className="block">
          <div className="p-3.5 rounded-xl border border-brown-200 dark:border-brown-800 bg-white dark:bg-[#231b15] hover:border-brown-400 dark:hover:border-brown-600 transition-all text-center group">
            <FileUp className="w-6 h-6 mx-auto mb-2 text-brown-700 dark:text-brown-300 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-brown-900 dark:text-brown-100 block">
              استيراد Excel
            </span>
          </div>
        </Link>

        <Link href="/attendance/reports" className="block">
          <div className="p-3.5 rounded-xl border border-brown-200 dark:border-brown-800 bg-white dark:bg-[#231b15] hover:border-brown-400 dark:hover:border-brown-600 transition-all text-center group">
            <FileSpreadsheet className="w-6 h-6 mx-auto mb-2 text-brown-700 dark:text-brown-300 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-brown-900 dark:text-brown-100 block">
              تقرير الحضور PDF
            </span>
          </div>
        </Link>

        <Link href="/exams/permissions" className="block">
          <div className="p-3.5 rounded-xl border border-brown-200 dark:border-brown-800 bg-white dark:bg-[#231b15] hover:border-brown-400 dark:hover:border-brown-600 transition-all text-center group">
            <ShieldCheck className="w-6 h-6 mx-auto mb-2 text-brown-700 dark:text-brown-300 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-brown-900 dark:text-brown-100 block">
              صلاحيات المشرفين
            </span>
          </div>
        </Link>

        <Link href="/bible-reading/manage" className="block">
          <div className="p-3.5 rounded-xl border border-brown-200 dark:border-brown-800 bg-white dark:bg-[#231b15] hover:border-brown-400 dark:hover:border-brown-600 transition-all text-center group">
            <BookOpen className="w-6 h-6 mx-auto mb-2 text-brown-700 dark:text-brown-300 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-brown-900 dark:text-brown-100 block">
              إدارة القراءات
            </span>
          </div>
        </Link>

        <Link href="/exams/manage" className="block">
          <div className="p-3.5 rounded-xl border border-brown-200 dark:border-brown-800 bg-white dark:bg-[#231b15] hover:border-brown-400 dark:hover:border-brown-600 transition-all text-center group">
            <Award className="w-6 h-6 mx-auto mb-2 text-brown-700 dark:text-brown-300 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-brown-900 dark:text-brown-100 block">
              إدارة الامتحانات
            </span>
          </div>
        </Link>

        <Link href="/notifications" className="block">
          <div className="p-3.5 rounded-xl border border-brown-200 dark:border-brown-800 bg-white dark:bg-[#231b15] hover:border-brown-400 dark:hover:border-brown-600 transition-all text-center group">
            <Bell className="w-6 h-6 mx-auto mb-2 text-brown-700 dark:text-brown-300 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-brown-900 dark:text-brown-100 block">
              إرسال إشعار عام
            </span>
          </div>
        </Link>
      </div>

      {/* Row: Meeting live breakdown & Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Meeting Live Summary */}
        <Card>
          <CardHeader
            title="حالة آخر اجتماع"
            subtitle={latestMeeting ? `${latestMeeting.title} (${formatDateArabic(latestMeeting.meeting_date)})` : 'لا توجد اجتماعات'}
            icon={<CalendarCheck className="w-5 h-5" />}
            action={
              <Link href="/attendance">
                <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  كل الاجتماعات
                </Button>
              </Link>
            }
          />

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                حاضر
              </span>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                {meetingStats.present}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 block mb-1">
                متأخر
              </span>
              <span className="text-2xl font-black text-amber-700 dark:text-amber-400">
                {meetingStats.late}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center">
              <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 block mb-1">
                غائب
              </span>
              <span className="text-2xl font-black text-rose-700 dark:text-rose-400">
                {meetingStats.absent}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-brown-100 dark:border-brown-900/60">
            <Badge
              variant={latestMeeting?.status === 'open' ? 'success' : latestMeeting?.status === 'upcoming' ? 'warning' : 'default'}
              size="md"
              dot
            >
              حالة الاجتماع: {latestMeeting?.status === 'open' ? 'مفتوح لتسجيل الحضور' : latestMeeting?.status === 'upcoming' ? 'قادم' : 'مغلق'}
            </Badge>

            <Link href="/attendance/scan">
              <Button variant="primary" size="sm" leftIcon={<QrCode className="w-4 h-4" />}>
                تسجيل الحضور الآن
              </Button>
            </Link>
          </div>
        </Card>

        {/* Activity Logs Feed */}
        <Card>
          <CardHeader
            title="سجل العمليات الإدارية الحديثة"
            subtitle="تدقيق أمني لكافة العمليات والتعديلات"
            icon={<ScrollText className="w-5 h-5" />}
            action={
              <Link href="/activity-logs">
                <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  سجل التدقيق الكامل
                </Button>
              </Link>
            }
          />

          {recentLogs.length === 0 ? (
            <p className="text-xs text-brown-500 text-center py-6">لا توجد سجلات نشاط حتى الآن.</p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl border border-brown-200 dark:border-brown-800 bg-white dark:bg-[#231b15] flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brown-950 dark:text-brown-50">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-brown-500 font-mono">
                        ({log.entity_type})
                      </span>
                    </div>
                    <span className="text-[11px] text-brown-500">
                      بواسطة: {log.actor?.full_name || 'النظام'}
                    </span>
                  </div>
                  <span className="text-[10px] text-brown-400">
                    {formatShortDateArabic(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Danger Zone: System Data Reset */}
        <Card className="border-rose-300 dark:border-rose-900/60 bg-gradient-to-br from-rose-50/50 via-white to-amber-50/20 dark:from-rose-950/20 dark:via-[#231b15] dark:to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-rose-950 dark:text-rose-100">
                    منطقة التحكم الحساسة: تصفير وإعادة ضبط بيانات الموقع
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200/80 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200">
                    للمشرف العام فقط
                  </span>
                </div>
                <p className="text-xs text-brown-600 dark:text-brown-400 mt-1 max-w-2xl leading-relaxed">
                  إمكانية مسح كافة بيانات الحضور والغياب، الاجتماعات، الامتحانات، خطط القراءة، الإشعارات، وحسابات المخدومين لبدء دورة أو سنة كنسية جديدة. الحسابات الإدارية محمية بالكامل وتتطلب العملية كتابة كود الأمان المخصص.
                </p>
              </div>
            </div>

            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setConfirmCodeInput('');
                setResetError(null);
                setResetSuccess(null);
                setIsResetModalOpen(true);
              }}
              leftIcon={<RotateCcw className="w-4 h-4" />}
              className="shrink-0 bg-rose-700 hover:bg-rose-800 text-white font-bold"
            >
              تصفير بيانات الموقع...
            </Button>
          </div>
        </Card>
      </div>

      {/* Reset All Data Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#231b15] border border-rose-300 dark:border-rose-900/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-brown-950 dark:text-brown-50">
                    تأكيد تصفير وإعادة ضبط كافة البيانات
                  </h3>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                    تحذير أمني: هذا الإجراء جذري ولا يمكن التراجع عنه
                  </p>
                </div>
              </div>
              <button
                onClick={() => !isResetting && setIsResetModalOpen(false)}
                className="text-brown-400 hover:text-brown-600 dark:hover:text-brown-200 transition-colors p-1"
                disabled={isResetting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Breakdown */}
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-brown-800 dark:text-brown-200 space-y-2">
              <p className="font-bold text-rose-800 dark:text-rose-300 mb-1">
                سيقوم هذا الإجراء بمسح العناصر التالية نهائياً:
              </p>
              <ul className="list-disc list-inside space-y-1 text-brown-700 dark:text-brown-300 text-[11px] leading-relaxed">
                <li>كافة سجلات الحضور والغياب ورموز الجلسات الأسبوعية.</li>
                <li>جميع الامتحانات والأسئلة ودرجات وإجابات المخدومين.</li>
                <li>خطط قراءة الكتاب المقدس وسجلات إنجاز الإصحاحات.</li>
                <li>جميع الإشعارات الصادرة واشتراكات التنبيهات.</li>
                <li>حسابات المخدومين (حسابات المستخدمين العاديين).</li>
              </ul>
              <div className="pt-2 border-t border-rose-200/60 dark:border-rose-800/60 flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>حساب المشرف العام وحسابات الخدام ستبقى محفوظة ومحمية بنسبة 100%.</span>
              </div>
            </div>

            {/* Confirmation Code Instruction */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-100">
                لتأكيد العملية، اكتب كود الأمان التالي كما هو بالضبط:
              </label>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-brown-100/70 dark:bg-brown-950 border border-brown-200 dark:border-brown-800">
                <span className="font-mono text-xs sm:text-sm font-black text-rose-700 dark:text-rose-400 tracking-wider select-all">
                  Reset.15.550right
                </span>
                <span className="text-[10px] text-brown-500 font-semibold">كود الأمان الإلزامي</span>
              </div>
              <input
                type="text"
                value={confirmCodeInput}
                onChange={(e) => setConfirmCodeInput(e.target.value)}
                placeholder="اكتب: Reset.15.550right"
                dir="ltr"
                disabled={isResetting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-brown-300 dark:border-brown-700 bg-white dark:bg-[#1a1410] text-brown-950 dark:text-brown-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all text-center tracking-wider"
              />
              {confirmCodeInput && confirmCodeInput !== 'Reset.15.550right' && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                  الكود المكتوب لا يطابق كود الأمان المطلوب.
                </p>
              )}
              {confirmCodeInput === 'Reset.15.550right' && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  الكود مطابق! يمكنك الآن تأكيد عملية التصفير.
                </p>
              )}
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-900/60 border border-rose-300 text-rose-800 dark:text-rose-200 text-xs font-bold">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                {resetSuccess}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-brown-100 dark:border-brown-900/60">
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
              >
                إلغاء
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleExecuteSystemReset}
                disabled={confirmCodeInput !== 'Reset.15.550right' || isResetting}
                isLoading={isResetting}
                leftIcon={<RotateCcw className="w-4 h-4" />}
                className="bg-rose-700 hover:bg-rose-800 text-white font-bold"
              >
                {isResetting ? 'جارٍ تصفير البيانات...' : 'تأكيد تصفير البيانات نهائياً'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
