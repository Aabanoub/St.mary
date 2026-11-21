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
} from 'lucide-react';
import { formatDateArabic, formatShortDateArabic, getAttendanceStatusConfig } from '@/lib/utils/formatters';

export function SuperAdminDashboard() {
  const { profile } = useAuth();
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

  useEffect(() => {
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

    loadSuperAdminData();
  }, []);

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
            التحكم الشامل في حسابات الخدام، استيراد بيانات Excel، الحضور والغياب، إصدار تقارير PDF الرسمية، خطط القراءة والامتحانات الروحية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link href="/users/import">
            <Button
              variant="gold"
              size="md"
              leftIcon={<FileUp className="w-4 h-4" />}
              className="font-bold shadow-md"
            >
              استيراد إكسيل
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
      </div>
    </div>
  );
}
