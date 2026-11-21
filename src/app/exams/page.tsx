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
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Plus,
  ShieldCheck,
  FileQuestion,
} from 'lucide-react';
import { formatDateArabic } from '@/lib/utils/formatters';

export default function ExamsListPage() {
  const { profile, role, hasPermission } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const canManage =
    role === 'super_admin' || hasPermission('create_exams') || hasPermission('edit_exams');

  useEffect(() => {
    const fetchExams = async () => {
      if (!profile) return;
      try {
        setIsLoading(true);

        // Fetch published exams (or all exams if admin)
        let query = supabase
          .from('exams')
          .select('*, exam_submissions(id, user_id, total_score, is_graded)')
          .order('created_at', { ascending: false });

        if (!canManage) {
          query = query.eq('is_published', true);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Check if current user has submission
        const formatted = (data || []).map((e) => {
          const userSub = e.exam_submissions?.find((s: any) => s.user_id === profile.id);
          return {
            ...e,
            is_submitted: !!userSub,
            submission: userSub,
          };
        });

        setExams(formatted);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExams();
  }, [profile, canManage]);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brown-100 dark:bg-brown-900/60 text-brown-800 dark:text-brown-200 text-xs font-semibold mb-1">
              <Award className="w-3.5 h-3.5 text-brown-600 dark:text-brown-400" />
              <span>التقييمات الروحية</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-brown-950 dark:text-brown-50">
              اختبارات فصول الكتاب المقدس
            </h1>
            <p className="text-xs sm:text-sm text-brown-600 dark:text-brown-400 mt-1">
              اختبر استيعابك وتأملك في معاني الأسفار المقدسة
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {canManage && (
              <Link href="/exams/manage">
                <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
                  إنشاء امتحان جديد
                </Button>
              </Link>
            )}

            {role === 'super_admin' && (
              <Link href="/exams/permissions">
                <Button variant="secondary" size="md" leftIcon={<ShieldCheck className="w-4 h-4" />}>
                  صلاحيات الامتحانات
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Exams Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        ) : exams.length === 0 ? (
          <Card className="p-12 text-center">
            <Award className="w-12 h-12 text-brown-400 mx-auto mb-3 opacity-60" />
            <h3 className="font-bold text-base text-brown-950 dark:text-brown-50 mb-1">
              لا توجد اختبارات منشورة حالياً
            </h3>
            <p className="text-xs text-brown-500 max-w-sm mx-auto">
              سيتم نشر اختبارات جديدة قريباً لمتابعة دراسة الكتاب المقدس.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((exam) => {
              const isPassed = exam.is_submitted && exam.submission?.total_score >= exam.pass_score;

              return (
                <Card key={exam.id} hoverEffect className="flex flex-col justify-between p-5">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                        {exam.book_name} - الإصحاح {exam.chapter_number}
                      </span>
                      {exam.is_submitted ? (
                        <Badge variant={isPassed ? 'success' : 'danger'} size="sm" dot>
                          {isPassed ? 'ناجح' : 'لم يوفق'} ({exam.submission?.total_score} درجة)
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm">
                          متاح للتقديم
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-base font-black text-brown-950 dark:text-brown-50 mb-1.5 leading-snug">
                      {exam.title}
                    </h3>

                    <p className="text-xs text-brown-600 dark:text-brown-400 line-clamp-2 leading-relaxed mb-4">
                      {exam.description || 'اختبار في مفاهيم وتأملات الإصحاح المقرر.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-brown-100 dark:border-brown-900/60 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[11px] text-brown-500">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        {exam.duration_minutes} دقيقة
                      </span>
                      <span>درجة النجاح: {exam.pass_score}%</span>
                    </div>

                    {exam.is_submitted ? (
                      <Link href={`/exams/${exam.id}/result`}>
                        <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
                          عرض نتيجتك
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/exams/${exam.id}`}>
                        <Button variant="primary" size="sm" leftIcon={<Award className="w-3.5 h-3.5" />}>
                          بدء الاختبار
                        </Button>
                      </Link>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
