'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardHeader } from '@/components/ui/Card';
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
  Flame,
  ArrowRight,
  BookmarkCheck,
  AlertCircle,
} from 'lucide-react';
import { formatShortDateArabic, formatDateArabic } from '@/lib/utils/formatters';

export default function BibleReadingPage() {
  const { profile, hasPermission, role } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'today' | 'completed' | 'remaining'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const canManage =
    role === 'super_admin' ||
    hasPermission('create_reading_plans') ||
    hasPermission('edit_reading_plans');

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
        const curPlan = activePlan || pList[0];
        setActivePlan(curPlan);
        await loadPlanChapters(curPlan.id, profile.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
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

  const handleToggleComplete = async (chapter: any) => {
    if (!profile || !activePlan) return;
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

  const todayStr = new Date().toISOString().split('T')[0];

  const totalChapters = chapters.length;
  const completedChapters = chapters.filter((c) => c.is_completed).length;
  const remainingChapters = totalChapters - completedChapters;
  const progressPct = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  const filteredChapters = chapters.filter((c) => {
    if (filterMode === 'today') return c.assigned_date === todayStr;
    if (filterMode === 'completed') return c.is_completed;
    if (filterMode === 'remaining') return !c.is_completed;
    return true;
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
              خطط قراءة ودراسة الكتاب المقدس
            </h1>
          </div>

          {canManage && (
            <Link href="/bible-reading/manage">
              <Button variant="primary" size="md">
                إدارة الخطط وتعيين الإصحاحات
              </Button>
            </Link>
          )}
        </div>

        {/* Plan Header & Progress Banner */}
        {activePlan && (
          <div className="rounded-2xl bg-gradient-to-l from-brown-800 via-brown-700 to-brown-900 text-white p-6 sm:p-8 shadow-warm-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="text-xs font-bold text-amber-200 block mb-1">
                  الخطة النشطة حالياً
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">{activePlan.title}</h2>
                <p className="text-xs sm:text-sm text-brown-200 mt-1 max-w-xl leading-relaxed">
                  {activePlan.description || 'التزم بقراءة الإصحاحات اليومية وتأمل في آياتها المباركة.'}
                </p>
                <span className="text-[11px] text-brown-300 block mt-2">
                  الفترة: من {formatShortDateArabic(activePlan.start_date)} إلى{' '}
                  {formatShortDateArabic(activePlan.end_date)}
                </span>
              </div>

              {/* Progress Dial Widget */}
              <div className="bg-white/10 backdrop-blur rounded-2xl p-5 text-center min-w-[200px] border border-white/10 shrink-0">
                <span className="text-xs font-bold text-brown-200 block mb-1">نسبة إنجازك</span>
                <div className="text-3xl font-black text-amber-300">%{progressPct}</div>
                <div className="w-full bg-brown-950/40 rounded-full h-2 my-2 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-[11px] text-brown-200 font-semibold">
                  أنجزت {completedChapters} من {totalChapters} إصحاح
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="text-center p-4">
            <span className="text-xs text-brown-600 dark:text-brown-400 font-bold block mb-1">
              إجمالي الإصحاحات
            </span>
            <span className="text-2xl font-black text-brown-950 dark:text-brown-50">
              {totalChapters}
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
              متبقي في الخطة
            </span>
            <span className="text-2xl font-black text-amber-700 dark:text-amber-400">
              {remainingChapters}
            </span>
          </Card>

          <Card className="text-center p-4">
            <span className="text-xs text-brown-600 dark:text-brown-400 font-bold block mb-1">
              قراءات اليوم
            </span>
            <span className="text-2xl font-black text-brown-950 dark:text-brown-50">
              {chapters.filter((c) => c.assigned_date === todayStr).length}
            </span>
          </Card>
        </div>

        {/* Chapters Filters and List */}
        <Card className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-brown-100 dark:border-brown-900/60">
            <h3 className="font-bold text-base text-brown-950 dark:text-brown-50">
              جدول الإصحاحات اليومية
            </h3>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-brown-700 text-white'
                    : 'text-brown-700 dark:text-brown-300 hover:bg-brown-50'
                }`}
              >
                الكل ({totalChapters})
              </button>
              <button
                onClick={() => setFilterMode('today')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  filterMode === 'today'
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50'
                }`}
              >
                قراءة اليوم ({chapters.filter((c) => c.assigned_date === todayStr).length})
              </button>
              <button
                onClick={() => setFilterMode('remaining')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  filterMode === 'remaining'
                    ? 'bg-brown-700 text-white'
                    : 'text-brown-700 dark:text-brown-300 hover:bg-brown-50'
                }`}
              >
                متبقي ({remainingChapters})
              </button>
              <button
                onClick={() => setFilterMode('completed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  filterMode === 'completed'
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50'
                }`}
              >
                مكتمل ({completedChapters})
              </button>
            </div>
          </div>

          {filteredChapters.length === 0 ? (
            <p className="text-xs text-brown-500 text-center py-10">
              لا توجد إصحاحات مطابقة للتصفية المختارة.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredChapters.map((ch) => {
                const isToday = ch.assigned_date === todayStr;
                const isOverdue = ch.assigned_date < todayStr && !ch.is_completed;

                return (
                  <div
                    key={ch.id}
                    className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                      ch.is_completed
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                        : isToday
                        ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700'
                        : isOverdue
                        ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                        : 'bg-white dark:bg-[#231b15] border-brown-200 dark:border-brown-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleComplete(ch)}
                        disabled={togglingId === ch.id}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          ch.is_completed
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'border-2 border-brown-300 dark:border-brown-700 hover:border-emerald-500 hover:bg-emerald-50'
                        }`}
                        title={ch.is_completed ? 'إلغاء التأشير' : 'تعليم كمكتمل'}
                      >
                        {ch.is_completed && <Check className="w-5 h-5 stroke-[3]" />}
                      </button>

                      <div>
                        <h4 className="text-sm font-bold text-brown-950 dark:text-brown-50">
                          {ch.book_name} - الإصحاح {ch.chapter_number}
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
                        </div>
                      </div>
                    </div>

                    <Badge variant={ch.is_completed ? 'success' : 'default'} size="sm">
                      {ch.is_completed ? 'تمت القراءة' : 'لم تقرأ بعد'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
