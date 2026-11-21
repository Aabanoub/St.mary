'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Award, CheckCircle2, XCircle, ArrowLeft, RotateCcw, Calendar } from 'lucide-react';
import { formatDateArabic } from '@/lib/utils/formatters';

export default function ExamResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: examId } = use(params);
  const { profile } = useAuth();
  const [exam, setExam] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [maxScore, setMaxScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      if (!profile) return;
      try {
        setIsLoading(true);

        // Fetch Exam
        const { data: eData } = await supabase.from('exams').select('*').eq('id', examId).single();
        setExam(eData);

        // Fetch submission
        const { data: subData } = await supabase
          .from('exam_submissions')
          .select('*')
          .eq('exam_id', examId)
          .eq('user_id', profile.id)
          .single();

        setSubmission(subData);

        // Fetch answers with question details
        if (subData) {
          const { data: ansData } = await supabase
            .from('exam_answers')
            .select('*, question:exam_questions(*, exam_options(*))')
            .eq('submission_id', subData.id);

          setAnswers(ansData || []);
        }

        // Calculate max score
        const { data: qData } = await supabase
          .from('exam_questions')
          .select('score')
          .eq('exam_id', examId);

        const total = qData?.reduce((acc, q) => acc + (q.score || 0), 0) || 0;
        setMaxScore(total);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResult();
  }, [examId, profile]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  const userScore = submission?.total_score || 0;
  const isPassed = maxScore > 0 ? (userScore / maxScore) * 100 >= (exam?.pass_score || 60) : false;
  const percentage = maxScore > 0 ? Math.round((userScore / maxScore) * 100) : 0;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Celebration / Result Card */}
        <div
          className={`rounded-3xl p-6 sm:p-8 text-center border-2 shadow-warm-xl ${
            isPassed
              ? 'bg-gradient-to-b from-emerald-50 via-white to-emerald-50/30 border-emerald-300 dark:from-emerald-950/40 dark:via-[#231b15] dark:to-[#231b15] dark:border-emerald-800'
              : 'bg-gradient-to-b from-amber-50 via-white to-amber-50/30 border-amber-300 dark:from-amber-950/40 dark:via-[#231b15] dark:to-[#231b15] dark:border-amber-800'
          }`}
        >
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm ${
              isPassed
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-300'
            }`}
          >
            {isPassed ? <CheckCircle2 className="w-10 h-10" /> : <Award className="w-10 h-10" />}
          </div>

          <Badge variant={isPassed ? 'success' : 'warning'} size="md" className="mb-2">
            {isPassed ? 'مبروك! اجتزت الاختبار بنجاح' : 'تم تسليم الاختبار'}
          </Badge>

          <h1 className="text-xl sm:text-2xl font-black text-brown-950 dark:text-brown-50 mb-1">
            {exam?.title}
          </h1>
          <p className="text-xs text-brown-600 dark:text-brown-400">
            {exam?.book_name} - الإصحاح {exam?.chapter_number}
          </p>

          {/* Big Score Display */}
          <div className="my-6 p-4 rounded-2xl bg-white dark:bg-[#1a130e] border border-brown-200 dark:border-brown-900/80 inline-block min-w-[200px]">
            <span className="text-xs font-bold text-brown-500 block mb-1">الدرجة المحققة</span>
            <div className="text-4xl font-black text-brown-950 dark:text-brown-50 font-mono">
              {userScore} <span className="text-xl text-brown-400">/ {maxScore}</span>
            </div>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400 block mt-1">
              النسبة المئوية: %{percentage}
            </span>
          </div>

          <p className="text-xs text-brown-600 dark:text-brown-400 max-w-sm mx-auto mb-6">
            {isPassed
              ? 'أحسنت! استيعاب رائع لكلمة الله وإعلان إيماني مبارك.'
              : 'بارك الله في مجهودك. داوم على القراءة والتأمل المستمر في الأسفار الإلهية.'}
          </p>

          <div className="flex items-center justify-center gap-3">
            <Link href="/exams">
              <Button variant="primary" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                العودة لقائمة الامتحانات
              </Button>
            </Link>
          </div>
        </div>

        {/* Answer Breakdown */}
        {answers.length > 0 && (
          <Card className="space-y-4">
            <CardHeader
              title="مراجعة الإجابات المسلمة"
              subtitle={`${answers.length} سؤال تم تقديم إجاباتها`}
              icon={<Award className="w-5 h-5" />}
            />

            <div className="space-y-3">
              {answers.map((ans, i) => {
                const q = ans.question;
                const selectedOpt = q?.exam_options?.find(
                  (o: any) => o.id === ans.selected_option_id
                );

                return (
                  <div
                    key={ans.id}
                    className={`p-4 rounded-xl border ${
                      ans.is_correct
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-brown-50/40 dark:bg-brown-950/20 border-brown-200 dark:border-brown-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="text-xs sm:text-sm font-bold text-brown-950 dark:text-brown-50">
                        {i + 1}. {q?.question_text}
                      </h4>
                      <Badge variant={ans.is_correct ? 'success' : 'default'} size="sm">
                        {ans.score_awarded} من {q?.score} درجة
                      </Badge>
                    </div>

                    <p className="text-xs text-brown-700 dark:text-brown-300">
                      <span className="font-bold">إجابتك:</span>{' '}
                      {selectedOpt ? selectedOpt.option_text : ans.text_answer || 'لم تتم الإجابة'}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
