'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Award,
  Clock,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';

export default function TakeExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: examId } = use(params);
  const { profile } = useAuth();
  const router = useRouter();

  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<
    Record<string, { selected_option_id?: string; text_answer?: string }>
  >({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);

  useEffect(() => {
    const fetchExamDetails = async () => {
      if (!profile) return;
      try {
        setIsLoading(true);

        // 1. Check if user already submitted
        const { data: existingSub } = await supabase
          .from('exam_submissions')
          .select('id')
          .eq('exam_id', examId)
          .eq('user_id', profile.id)
          .maybeSingle();

        if (existingSub) {
          router.replace(`/exams/${examId}/result`);
          return;
        }

        // 2. Fetch exam info
        const { data: examData, error: examErr } = await supabase
          .from('exams')
          .select('*')
          .eq('id', examId)
          .single();

        if (examErr) throw examErr;
        setExam(examData);

        // 3. Fetch questions with options (note: is_correct is protected / excluded)
        const { data: qData, error: qErr } = await supabase
          .from('exam_questions')
          .select('id, question_text, question_type, score, order_index, exam_options(id, option_text, order_index)')
          .eq('exam_id', examId)
          .order('order_index', { ascending: true });

        if (qErr) throw qErr;

        // Sort options
        const sortedQuestions = (qData || []).map((q) => ({
          ...q,
          options: (q.exam_options || []).sort((a: any, b: any) => a.order_index - b.order_index),
        }));

        setQuestions(sortedQuestions);
        setTimeLeftSeconds((examData.duration_minutes || 15) * 60);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExamDetails();
  }, [examId, profile, router]);

  // Countdown timer
  useEffect(() => {
    if (timeLeftSeconds === null || timeLeftSeconds <= 0) return;

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev !== null && prev <= 1) {
          clearInterval(timer);
          handleSubmitAnswers(); // Auto-submit when time expires
          return 0;
        }
        return prev !== null ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeftSeconds]);

  const handleSelectOption = (questionId: string, optionId: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selected_option_id: optionId,
      },
    }));
  };

  const handleTextChange = (questionId: string, text: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        text_answer: text,
      },
    }));
  };

  const handleSubmitAnswers = async () => {
    setIsConfirmSubmitOpen(false);
    setIsSubmitting(true);

    try {
      const payload = questions.map((q) => ({
        question_id: q.id,
        selected_option_id: userAnswers[q.id]?.selected_option_id || null,
        text_answer: userAnswers[q.id]?.text_answer || '',
      }));

      // Call secure RPC: submit_exam_answers
      const { data, error } = await supabase.rpc('submit_exam_answers', {
        p_exam_id: examId,
        p_answers: payload,
      });

      if (error) throw error;

      router.replace(`/exams/${examId}/result`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'حدث خطأ في تقديم الامتحان');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentQIndex];
  const isLastQuestion = currentQIndex === questions.length - 1;
  const answeredCount = Object.keys(userAnswers).filter(
    (k) => userAnswers[k]?.selected_option_id || userAnswers[k]?.text_answer
  ).length;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Exam Header & Live Countdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#231b15] border border-brown-200 dark:border-brown-800 shadow-warm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                {exam?.book_name} - الإصحاح {exam?.chapter_number}
              </span>
              <Badge variant="brown" size="sm">
                سؤال {currentQIndex + 1} من {questions.length}
              </Badge>
            </div>
            <h1 className="text-base sm:text-lg font-black text-brown-950 dark:text-brown-50">
              {exam?.title}
            </h1>
          </div>

          {/* Timer Pill */}
          {timeLeftSeconds !== null && (
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-sm font-black border transition-all ${
                timeLeftSeconds < 180
                  ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse dark:bg-rose-950/60 dark:text-rose-200'
                  : 'bg-brown-50 text-brown-900 border-brown-200 dark:bg-brown-950/60 dark:text-brown-200'
              }`}
            >
              <Clock className="w-4 h-4 text-brown-500" />
              <span>{formatTimer(timeLeftSeconds)}</span>
            </div>
          )}
        </div>

        {/* Question Navigation Dots */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-2 bg-brown-50/50 dark:bg-brown-950/30 rounded-xl border border-brown-200/60 dark:border-brown-900/40">
          {questions.map((q, idx) => {
            const isAnswered =
              userAnswers[q.id]?.selected_option_id || userAnswers[q.id]?.text_answer;
            const isCurrent = idx === currentQIndex;

            return (
              <button
                key={q.id}
                onClick={() => setCurrentQIndex(idx)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-brown-700 text-white ring-2 ring-brown-400'
                    : isAnswered
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-[#231b15] text-brown-700 dark:text-brown-300 border border-brown-200'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Current Question Card */}
        {currentQ && (
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-xl bg-brown-100 dark:bg-brown-900/60 flex items-center justify-center font-bold text-sm text-brown-900 dark:text-brown-100 shrink-0">
                  {currentQIndex + 1}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-brown-950 dark:text-brown-50 leading-relaxed">
                  {currentQ.question_text}
                </h2>
              </div>
              <Badge variant="default" size="sm">
                {currentQ.score} درجة
              </Badge>
            </div>

            {/* Multiple Choice / True False Options */}
            {currentQ.question_type !== 'short_answer' && (
              <div className="space-y-3 pt-2">
                {currentQ.options?.map((opt: any) => {
                  const isSelected = userAnswers[currentQ.id]?.selected_option_id === opt.id;
                  return (
                    <label
                      key={opt.id}
                      onClick={() => handleSelectOption(currentQ.id, opt.id)}
                      className={`flex items-center gap-3.5 p-4 rounded-xl border transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'border-brown-700 bg-brown-50 dark:bg-brown-900/50 shadow-sm'
                          : 'border-brown-200 dark:border-brown-800 hover:border-brown-400 bg-white dark:bg-[#231b15]'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-brown-700 bg-brown-700 text-white'
                            : 'border-brown-300 dark:border-brown-600'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <span className="text-sm font-semibold text-brown-900 dark:text-brown-100">
                        {opt.option_text}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Short Answer Text Field */}
            {currentQ.question_type === 'short_answer' && (
              <div className="pt-2">
                <textarea
                  value={userAnswers[currentQ.id]?.text_answer || ''}
                  onChange={(e) => handleTextChange(currentQ.id, e.target.value)}
                  rows={4}
                  placeholder="اكتب إجابتك هنا بوضوح..."
                  className="w-full p-3.5 bg-brown-50/40 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brown-600"
                />
              </div>
            )}

            {/* Next / Previous / Submit Navigation */}
            <div className="pt-6 border-t border-brown-100 dark:border-brown-900/60 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="md"
                disabled={currentQIndex === 0}
                onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                السابق
              </Button>

              {!isLastQuestion ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setCurrentQIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                  التالي
                </Button>
              ) : (
                <Button
                  variant="gold"
                  size="md"
                  onClick={() => setIsConfirmSubmitOpen(true)}
                  isLoading={isSubmitting}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  className="font-bold shadow-warm"
                >
                  تسليم الامتحان النهائي
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Confirmation Modal */}
        <ConfirmDialog
          isOpen={isConfirmSubmitOpen}
          onClose={() => setIsConfirmSubmitOpen(false)}
          onConfirm={handleSubmitAnswers}
          title="تأكيد تسليم الامتحان"
          message={`أجبت على ${answeredCount} من أصل ${questions.length} سؤال. بعد التسليم، لن تتمكن من تعديل الإجابات. هل ترغب بالتسليم الآن؟`}
          confirmLabel="نعم، تسليم الامتحان"
          cancelLabel="مراجعة الإجابات"
          variant="gold"
          isLoading={isSubmitting}
        />
      </div>
    </AppShell>
  );
}
