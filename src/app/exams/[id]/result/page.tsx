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
import {
  Award,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Clock,
  MessageSquare,
  ShieldCheck,
  Calendar,
  AlertCircle,
} from 'lucide-react';
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
          .select('*, grader:graded_by(full_name)')
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

  const isGraded = submission?.is_graded === true;
  const userScore = submission?.total_score || 0;
  const isPassed = isGraded && maxScore > 0 ? (userScore / maxScore) * 100 >= (exam?.pass_score || 60) : false;
  const percentage = isGraded && maxScore > 0 ? Math.round((userScore / maxScore) * 100) : 0;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Celebration / Result / Pending Card */}
        <div
          className={`rounded-3xl p-6 sm:p-8 text-center border-2 shadow-warm-xl ${
            !isGraded
              ? 'bg-gradient-to-b from-amber-50 via-white to-amber-50/20 border-amber-300 dark:from-amber-950/40 dark:via-[#231b15] dark:to-[#231b15] dark:border-amber-800'
              : isPassed
              ? 'bg-gradient-to-b from-emerald-50 via-white to-emerald-50/30 border-emerald-300 dark:from-emerald-950/40 dark:via-[#231b15] dark:to-[#231b15] dark:border-emerald-800'
              : 'bg-gradient-to-b from-rose-50 via-white to-rose-50/20 border-rose-300 dark:from-rose-950/40 dark:via-[#231b15] dark:to-[#231b15] dark:border-rose-800'
          }`}
        >
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm ${
              !isGraded
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 animate-pulse'
                : isPassed
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300'
                : 'bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300'
            }`}
          >
            {!isGraded ? (
              <Clock className="w-10 h-10" />
            ) : isPassed ? (
              <CheckCircle2 className="w-10 h-10" />
            ) : (
              <Award className="w-10 h-10" />
            )}
          </div>

          <Badge
            variant={!isGraded ? 'warning' : isPassed ? 'success' : 'danger'}
            size="md"
            className="mb-2"
          >
            {!isGraded
              ? 'تم تسليم الامتحان — قيد التصحيح والمراجعة'
              : isPassed
              ? 'مبروك! اجتزت الاختبار بنجاح'
              : 'تم اعتماد النتيجة'}
          </Badge>

          <h1 className="text-xl sm:text-2xl font-black text-brown-950 dark:text-brown-50 mb-1">
            {exam?.title}
          </h1>
          <p className="text-xs text-brown-600 dark:text-brown-400">
            {exam?.book_name} - الإصحاح {exam?.chapter_number}
          </p>

          {!isGraded ? (
            /* PENDING EXAMINER REVIEW STATE */
            <div className="my-6 p-5 rounded-2xl bg-white dark:bg-[#1a130e] border border-amber-200 dark:border-amber-900/60 text-right space-y-3">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>إجاباتك مسجلة بأمان وبانتظار اعتماد الخادم المصحح</span>
              </div>
              <p className="text-xs leading-relaxed text-brown-700 dark:text-brown-300">
                الأسئلة المقالية وإجابات الامتحان قيد التدقيق والمراجعة بواسطة الخادم المصحح المصرح له من قبل المشرف العام. لن يتم إعلان درجتك النهائية حتى ينتهي الخادم المصحح من فحص وتقييم كافة إجاباتك.
              </p>
              <div className="pt-2 border-t border-amber-100 dark:border-amber-950/60 flex items-center justify-between text-[11px] text-brown-500">
                <span>تاريخ ووقت التسليم:</span>
                <span className="font-semibold text-brown-800 dark:text-brown-200">
                  {submission?.submitted_at ? formatDateArabic(submission.submitted_at) : 'الآن'}
                </span>
              </div>
            </div>
          ) : (
            /* GRADED FINAL RESULT STATE */
            <>
              {/* Big Score Display */}
              <div className="my-6 p-4 rounded-2xl bg-white dark:bg-[#1a130e] border border-brown-200 dark:border-brown-900/80 inline-block min-w-[220px]">
                <span className="text-xs font-bold text-brown-500 block mb-1">الدرجة النهائية المعتمدة</span>
                <div className="text-4xl font-black text-brown-950 dark:text-brown-50 font-mono">
                  {userScore} <span className="text-xl text-brown-400">/ {maxScore}</span>
                </div>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400 block mt-1">
                  النسبة المئوية: %{percentage}
                </span>
                {submission?.grader?.full_name && (
                  <span className="text-[10px] text-brown-500 dark:text-brown-400 block mt-2 pt-2 border-t border-brown-100 dark:border-brown-900/60">
                    اعتمدت بواسطة الخادم المصحح: <strong>{submission.grader.full_name}</strong>
                  </span>
                )}
              </div>

              <p className="text-xs text-brown-600 dark:text-brown-400 max-w-sm mx-auto mb-6">
                {isPassed
                  ? 'أحسنت! استيعاب رائع لكلمة الله وإعلان إيماني مبارك.'
                  : 'بارك الله في مجهودك. داوم على القراءة والتأمل المستمر في الأسفار الإلهية.'}
              </p>
            </>
          )}

          {/* Examiner Feedback Card (if any) */}
          {submission?.feedback && (
            <div className="my-4 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-right space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                <MessageSquare className="w-4 h-4 text-amber-600" />
                <span>ملاحظات وتوجيهات الخادم المصحح:</span>
              </div>
              <p className="text-xs text-brown-800 dark:text-brown-200 leading-relaxed font-medium pr-6">
                "{submission.feedback}"
              </p>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
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
              subtitle={
                !isGraded
                  ? 'تم استلام كافة الإجابات وهي قيد التدقيق'
                  : `${answers.length} سؤال تم تصحيحها واعتمادها`
              }
              icon={<Award className="w-5 h-5" />}
            />

            <div className="space-y-3">
              {answers.map((ans, i) => {
                const q = ans.question;
                const selectedOpt = q?.exam_options?.find(
                  (o: any) => o.id === ans.selected_option_id
                );
                const isEssay = q?.question_type === 'short_answer';

                return (
                  <div
                    key={ans.id}
                    className={`p-4 rounded-xl border ${
                      !isGraded
                        ? 'bg-brown-50/40 dark:bg-brown-950/20 border-brown-200 dark:border-brown-800'
                        : ans.is_correct
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brown-200/70 dark:bg-brown-800 text-brown-800 dark:text-brown-200">
                            {isEssay ? 'سؤال مقالي' : q?.question_type === 'true_false' ? 'صح أو خطأ' : 'اختيار من متعدد'}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-brown-950 dark:text-brown-50">
                          {i + 1}. {q?.question_text}
                        </h4>
                      </div>

                      {!isGraded ? (
                        <Badge variant="warning" size="sm">
                          بانتظار تصحيح الخادم
                        </Badge>
                      ) : (
                        <Badge variant={ans.is_correct ? 'success' : 'default'} size="sm">
                          {ans.score_awarded} من {q?.score} درجة
                        </Badge>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-white/80 dark:bg-[#1a130e]/80 border border-brown-200/50 dark:border-brown-900/50 text-xs">
                      <span className="font-bold text-brown-900 dark:text-brown-200">إجابتك المسلمة:</span>{' '}
                      <span className="text-brown-700 dark:text-brown-300 font-medium">
                        {selectedOpt ? selectedOpt.option_text : ans.text_answer || 'لم تتم الإجابة'}
                      </span>
                    </div>
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
