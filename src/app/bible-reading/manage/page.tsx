'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { BookOpen, Plus, Trash2, Edit2, Calendar, ArrowLeft, AlertTriangle } from 'lucide-react';
import { formatDateArabic, formatShortDateArabic } from '@/lib/utils/formatters';

const COPTIC_BIBLE_BOOKS = [
  'إنجيل متى',
  'إنجيل مرقس',
  'إنجيل لوقا',
  'إنجيل يوحنا',
  'سفر أعمال الرسل',
  'رسالة رومية',
  'رسالة كورنثوس الأولى',
  'رسالة كورنثوس الثانية',
  'رسالة غلاطية',
  'رسالة أفسس',
  'رسالة فيلبي',
  'رسالة كولوسي',
  'رسالة تسالونيكي الأولى',
  'رسالة تسالونيكي الثانية',
  'رسالة تيموثاوس الأولى',
  'رسالة تيموثاوس الثانية',
  'رسالة تيطس',
  'رسالة فليمون',
  'رسالة العبرانيين',
  'رسالة يعقوب',
  'رسالة بطرس الأولى',
  'رسالة بطرس الثانية',
  'رسالة يوحنا الأولى',
  'رسالة يوحنا الثانية',
  'رسالة يوحنا الثالثة',
  'رسالة يهوذا',
  'سفر الرؤيا',
  'سفر التكوين',
  'سفر الخروج',
  'سفر اللاويين',
  'سفر العدد',
  'سفر التثنية',
  'سفر المزامير',
  'سفر الأمثال',
  'سفر إشعياء',
];

export default function ManageReadingPlansPage() {
  const { role, hasPermission, profile } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Plan Modal state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planTitle, setPlanTitle] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planStartDate, setPlanStartDate] = useState('');
  const [planEndDate, setPlanEndDate] = useState('');
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Add Chapter Modal state
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(COPTIC_BIBLE_BOOKS[0]);
  const [startChapterNum, setStartChapterNum] = useState(1);
  const [endChapterNum, setEndChapterNum] = useState(1);
  const [assignStartDate, setAssignStartDate] = useState('');
  const [isAddingChapters, setIsAddingChapters] = useState(false);
  const [isDeletingPlanId, setIsDeletingPlanId] = useState<string | null>(null);

  const isSuperAdmin = role === 'super_admin';
  const canCreatePlans = isSuperAdmin || hasPermission('create_reading_plans');
  const canEditPlans = isSuperAdmin || hasPermission('edit_reading_plans');
  const canManage = canCreatePlans || canEditPlans;

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('reading_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);

      if (data && data.length > 0) {
        const cur = selectedPlan ? data.find((p) => p.id === selectedPlan.id) || data[0] : data[0];
        setSelectedPlan(cur);
        await loadChapters(cur.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChapters = async (planId: string) => {
    const { data } = await supabase
      .from('reading_plan_chapters')
      .select('*')
      .eq('plan_id', planId)
      .order('assigned_date', { ascending: true })
      .order('chapter_number', { ascending: true });

    setChapters(data || []);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSelectPlan = async (p: any) => {
    setSelectedPlan(p);
    await loadChapters(p.id);
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreatePlans) {
      alert('ليس لديك صلاحية لإنشاء خطة قراءة جديدة.');
      return;
    }
    if (!planTitle || !planStartDate || !planEndDate) return;
    setIsSavingPlan(true);

    try {
      const { data, error } = await supabase
        .from('reading_plans')
        .insert({
          title: planTitle,
          description: planDescription,
          start_date: planStartDate,
          end_date: planEndDate,
          is_active: true,
          created_by: profile?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setIsPlanModalOpen(false);
      setPlanTitle('');
      setPlanDescription('');
      await fetchPlans();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'حدث خطأ في حفظ الخطة');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleAddChaptersBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditPlans) {
      alert('ليس لديك صلاحية لتعديل خطة القراءة أو تعيين إصحاحات جديدة بها.');
      return;
    }
    if (!selectedPlan || !assignStartDate) return;
    setIsAddingChapters(true);

    try {
      const rows = [];
      const curDate = new Date(assignStartDate);

      for (let ch = startChapterNum; ch <= endChapterNum; ch++) {
        const dateStr = curDate.toISOString().split('T')[0];
        rows.push({
          plan_id: selectedPlan.id,
          book_name: selectedBook,
          chapter_number: ch,
          assigned_date: dateStr,
        });
        // increment by 1 day for each chapter
        curDate.setDate(curDate.getDate() + 1);
      }

      const { error } = await supabase.from('reading_plan_chapters').insert(rows);
      if (error) throw error;

      setIsChapterModalOpen(false);
      await loadChapters(selectedPlan.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'حدث خطأ في تعيين الإصحاحات');
    } finally {
      setIsAddingChapters(false);
    }
  };

  const handleDeleteChapter = async (chapId: string) => {
    if (!canEditPlans) {
      alert('ليس لديك صلاحية لحذف إصحاحات من خطة القراءة.');
      return;
    }
    if (!confirm('هل ترغب بحذف هذا الإصحاح من الخطة؟')) return;
    await supabase.from('reading_plan_chapters').delete().eq('id', chapId);
    if (selectedPlan) await loadChapters(selectedPlan.id);
  };

  const handleDeletePlan = async (plan: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!canEditPlans) {
      alert('ليس لديك صلاحية لحذف خطط القراءة.');
      return;
    }

    if (
      !confirm(
        `هل أنت متأكد من رغبتك بحذف خطة «${plan.title}»؟\n\nتنبيه: سيتم حذف الخطة وجميع إصحاحاتها وسجلات قراءة المخدومين المرتبطة بها نهائياً ولا يمكن التراجع عن ذلك.`
      )
    ) {
      return;
    }

    setIsDeletingPlanId(plan.id);

    try {
      const { error } = await supabase.from('reading_plans').delete().eq('id', plan.id);
      if (error) throw error;

      // Log activity
      await supabase.from('activity_logs').insert({
        actor_id: profile?.id,
        action: 'DELETE_READING_PLAN',
        entity_type: 'reading_plan',
        entity_id: plan.id,
        details: { plan_title: plan.title },
      });

      // Update local state
      const remaining = plans.filter((p) => p.id !== plan.id);
      setPlans(remaining);

      if (selectedPlan?.id === plan.id) {
        const next = remaining.length > 0 ? remaining[0] : null;
        setSelectedPlan(next);
        if (next) {
          await loadChapters(next.id);
        } else {
          setChapters([]);
        }
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'حدث خطأ أثناء حذف الخطة');
    } finally {
      setIsDeletingPlanId(null);
    }
  };

  if (!canManage) {
    return (
      <AppShell>
        <div className="p-8 text-center bg-white dark:bg-[#231b15] rounded-2xl border border-brown-200">
          <p className="text-sm font-bold text-rose-600">
            ليس لديك صلاحية لإدارة خطط القراءة. يرجى مراجعة المشرف العام.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brown-100 dark:bg-brown-900/60 text-brown-800 dark:text-brown-200 text-xs font-semibold mb-1">
              <BookOpen className="w-3.5 h-3.5 text-brown-600 dark:text-brown-400" />
              <span>إدارة المناهج والخطط</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-brown-950 dark:text-brown-50">
              إدارة خطط قراءة الكتاب المقدس
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/bible-reading">
              <Button variant="outline" size="md">
                عرض تجربة المخدوم
              </Button>
            </Link>
            {canCreatePlans && (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  const now = new Date();
                  setPlanStartDate(now.toISOString().split('T')[0]);
                  const nextMonth = new Date();
                  nextMonth.setDate(nextMonth.getDate() + 30);
                  setPlanEndDate(nextMonth.toISOString().split('T')[0]);
                  setIsPlanModalOpen(true);
                }}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                خطة قراءة جديدة
              </Button>
            )}
          </div>
        </div>

        {/* Permission Warning Banner if can create but cannot edit */}
        {!canEditPlans && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs font-semibold text-amber-950 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>وضع الصلاحيات المقيد:</strong> ليس لديك صلاحية تعديل خطط القراءة الحالية أو إضافة وحذف الإصحاحات منها. صلاحيتك الحالية تتيح فقط تأليف خطة جديدة.
            </span>
          </div>
        )}

        {/* Layout: Plans List & Plan Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Plans List */}
          <Card className="lg:col-span-1">
            <CardHeader
              title="خطط القراءة"
              subtitle="اختر خطة لعرض وإدارة إصحاحاتها"
              icon={<BookOpen className="w-5 h-5" />}
            />

            {plans.length === 0 ? (
              <p className="text-xs text-brown-500 text-center py-6">لا توجد خطط قراءة مسجلة.</p>
            ) : (
              <div className="space-y-2.5">
                {plans.map((p) => {
                  const isSelected = selectedPlan?.id === p.id;
                  const isDeleting = isDeletingPlanId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPlan(p)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                        isSelected
                          ? 'border-brown-600 bg-brown-50 dark:bg-brown-900/40 shadow-sm'
                          : 'border-brown-200 dark:border-brown-800 hover:border-brown-400 bg-white dark:bg-[#231b15]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-sm font-bold text-brown-950 dark:text-brown-50 truncate flex-1">
                          {p.title}
                        </h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant={p.is_active ? 'success' : 'default'} size="sm">
                            {p.is_active ? 'نشطة' : 'متوقفة'}
                          </Badge>
                          {canEditPlans && (
                            <button
                              type="button"
                              onClick={(e) => handleDeletePlan(p, e)}
                              disabled={isDeleting}
                              className="p-1 rounded-md text-brown-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title={`حذف خطة ${p.title}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-brown-500 line-clamp-1 mb-2">
                        {p.description || 'بدون وصف'}
                      </p>
                      <span className="text-[10px] text-brown-400 font-mono">
                        {formatShortDateArabic(p.start_date)} - {formatShortDateArabic(p.end_date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Chapters Management for Selected Plan */}
          <Card className="lg:col-span-2">
            <CardHeader
              title={selectedPlan ? `إصحاحات: ${selectedPlan.title}` : 'الإصحاحات المعينة'}
              subtitle={selectedPlan ? `${chapters.length} إصحاح معين بالخطة` : ''}
              icon={<Calendar className="w-5 h-5" />}
              action={
                selectedPlan && canEditPlans ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePlan(selectedPlan)}
                      disabled={isDeletingPlanId === selectedPlan.id}
                      leftIcon={<Trash2 className="w-4 h-4 text-rose-500" />}
                      className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900 font-bold"
                    >
                      حذف الخطة
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setAssignStartDate(new Date().toISOString().split('T')[0]);
                        setIsChapterModalOpen(true);
                      }}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      تعيين إصحاحات
                    </Button>
                  </div>
                ) : null
              }
            />

            {chapters.length === 0 ? (
              <p className="text-xs text-brown-500 text-center py-12">
                لم يتم تعيين أي إصحاحات لهذه الخطة بعد. اضغط على &quot;تعيين إصحاحات&quot; للبدء!
              </p>
            ) : (
              <div className="divide-y divide-brown-100 dark:divide-brown-900/60 max-h-[500px] overflow-y-auto">
                {chapters.map((ch) => (
                  <div key={ch.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-brown-950 dark:text-brown-50">
                        {ch.book_name} - الإصحاح {ch.chapter_number}
                      </h4>
                      <span className="text-[11px] text-brown-500">
                        التاريخ المعين: {formatDateArabic(ch.assigned_date)}
                      </span>
                    </div>

                    {canEditPlans && (
                      <button
                        onClick={() => handleDeleteChapter(ch.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="حذف الإصحاح"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Modal: Create Reading Plan */}
        <Modal
          isOpen={isPlanModalOpen}
          onClose={() => setIsPlanModalOpen(false)}
          title="إنشاء خطة قراءة جديدة"
          maxWidth="md"
        >
          <form onSubmit={handleCreatePlan} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                اسم الخطة
              </label>
              <input
                type="text"
                value={planTitle}
                onChange={(e) => setPlanTitle(e.target.value)}
                placeholder="مثال: دراسة إنجيل القديس متى"
                className="w-full py-2 px-3 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brown-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                وصف وتأمل الخطة
              </label>
              <textarea
                value={planDescription}
                onChange={(e) => setPlanDescription(e.target.value)}
                rows={2}
                placeholder="أهداف الخطة والتشجيع الروحي للخدام"
                className="w-full py-2 px-3 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brown-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                  تاريخ البداية
                </label>
                <input
                  type="date"
                  value={planStartDate}
                  onChange={(e) => setPlanStartDate(e.target.value)}
                  className="w-full py-2 px-3 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                  تاريخ النهاية
                </label>
                <input
                  type="date"
                  value={planEndDate}
                  onChange={(e) => setPlanEndDate(e.target.value)}
                  className="w-full py-2 px-3 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-sm font-semibold"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-brown-100">
              <Button variant="ghost" size="md" type="button" onClick={() => setIsPlanModalOpen(false)}>
                إلغاء
              </Button>
              <Button variant="primary" size="md" type="submit" isLoading={isSavingPlan}>
                حفظ الخطة
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Assign Chapters Batch */}
        <Modal
          isOpen={isChapterModalOpen}
          onClose={() => setIsChapterModalOpen(false)}
          title={`تعيين إصحاحات لخطة: ${selectedPlan?.title}`}
          maxWidth="md"
        >
          <form onSubmit={handleAddChaptersBatch} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                سفر الكتاب المقدس
              </label>
              <select
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
                className="w-full py-2 px-3 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brown-600"
              >
                {COPTIC_BIBLE_BOOKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                  من إصحاح
                </label>
                <input
                  type="number"
                  min={1}
                  max={150}
                  value={startChapterNum}
                  onChange={(e) => setStartChapterNum(parseInt(e.target.value) || 1)}
                  className="w-full py-2 px-3 bg-brown-50/50 border border-brown-300 rounded-xl text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                  إلى إصحاح
                </label>
                <input
                  type="number"
                  min={startChapterNum}
                  max={150}
                  value={endChapterNum}
                  onChange={(e) => setEndChapterNum(parseInt(e.target.value) || 1)}
                  className="w-full py-2 px-3 bg-brown-50/50 border border-brown-300 rounded-xl text-sm font-semibold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                تاريخ بداية التعيين (إصحاح واحد يومياً)
              </label>
              <input
                type="date"
                value={assignStartDate}
                onChange={(e) => setAssignStartDate(e.target.value)}
                className="w-full py-2 px-3 bg-brown-50/50 border border-brown-300 rounded-xl text-sm font-semibold"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-brown-100">
              <Button variant="ghost" size="md" type="button" onClick={() => setIsChapterModalOpen(false)}>
                إلغاء
              </Button>
              <Button variant="primary" size="md" type="submit" isLoading={isAddingChapters}>
                إضافة الإصحاحات وتعيين المواعيد
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
