'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  BookOpen,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
  Check,
  Lock,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { formatShortDateArabic, formatDateArabic } from '@/lib/utils/formatters';

// Cairo timezone YYYY-MM-DD
const getCairoDateStr = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

export default function BibleReadingPage() {
  const { profile, hasPermission, role } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  // Default to 'day_by_day' so users only see chapters up to today
  const [filterMode, setFilterMode] = useState<'day_by_day' | 'today' | 'overdue' | 'completed' | 'all'>('day_by_day');
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const canCreatePlans = role === 'super_admin' || hasPermission('create_reading_plans');
  const canEditPlans = role === 'super_admin' || hasPermission('edit_reading_plans');
  const canManage = canCreatePlans || canEditPlans;

  const fetchReadingData = async () => {
    if (!profile) return;
    try {
      setIsLoading(true);

      // 1. Fetch active reading plans
      const { data: pList } = await supabase
        .from('reading_plans')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      setPlans(pList || []);

      if (pList && pList.length > 0) {
        const curPlan = (activePlan && pList.find((p) => p.id === activePlan.id)) || pList[0];
        setActivePlan(curPlan);
        await loadPlanChapters(curPlan.id, profile.id);
      } else {
        setActivePlan(null);
        setChapters([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlan = async (p: any) => {
    setActivePlan(p);
    if (profile) {
      await loadPlanChapters(p.id, profile.id);
    }
  };

  const loadPlanChapters = async (planId: string, userId: string) => {
    // Fetch chapters for plan
    const { data: chaps } = await supabase
      .from('reading_plan_chapters')
      .select('*')
      .eq('plan_id', planId)
      .order('assigned_date', { ascending: true })
      .order('chapter_number', { ascending: true });

    // Fetch user progress
    const { data: progress } = await supabase
      .from('user_reading_progress')
      .select('chapter_id, completed, completed_at')
      .eq('plan_id', planId)
      .eq('user_id', userId);

    const progressMap = new Map<string, any>();
    progress?.forEach((p) => {
      progressMap.set(p.chapter_id, p);
    });

    const combined = (chaps || []).map((c) => ({
      ...c,
      is_completed: progressMap.get(c.id)?.completed || false,
      completed_at: progressMap.get(c.id)?.completed_at,
    }));

    setChapters(combined);
  };

  useEffect(() => {
    fetchReadingData();
  }, [profile]);

  const todayStr = getCairoDateStr();

  const handleToggleComplete = async (chapter: any) => {
    if (!profile || !activePlan) return;

    // Disallow marking future chapters ahead of time
    if (chapter.assigned_date > todayStr) {
      alert('هذا الإصحاح مجدول لأيام قادمة وسيتم فتحه في موعده المحدد يوم بيوم بنعمة ربنا.');
      return;
    }

    setTogglingId(chapter.id);

    try {
      if (chapter.is_completed) {
        await supabase
          .from('user_reading_progress')
          .delete()
          .eq('chapter_id', chapter.id)
          .eq('user_id', profile.id);
      } else {
        await supabase.from('user_reading_progress').insert({
          chapter_id: chapter.id,
          plan_id: activePlan.id,
          user_id: profile.id,
          completed: true,
          completed_at: new Date().toISOString(),
        });
      }

      setChapters((prev) =>
        prev.map((c) => (c.id === chapter.id ? { ...c, is_completed: !c.is_completed } : c))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  };

  const totalChapters = chapters.length;
  const completedChapters = chapters.filter((c) => c.is_completed).length;

  // Day-by-day categorizations
  const todayChapters = chapters.filter((c) => c.assigned_date === todayStr);
  const availableChapters = chapters.filter((c) => c.assigned_date <= todayStr);
  const overduePastChapters = chapters.filter((c) => c.assigned_date < todayStr && !c.is_completed);
  const futureChapters = chapters.filter((c) => c.assigned_date > todayStr);

  const availableCount = availableChapters.length;
  const completedInAvailable = availableChapters.filter((c) => c.is_completed).length;
  const dayByDayPct = availableCount > 0 ? Math.round((completedInAvailable / availableCount) * 100) : 0;

  const filteredChapters = chapters.filter((c) => {
    if (filterMode === 'today') return c.assigned_date === todayStr;
    if (filterMode === 'day_by_day') return c.assigned_date <= todayStr;
    if (filterMode === 'overdue') return c.assigned_date < todayStr && !c.is_completed;
    if (filterMode === 'completed') return c.is_completed;
    return true; // 'all'
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brown-100 dark:bg-brown-900/60 text-brown-800 dark:text-brown-200 text-xs font-semibold mb-1">
              <BookOpen className="w-3.5 h-3.5 text-brown-600 dark:text-brown-400" />
              <span>الغذاء الروحي اليومي</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-brown-950 dark:text-brown-50">
              برنامج قراءة الكتاب المقدس (يوم بيوم)
            </h1>
          </div>

          {canManage && (
            <Link href="/bible-reading/manage">
              <Button variant="primary" size="md">
                {canEditPlans ? 'إدارة الخطط وتعيين الإصحاحات' : 'إنشاء خطة قراءة جديدة'}
              </Button>
            </Link>
          )}
        </div>

        {/* Plans Switcher (if multiple plans exist) */}
        {plans.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-brown-600 dark:text-brown-400 shrink-0">
              اختر الخطة:
            </span>
            {plans.map((p) => {
              const isSelected = activePlan?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPlan(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-brown-800 text-white shadow-sm'
                      : 'bg-white dark:bg-[#231b15] text-brown-700 dark:text-brown-300 border border-brown-200 dark:border-brown-800 hover:border-brown-400'
                  }`}
                >
                  {p.title}
                </button>
              );
            })}
          </div>
        )}

        {/* Plan Header & Progress Banner */}
        {activePlan && (
          <div className="rounded-2xl bg-gradient-to-l from-brown-800 via-brown-700 to-brown-900 text-white p-6 sm:p-8 shadow-warm-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-200 text-xs font-bold mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>الخطة النشطة حالياً</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">{activePlan.title}</h2>
                <p className="text-xs sm:text-sm text-brown-200 mt-1 max-w-xl leading-relaxed">
                  {activePlan.description || 'التزم بقراءة الإصحاحات اليومية وتأمل في آياتها المباركة.'}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-brown-300 mt-3 font-medium">
                  <span>
                    الفترة: من {formatShortDateArabic(activePlan.start_date)} إلى {formatShortDateArabic(activePlan.end_date)}
                  </span>
                  <span>•</span>
                  <span>إجمالي الخطة: {totalChapters} إصحاحاً (يُفتح إصحاح يومياً تلقائياً)</span>
                </div>
              </div>

              {/* Progress Dial Widget */}
              <div className="bg-white/10 backdrop-blur rounded-2xl p-5 text-center min-w-[210px] border border-white/10 shrink-0">
                <span className="text-xs font-bold text-brown-200 block mb-1">
                  الالتزام اليومي حتى الآن
                </span>
                <div className="text-3xl font-black text-amber-300">%{dayByDayPct}</div>
                <div className="w-full bg-brown-950/40 rounded-full h-2 my-2 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${dayByDayPct}%` }}
                  />
                </div>
                <span className="text-[11px] text-brown-200 font-semibold block">
                  أنجزت {completedInAvailable} من {availableCount} إصحاح متاح حتى اليوم
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Today's Reading Featured Highlight Card */}
        {activePlan && (
          <div className="rounded-2xl p-6 border bg-gradient-to-r from-amber-50/70 via-white to-amber-50/30 dark:from-[#2a1d15] dark:via-[#231b15] dark:to-[#1f1611] border-amber-300/80 dark:border-amber-800/80 shadow-warm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-200/70 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 text-xs font-bold">
                  <Calendar className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  <span>قراءة اليوم ({formatDateArabic(todayStr)})</span>
                </div>

                {todayChapters.length === 0 ? (
                  <div>
                    <h3 className="text-lg font-black text-brown-950 dark:text-brown-50">
                      لا توجد قراءة معينة لليوم
                    </h3>
                    <p className="text-xs text-brown-500 mt-1">
                      يمكنك مراجعة الإصحاحات السابقة أو الاستعداد للإصحاح القادم غداً بنعمة ربنا.
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-brown-950 dark:text-brown-50">
                      {todayChapters.map((tc) => `${tc.book_name} - الإصحاح ${tc.chapter_number}`).join(' ، ')}
                    </h3>
                    <p className="text-xs sm:text-sm text-brown-600 dark:text-brown-400 mt-1 leading-relaxed">
                      {todayChapters.every((tc) => tc.is_completed)
                        ? '«سِرَاجٌ لِرِجْلِي كَلاَمُكَ وَنُورٌ لِسَبِيلِي» (مز 119: 105). مبارك! أتممت قراءة إصحاح اليوم بنعمة المسيح.'
                        : '«لَيْسَ بِالْخُبْزِ وَحْدَهُ يَحْيَا الإِنْسَانُ، بَلْ بِكُلِّ كَلِمَةٍ تَخْرُجُ مِنْ فَمِ اللهِ» (مت 4: 4). خذ وقتاً هادئاً لقراءة آيات اليوم المباركة.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Button for Today */}
              {todayChapters.length > 0 && (
                <div className="shrink-0 flex flex-col gap-2">
                  {todayChapters.map((tc) => (
                    <Button
                      key={tc.id}
                      variant={tc.is_completed ? 'secondary' : 'primary'}
                      size="lg"
                      onClick={() => handleToggleComplete(tc)}
                      disabled={togglingId === tc.id}
                      leftIcon={
                        tc.is_completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Check className="w-5 h-5" />
                        )
                      }
                      className={`font-bold transition-all shadow-warm cursor-pointer ${
                        tc.is_completed
                          ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      {tc.is_completed
                        ? '✓ تم قراءة إصحاح اليوم (انقر للإلغاء)'
                        : 'اضغط هنا بعد قراءة الإصحاح لتأكيد القراءة'}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="text-center p-4">
            <span className="text-xs text-brown-600 dark:text-brown-400 font-bold block mb-1">
              قراءة اليوم
            </span>
            <span className="text-base sm:text-lg font-black text-brown-950 dark:text-brown-50">
              {todayChapters.length > 0
                ? todayChapters.every((c) => c.is_completed)
                  ? 'تمت بنجاح ✓'
                  : 'بانتظار قراءتك'
                : 'لا توجد قراءة'}
            </span>
          </Card>

          <Card className="text-center p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
            <span className="text-xs text-emerald-800 dark:text-emerald-300 font-bold block mb-1">
              إصحاحات قرأتها
            </span>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {completedChapters}
            </span>
          </Card>

          <Card className="text-center p-4 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <span className="text-xs text-amber-800 dark:text-amber-300 font-bold block mb-1">
              المتاح حتى اليوم
            </span>
            <span className="text-2xl font-black text-amber-700 dark:text-amber-400">
              {availableCount}
            </span>
          </Card>

          <Card className="text-center p-4">
            <span className="text-xs text-brown-600 dark:text-brown-400 font-bold block mb-1">
              إجمالي أيام الخطة
            </span>
            <span className="text-2xl font-black text-brown-950 dark:text-brown-50">
              {totalChapters} يوماً
            </span>
          </Card>
        </div>

        {/* Chapters Filters and List */}
        <Card className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-brown-100 dark:border-brown-900/60">
            <div>
              <h3 className="font-bold text-base text-brown-950 dark:text-brown-50">
                جدول الإصحاحات اليومية
              </h3>
              <p className="text-[11px] text-brown-500 mt-0.5">
                تظهر الإصحاحات يوم بيوم حسب التقويم لتثبيت عادة القراءة اليومية
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setFilterMode('day_by_day')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  filterMode === 'day_by_day'
                    ? 'bg-brown-700 text-white'
                    : 'text-brown-700 dark:text-brown-300 hover:bg-brown-50 dark:hover:bg-brown-900/40'
                }`}
              >
                المتاح حتى اليوم ({availableCount})
              </button>
              <button
                onClick={() => setFilterMode('today')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  filterMode === 'today'
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/40'
                }`}
              >
                قراءة اليوم ({todayChapters.length})
              </button>
              {overduePastChapters.length > 0 && (
                <button
                  onClick={() => setFilterMode('overdue')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    filterMode === 'overdue'
                      ? 'bg-rose-600 text-white'
                      : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/40'
                  }`}
                >
                  متأخرات سابقة ({overduePastChapters.length})
                </button>
              )}
              <button
                onClick={() => setFilterMode('completed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  filterMode === 'completed'
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/40'
                }`}
              >
                مكتمل ({completedChapters})
              </button>
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  filterMode === 'all'
                    ? 'bg-brown-900 text-white'
                    : 'text-brown-500 hover:bg-brown-50 dark:hover:bg-brown-900/40'
                }`}
              >
                الخطة الكاملة ({totalChapters})
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : filteredChapters.length === 0 ? (
            <p className="text-xs text-brown-500 text-center py-10">
              لا توجد إصحاحات مطابقة للتصفية المختارة.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredChapters.map((ch) => {
                const isToday = ch.assigned_date === todayStr;
                const isOverdue = ch.assigned_date < todayStr && !ch.is_completed;
                const isFuture = ch.assigned_date > todayStr;

                return (
                  <div
                    key={ch.id}
                    className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                      ch.is_completed
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                        : isToday
                        ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 shadow-xs'
                        : isOverdue
                        ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                        : isFuture
                        ? 'bg-brown-50/20 dark:bg-brown-950/20 border-brown-200/60 dark:border-brown-800/40 opacity-70'
                        : 'bg-white dark:bg-[#231b15] border-brown-200 dark:border-brown-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleComplete(ch)}
                        disabled={togglingId === ch.id || isFuture}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                          isFuture
                            ? 'bg-brown-100 dark:bg-brown-900/50 text-brown-400 cursor-not-allowed border border-brown-200 dark:border-brown-800'
                            : ch.is_completed
                            ? 'bg-emerald-600 text-white shadow-sm cursor-pointer'
                            : 'border-2 border-brown-300 dark:border-brown-700 hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer'
                        }`}
                        title={
                          isFuture
                            ? 'يفتح في موعده المحدد'
                            : ch.is_completed
                            ? 'إلغاء التأشير'
                            : 'تعليم كمكتمل'
                        }
                      >
                        {isFuture ? (
                          <Lock className="w-4 h-4 text-brown-400" />
                        ) : (
                          ch.is_completed && <Check className="w-5 h-5 stroke-[3]" />
                        )}
                      </button>

                      <div>
                        <h4 className="text-sm font-bold text-brown-950 dark:text-brown-50 flex items-center gap-1.5">
                          <span>{ch.book_name} - الإصحاح {ch.chapter_number}</span>
                          {isFuture && <Lock className="w-3.5 h-3.5 text-brown-400 inline" />}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-brown-500">
                            {formatDateArabic(ch.assigned_date)}
                          </span>
                          {isToday && (
                            <Badge variant="warning" size="sm">
                              اليوم
                            </Badge>
                          )}
                          {isOverdue && (
                            <Badge variant="danger" size="sm">
                              متأخر
                            </Badge>
                          )}
                          {isFuture && (
                            <Badge variant="default" size="sm">
                              قادم
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant={isFuture ? 'default' : ch.is_completed ? 'success' : isOverdue ? 'danger' : 'default'}
                      size="sm"
                    >
                      {isFuture ? 'يفتح في موعده' : ch.is_completed ? 'تمت القراءة' : isOverdue ? 'متأخر' : 'لم تقرأ بعد'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}

          {/* Next Chapter Teaser (only shown when in Day by Day view) */}
          {filterMode === 'day_by_day' && futureChapters.length > 0 && (
            <div className="mt-4 p-4 rounded-xl border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  الإصحاح التالي: <strong>{futureChapters[0].book_name} - الإصحاح {futureChapters[0].chapter_number}</strong>
                </span>
              </div>
              <span className="font-bold text-amber-700 dark:text-amber-400">
                🔒 يفتح غداً تلقائياً ({formatDateArabic(futureChapters[0].assigned_date)})
              </span>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
