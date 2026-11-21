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
  QrCode,
  CalendarCheck,
  Users,
  BookOpen,
  Award,
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { formatDateArabic, getAttendanceStatusConfig } from '@/lib/utils/formatters';

export function AdminDashboard() {
  const { profile, hasPermission } = useAuth();
  const [currentMeeting, setCurrentMeeting] = useState<any>(null);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [stats, setStats] = useState({
    present: 0,
    late: 0,
    absent: 0,
    totalRegistered: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        // 1. Fetch current or today's meeting
        const { data: meetings } = await supabase
          .from('meetings')
          .select('*')
          .order('meeting_date', { ascending: false })
          .limit(1);

        const meeting = meetings?.[0] || null;
        setCurrentMeeting(meeting);

        // 2. Fetch total active users
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'user')
          .eq('is_active', true);

        const totalUsers = userCount || 0;

        // 3. If meeting exists, fetch its attendance
        if (meeting) {
          const { data: att } = await supabase
            .from('attendance')
            .select('*, user:profiles(id, full_name, phone, attendance_code)')
            .eq('meeting_id', meeting.id)
            .order('scanned_at', { ascending: false });

          setAttendanceList(att || []);

          const presentCount = att?.filter((a) => a.status === 'present').length || 0;
          const lateCount = att?.filter((a) => a.status === 'late').length || 0;
          const absentCount = Math.max(0, totalUsers - (presentCount + lateCount));

          setStats({
            present: presentCount,
            late: lateCount,
            absent: absentCount,
            totalRegistered: totalUsers,
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    loadAdminData();
  }, []);

  const handleSearch = async (val: string) => {
    setSearchTerm(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone, attendance_code, role')
      .or(`full_name.ilike.%${val}%,phone.ilike.%${val}%,attendance_code.ilike.%${val}%`)
      .limit(5);

    setSearchResults(data || []);
    setIsSearching(false);
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

  const canScan = hasPermission('scan_attendance');
  const canPlans = hasPermission('create_reading_plans') || hasPermission('edit_reading_plans');
  const canExams = hasPermission('create_exams') || hasPermission('edit_exams');

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-l from-brown-800 via-brown-700 to-brown-900 text-white p-6 sm:p-8 shadow-warm-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>لوحة تحكم المشرف - كنيسة العذراء مريم</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white">
            سلام ونعمة، {profile?.full_name}
          </h1>
          <p className="text-xs sm:text-sm text-brown-200 mt-1">
            تابع تحضير الخدام وتسجيل الحضور بالباركود وإدارة الأنشطة الروحية المصرح لك بها.
          </p>
        </div>

        {canScan && (
          <Link href="/attendance/scan">
            <Button
              variant="gold"
              size="lg"
              leftIcon={<QrCode className="w-5 h-5" />}
              className="font-bold shadow-md w-full md:w-auto"
            >
              فتح ماسح الحضور QR
            </Button>
          </Link>
        )}
      </div>

      {/* Meeting Live Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hoverEffect className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brown-100 dark:bg-brown-900/60 flex items-center justify-center text-brown-800 dark:text-brown-200">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-brown-600 dark:text-brown-400 font-medium">إجمالي المخدومين</span>
            <div className="text-2xl font-black text-brown-950 dark:text-brown-50">
              {stats.totalRegistered}
            </div>
            <span className="text-[11px] text-brown-500">حساب نشط بالخدمة</span>
          </div>
        </Card>

        <Card hoverEffect className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-brown-600 dark:text-brown-400 font-medium">حاضر اليوم</span>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {stats.present}
            </div>
            <span className="text-[11px] text-emerald-600">تم مسح كودهم</span>
          </div>
        </Card>

        <Card hoverEffect className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-brown-600 dark:text-brown-400 font-medium">متأخر</span>
            <div className="text-2xl font-black text-amber-700 dark:text-amber-400">
              {stats.late}
            </div>
            <span className="text-[11px] text-amber-600">تسجيل متأخر</span>
          </div>
        </Card>

        <Card hoverEffect className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-brown-600 dark:text-brown-400 font-medium">لم يحضر بعد</span>
            <div className="text-2xl font-black text-rose-700 dark:text-rose-400">
              {stats.absent}
            </div>
            <span className="text-[11px] text-rose-600">غياب أو لم يسجل</span>
          </div>
        </Card>
      </div>

      {/* Quick Search & Attendance live feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Search & Manual Checkin */}
        <Card className="lg:col-span-1">
          <CardHeader
            title="بحث سريع عن مخدوم"
            subtitle="بالاسم أو رقم الهاتف أو كود الحضور"
            icon={<Search className="w-5 h-5" />}
          />

          <div className="relative mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="اكتب اسم أو كود المخدوم..."
              className="w-full pl-4 pr-10 py-2.5 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brown-600"
            />
            <Search className="w-4 h-4 text-brown-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          </div>

          <div className="space-y-2">
            {searchResults.map((user) => (
              <div
                key={user.id}
                className="p-3 rounded-xl border border-brown-200 dark:border-brown-800 bg-white dark:bg-[#231b15] flex items-center justify-between"
              >
                <div>
                  <h5 className="text-xs font-bold text-brown-950 dark:text-brown-50">
                    {user.full_name}
                  </h5>
                  <span className="text-[10px] text-brown-500 font-mono">
                    {user.attendance_code} | {user.phone}
                  </span>
                </div>
                {canScan && currentMeeting && (
                  <Link href={`/attendance/scan?user_id=${user.id}`}>
                    <Button variant="secondary" size="sm" className="text-[11px] py-1">
                      تحضير
                    </Button>
                  </Link>
                )}
              </div>
            ))}
            {searchTerm && searchResults.length === 0 && !isSearching && (
              <p className="text-xs text-brown-500 text-center py-4">لم يتم العثور على نتائج.</p>
            )}
          </div>
        </Card>

        {/* Live Attendance List */}
        <Card className="lg:col-span-2">
          <CardHeader
            title={`حضور اجتماع: ${currentMeeting?.title || 'اجتماع السبت'}`}
            subtitle={currentMeeting ? formatDateArabic(currentMeeting.meeting_date) : 'لا يوجد اجتماع محدد'}
            icon={<CalendarCheck className="w-5 h-5" />}
            action={
              <Link href="/attendance">
                <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  سجل الاجتماعات
                </Button>
              </Link>
            }
          />

          {attendanceList.length === 0 ? (
            <p className="text-xs text-brown-500 text-center py-8">
              لم يُسجل حضور لأحد بعد في هذا الاجتماع.
            </p>
          ) : (
            <div className="divide-y divide-brown-100 dark:divide-brown-900/60 max-h-80 overflow-y-auto">
              {attendanceList.map((rec) => {
                const cfg = getAttendanceStatusConfig(rec.status);
                return (
                  <div key={rec.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-brown-950 dark:text-brown-50">
                        {rec.user?.full_name}
                      </h4>
                      <span className="text-[10px] text-brown-500 font-mono">
                        {rec.user?.attendance_code} | {rec.user?.phone}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-brown-400">
                        {new Date(rec.scanned_at).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.badgeBg}`} />
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: Permitted Management Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reading plans management */}
        <Card>
          <CardHeader
            title="خطط قراءة الكتاب المقدس"
            subtitle="متابعة قراءات الخدام والمخدومين"
            icon={<BookOpen className="w-5 h-5" />}
            action={
              canPlans ? (
                <Link href="/bible-reading/manage">
                  <Button variant="secondary" size="sm">
                    إدارة الخطط
                  </Button>
                </Link>
              ) : null
            }
          />
          <p className="text-xs text-brown-600 dark:text-brown-400 leading-relaxed mb-4">
            تتيح خطط القراءة تعيين إصحاحات يومية وتتبع تقدم كل مخدوم وتشجيعه على الانتظام في كلمة الله.
          </p>
          <Link href="/bible-reading">
            <Button variant="outline" size="sm" className="w-full">
              عرض القراءات الحالية
            </Button>
          </Link>
        </Card>

        {/* Exams management */}
        <Card>
          <CardHeader
            title="الامتحانات والتقييمات الروحية"
            subtitle="إعداد الأسئلة وتصحيح الإجابات"
            icon={<Award className="w-5 h-5" />}
            action={
              canExams ? (
                <Link href="/exams/manage">
                  <Button variant="secondary" size="sm">
                    إدارة الامتحانات
                  </Button>
                </Link>
              ) : null
            }
          />
          <p className="text-xs text-brown-600 dark:text-brown-400 leading-relaxed mb-4">
            {canExams
              ? 'لديك صلاحية معتمدة لإنشاء امتحانات جديدة وتعيين أسئلة الاختيار من متعدد والصح والخطأ.'
              : 'يمكنك مراجعة نتائج الامتحانات ومتابعة أداء المخدومين.'}
          </p>
          <Link href="/exams">
            <Button variant="outline" size="sm" className="w-full">
              استعراض قائمة الامتحانات
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
