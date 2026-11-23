'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { QRCodeSVG } from 'qrcode.react';
import {
  CalendarCheck,
  BookOpen,
  Award,
  QrCode,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Flame,
  Check,
  Bell,
} from 'lucide-react';
import {
  formatDateArabic,
  formatShortDateArabic,
  getAttendanceStatusConfig,
} from '@/lib/utils/formatters';

export function UserDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalMeetings: 0,
    attendedMeetings: 0,
    attendanceRate: 0,
    totalAssignedChapters: 0,
    completedChapters: 0,
    readingProgress: 0,
    availableExams: 0,
  });
  const [todayChapters, setTodayChapters] = useState<any[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [availableExamsList, setAvailableExamsList] = useState<any[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completingChapterId, setCompletingChapterId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    const loadDashboardData = async () => {
      try {
        // 1. Fetch attendance stats
        const { count: totalMeetingsCount } = await supabase
          .from('meetings')
          .select('*', { count: 'exact', head: true })
          .in('status', ['open', 'closed']);

        const { data: userAttendance } = await supabase
          .from('attendance')
          .select('*, meeting:meetings(*)')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });

        const attended = userAttendance?.filter((a) => a.status === 'present' || a.status === 'late') || [];
        const total = totalMeetingsCount || 0;
        const rate = total > 0 ? Math.round((attended.length / total) * 100) : 100;

        setRecentAttendance(userAttendance?.slice(0, 4) || []);

        // 2. Fetch Reading Plan & Today's Chapters
        const todayStr = new Date().toISOString().split('T')[0];

        const { data: activePlans } = await supabase
          .from('reading_plans')
          .select('id, title')
          .eq('is_active', true)
          .limit(1);

        let planChapters: any[] = [];
        let completedCount = 0;

        if (activePlans && activePlans.length > 0) {
          const planId = activePlans[0].id;

          const { data: allPlanChapters } = await supabase
            .from('reading_plan_chapters')
            .select('*')
            .eq('plan_id', planId)
            .order('assigned_date', { ascending: true });

          const { data: userProgress } = await supabase
            .from('user_reading_progress')
            .select('chapter_id, completed')
            .eq('user_id', profile.id)
            .eq('plan_id', planId);

          const progressMap = new Set(
            userProgress?.filter((p) => p.completed).map((p) => p.chapter_id) || []
          );

          completedCount = progressMap.size;

          planChapters = (allPlanChapters || []).map((c) => ({
            ...c,
            is_completed: progressMap.has(c.id),
          }));

          // Filter today's chapters or upcoming
          const todayOrRecent = planChapters.filter((c) => c.assigned_date <= todayStr);
          setTodayChapters(todayOrRecent.slice(-3));
        }

        const totalChapters = planChapters.length;
        const readingRate = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;

        // 3. Fetch Available Exams
        const { data: exams } = await supabase
          .from('exams')
          .select('*, exam_submissions(id, total_score, is_graded)')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        const formattedExams = (exams || []).map((e) => {
          const sub = e.exam_submissions?.find((s: any) => true);
          return {
            ...e,
            is_submitted: !!sub,
            submission: sub,
          };
        });

        setAvailableExamsList(formattedExams.slice(0, 3));

        // 4. Notifications
        const { data: notifs } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3);

        setRecentNotifications(notifs || []);

        setStats({
          totalMeetings: total,
          attendedMeetings: attended.length,
          attendanceRate: rate,
          totalAssignedChapters: totalChapters,
          completedChapters: completedCount,
          readingProgress: readingRate,
          availableExams: formattedExams.filter((e) => !e.is_submitted).length,
        });
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [profile]);

  const handleToggleChapter = async (chapter: any) => {
    if (!profile) return;
    setCompletingChapterId(chapter.id);

    try {
      if (chapter.is_completed) {
        await supabase
          .from('user_reading_progress')
          .delete()
          .eq('chapter_id', chapter.id)
          .eq('user_id', profile.id);
      } else {
        await supabase
          .from('user_reading_progress')
          .insert({
            chapter_id: chapter.id,
            plan_id: chapter.plan_id,
            user_id: profile.id,
            completed: true,
            completed_at: new Date().toISOString(),
          });
      }

      // Update state locally
      setTodayChapters((prev) =>
        prev.map((c) => (c.id === chapter.id ? { ...c, is_completed: !c.is_completed } : c))
      );

      setStats((prev) => {
        const diff = chapter.is_completed ? -1 : 1;
        const newCompleted = Math.max(0, prev.completedChapters + diff);
        const newRate = prev.totalAssignedChapters > 0
          ? Math.round((newCompleted / prev.totalAssignedChapters) * 100)
          : 0;
        return {
          ...prev,
          completedChapters: newCompleted,
          readingProgress: newRate,
        };
      });
    } catch (e) {
      console.error(e);
    } finally {
      setCompletingChapterId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-brown-800 via-brown-700 to-brown-900 text-white p-6 sm:p-8 shadow-warm-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brown-600/60 text-amber-200 text-xs font-semibold mb-2 backdrop-blur">
              <span>كنيسة السيدة العذراء مريم - إعداد خدام</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white">
              أهلاً بك، {profile?.full_name}
            </h1>
            <p className="text-xs sm:text-sm text-brown-200 mt-1 max-w-xl">
              «كُونُوا أَمَنَاءَ إِلَى الْمَوْتِ فَسَأُعْطِيكَ إِكْلِيلَ الْحَيَاةِ» (رؤ 2: 10). تابع حضورك وقراءاتك وامتحاناتك.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <Link href="/attendance/my-qr">
              <Button
                variant="gold"
                size="md"
                leftIcon={<QrCode className="w-4 h-4" />}
                className="font-bold shadow-md"
              >
                كود الحضور
              </Button>
            </Link>
          </div>
        </div>
        {/* Subtle decorative background circle */}
        <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Rate */}
        <Card hoverEffect className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-brown-600 dark:text-brown-400 font-medium">نسبة الحضور</span>
            <div className="text-2xl font-black text-brown-950 dark:text-brown-50">
              %{stats.attendanceRate}
            </div>
            <span className="text-[11px] text-brown-500">
              حضور {stats.attendedMeetings} من {stats.totalMeetings} اجتماع
            </span>
          </div>
        </Card>

        {/* Reading Progress */}
        <Card hoverEffect className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-brown-600 dark:text-brown-400 font-medium">إنجاز القراءات</span>
            <div className="text-2xl font-black text-brown-950 dark:text-brown-50">
              %{stats.readingProgress}
            </div>
            <span className="text-[11px] text-brown-500">
              {stats.completedChapters} إصحاح مكتمل
            </span>
          </div>
        </Card>

        {/* Available Exams */}
        <Card hoverEffect className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brown-100 dark:bg-brown-900/60 border border-brown-200 dark:border-brown-800 flex items-center justify-center text-brown-700 dark:text-brown-300">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-brown-600 dark:text-brown-400 font-medium">اختبارات متاحة</span>
            <div className="text-2xl font-black text-brown-950 dark:text-brown-50">
              {stats.availableExams}
            </div>
            <span className="text-[11px] text-brown-500">
              جاهزة للتقديم الآن
            </span>
          </div>
        </Card>

        {/* Attendance Code Widget */}
        <Card hoverEffect className="flex items-center justify-between p-4 bg-gradient-to-br from-brown-50 to-white dark:from-brown-950/40 dark:to-[#231b15]">
          <div>
            <span className="text-xs text-brown-600 dark:text-brown-400 font-medium">كودك الشخصي</span>
            <div className="text-lg font-black text-brown-900 dark:text-brown-100 tracking-wider font-mono">
              {profile?.attendance_code}
            </div>
            <Link
              href="/attendance/my-qr"
              className="text-[11px] text-brown-700 dark:text-brown-300 font-bold hover:underline flex items-center gap-1 mt-0.5"
            >
              عرض الباركود <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-1.5 bg-white rounded-lg border border-brown-200 shadow-sm shrink-0">
            <QRCodeSVG value={profile?.qr_token || 'stmary'} size={50} />
          </div>
        </Card>
      </div>

      {/* Row 2: Reading Plan & Recent Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Bible Reading */}
        <Card>
          <CardHeader
            title="قراءات اليوم والمتابعة"
            subtitle="علّم على الإصحاحات فور الانتهاء من قراءتها"
            icon={<BookOpen className="w-5 h-5" />}
            action={
              <Link href="/bible-reading">
                <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  عرض الخطة كاملة
                </Button>
              </Link>
            }
          />

          {todayChapters.length === 0 ? (
            <p className="text-xs text-brown-500 text-center py-6">
              لا توجد قراءات معينة لليوم أو لم تبدأ خطة جديدة بعد.
            </p>
          ) : (
            <div className="space-y-2.5">
              {todayChapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    chapter.is_completed
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-brown-50/50 dark:bg-brown-950/40 border-brown-200 dark:border-brown-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleChapter(chapter)}
                      disabled={completingChapterId === chapter.id}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        chapter.is_completed
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'border-2 border-brown-400 dark:border-brown-600 hover:border-emerald-500'
                      }`}
                    >
                      {chapter.is_completed && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>
                    <div>
                      <h4 className="text-sm font-bold text-brown-950 dark:text-brown-50">
                        {chapter.book_name} - الإصحاح {chapter.chapter_number}
                      </h4>
                      <span className="text-[11px] text-brown-500">
                        محدد لتاريخ: {formatShortDateArabic(chapter.assigned_date)}
                      </span>
                    </div>
                  </div>

                  <Badge variant={chapter.is_completed ? 'success' : 'default'} size="sm">
                    {chapter.is_completed ? 'تمت القراءة' : 'متبقي'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Attendance */}
        <Card>
          <CardHeader
            title="آخر تسجيلات الحضور"
            subtitle="اجتماعات السبت الأسبوعية"
            icon={<CalendarCheck className="w-5 h-5" />}
            action={
              <Link href="/attendance">
                <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  السجل بالكامل
                </Button>
              </Link>
            }
          />

          {recentAttendance.length === 0 ? (
            <p className="text-xs text-brown-500 text-center py-6">
              لم يتم تسجيل أي حضور حتى الآن.
            </p>
          ) : (
            <div className="space-y-2.5">
              {recentAttendance.map((rec) => {
                const cfg = getAttendanceStatusConfig(rec.status);
                return (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-brown-200 dark:border-brown-800 bg-white dark:bg-[#231b15]"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-brown-950 dark:text-brown-50">
                        {rec.meeting?.title || 'اجتماع السبت'}
                      </h4>
                      <span className="text-[11px] text-brown-500">
                        {formatDateArabic(rec.meeting?.meeting_date || rec.scanned_at)}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.badgeBg}`} />
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: Available Exams & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exams */}
        <Card>
          <CardHeader
            title="الاختبارات والتقييمات الروحية"
            subtitle="اختبر معلوماتك بعد دراسة الأسفار المقدسة"
            icon={<Award className="w-5 h-5" />}
            action={
              <Link href="/exams">
                <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  عرض الكل
                </Button>
              </Link>
            }
          />

          {availableExamsList.length === 0 ? (
            <p className="text-xs text-brown-500 text-center py-6">
              لا توجد اختبارات منشورة حالياً.
            </p>
          ) : (
            <div className="space-y-3">
              {availableExamsList.map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-brown-200 dark:border-brown-800 bg-brown-50/30 dark:bg-brown-950/20"
                >
                  <div>
                    <h4 className="text-sm font-bold text-brown-950 dark:text-brown-50">
                      {exam.title}
                    </h4>
                    <span className="text-[11px] text-brown-500">
                      المدة: {exam.duration_minutes} دقيقة | درجة النجاح: {exam.pass_score}%
                    </span>
                  </div>

                  {exam.is_submitted ? (
                    !exam.submission?.is_graded ? (
                      <Badge variant="warning" size="sm">
                        قيد التصحيح ⏳
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm">
                        الدرجة: {exam.submission?.total_score}
                      </Badge>
                    )
                  ) : (
                    <Link href={`/exams/${exam.id}`}>
                      <Button variant="primary" size="sm">
                        بدء الامتحان
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader
            title="آخر الإعلانات والتنبيهات"
            icon={<Bell className="w-5 h-5" />}
            action={
              <Link href="/notifications">
                <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  كل التنبيهات
                </Button>
              </Link>
            }
          />

          {recentNotifications.length === 0 ? (
            <p className="text-xs text-brown-500 text-center py-6">
              لا توجد تنبيهات جديدة.
            </p>
          ) : (
            <div className="space-y-3">
              {recentNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-3.5 rounded-xl border border-brown-200 dark:border-brown-800 bg-white dark:bg-[#231b15]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold text-brown-900 dark:text-brown-100">
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-brown-400">
                      {formatShortDateArabic(notif.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-brown-600 dark:text-brown-400 line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
