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
import {
  Award,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Check,
  FileQuestion,
  Eye,
  EyeOff,
  User,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  FileText,
  Filter,
  Search,
} from 'lucide-react';
import { formatDateArabic } from '@/lib/utils/formatters';

export default function ManageExamsPage() {
  const { role, hasPermission, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'questions' | 'grading'>('questions');
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Submissions & Grading state
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [gradingFilter, setGradingFilter] = useState<'all' | 'pending' | 'graded'>('all');
  const [searchStudent, setSearchStudent] = useState('');
  const [activeSubmission, setActiveSubmission] = useState<any>(null);
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [gradesState, setGradesState] = useState<Record<string, { score: number; isCorrect: boolean }>>({});
  const [examinerFeedback, setExaminerFeedback] = useState('');
  const [isSavingGrade, setIsSavingGrade] = useState(false);

  // New Exam Modal state
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bookName, setBookName] = useState('إنجيل يوحنا');
  const [chapterNumber, setChapterNumber] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [passScore, setPassScore] = useState(60);
  const [requiresManualGrading, setRequiresManualGrading] = useState(true);
  const [isSavingExam, setIsSavingExam] = useState(false);

  // New Question Modal state
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'true_false' | 'short_answer'>('short_answer');
  const [score, setScore] = useState(10);
  const [options, setOptions] = useState<Array<{ text: string; isCorrect: boolean }>>([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  const canManage =
    role === 'super_admin' ||
    hasPermission('create_exams') ||
    hasPermission('edit_exams') ||
    hasPermission('view_exam_results');

  const fetchExams = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExams(data || []);

      if (data && data.length > 0) {
        const cur = selectedExam ? data.find((e) => e.id === selectedExam.id) || data[0] : data[0];
        setSelectedExam(cur);
        await Promise.all([loadExamQuestions(cur.id), loadSubmissions(cur.id)]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExamQuestions = async (examId: string) => {
    const { data } = await supabase
      .from('exam_questions')
      .select('*, exam_options(*)')
      .eq('exam_id', examId)
      .order('order_index', { ascending: true });

    setQuestions(data || []);
  };

  const loadSubmissions = async (examId: string) => {
    setIsLoadingSubmissions(true);
    try {
      const { data, error } = await supabase
        .from('exam_submissions')
        .select(`
          *,
          user:user_id(id, full_name, phone, attendance_code),
          grader:graded_by(full_name),
          answers:exam_answers(*, question:exam_questions(*, exam_options(*)))
        `)
        .eq('exam_id', examId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (err) {
      console.error('Error fetching submissions:', err);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleSelectExam = async (exam: any) => {
    setSelectedExam(exam);
    await Promise.all([loadExamQuestions(exam.id), loadSubmissions(exam.id)]);
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !bookName) return;
    setIsSavingExam(true);

    try {
      const { error } = await supabase
        .from('exams')
        .insert({
          title,
          description,
          book_name: bookName,
          chapter_number: chapterNumber,
          duration_minutes: durationMinutes,
          pass_score: passScore,
          requires_manual_grading: requiresManualGrading,
          is_published: false, // draft by default
          created_by: profile?.id,
        });

      if (error) throw error;

      setIsExamModalOpen(false);
      setTitle('');
      setDescription('');
      await fetchExams();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'حدث خطأ في إنشاء الامتحان');
    } finally {
      setIsSavingExam(false);
    }
  };

  const handleTogglePublish = async (exam: any) => {
    const nextState = !exam.is_published;
    await supabase
      .from('exams')
      .update({ is_published: nextState, updated_at: new Date().toISOString() })
      .eq('id', exam.id);

    await fetchExams();
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam || !questionText) return;
    setIsSavingQuestion(true);

    try {
      const nextOrder = questions.length + 1;
      const { data: qData, error: qErr } = await supabase
        .from('exam_questions')
        .insert({
          exam_id: selectedExam.id,
          question_text: questionText,
          question_type: questionType,
          score,
          order_index: nextOrder,
        })
        .select()
        .single();

      if (qErr) throw qErr;

      if (questionType === 'multiple_choice') {
        const optionRows = options
          .filter((opt) => opt.text.trim())
          .map((opt, idx) => ({
            question_id: qData.id,
            option_text: opt.text.trim(),
            is_correct: opt.isCorrect,
            order_index: idx + 1,
          }));

        if (optionRows.length > 0) {
          const { error: optErr } = await supabase.from('exam_options').insert(optionRows);
          if (optErr) throw optErr;
        }
      } else if (questionType === 'true_false') {
        const tfRows = options.map((opt, idx) => ({
          question_id: qData.id,
          option_text: opt.text,
          is_correct: opt.isCorrect,
          order_index: idx + 1,
        }));

        const { error: tfErr } = await supabase.from('exam_options').insert(tfRows);
        if (tfErr) throw tfErr;
      }

      setIsQuestionModalOpen(false);
      setQuestionText('');
      await loadExamQuestions(selectedExam.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'حدث خطأ في إضافة السؤال');
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال نهائياً؟')) return;

    await supabase.from('exam_questions').delete().eq('id', questionId);
    if (selectedExam) {
      await loadExamQuestions(selectedExam.id);
    }
  };

  // Open grading modal for a student's submission
  const openGradingModal = (sub: any) => {
    setActiveSubmission(sub);
    const initialGrades: Record<string, { score: number; isCorrect: boolean }> = {};

    sub.answers?.forEach((ans: any) => {
      initialGrades[ans.id] = {
        score: ans.score_awarded ?? 0,
        isCorrect: ans.is_correct ?? (ans.score_awarded > 0),
      };
    });

    setGradesState(initialGrades);
    setExaminerFeedback(sub.feedback || '');
    setIsGradingModalOpen(true);
  };

  // Update a single answer score in grading modal
  const handleScoreChange = (answerId: string, scoreVal: number, maxScoreVal: number) => {
    const clamped = Math.max(0, Math.min(scoreVal, maxScoreVal));
    setGradesState((prev) => ({
      ...prev,
      [answerId]: {
        score: clamped,
        isCorrect: clamped > 0,
      },
    }));
  };

  // Quick preset button for grading
  const handlePresetScore = (answerId: string, scoreVal: number) => {
    setGradesState((prev) => ({
      ...prev,
      [answerId]: {
        score: scoreVal,
        isCorrect: scoreVal > 0,
      },
    }));
  };

  // Examiner approve and release grade
  const handleApproveGrade = async () => {
    if (!activeSubmission) return;
    setIsSavingGrade(true);

    try {
      const payload = Object.entries(gradesState).map(([ansId, val]) => ({
        answer_id: ansId,
        score_awarded: val.score,
        is_correct: val.isCorrect,
      }));

      const { data, error } = await supabase.rpc('examiner_grade_submission', {
        p_submission_id: activeSubmission.id,
        p_grades: payload,
        p_feedback: examinerFeedback.trim() || null,
      });

      if (error) throw error;

      alert(`تم اعتماد وتوثيق النتيجة بنجاح! الدرجة النهائية: ${data.total_score} من ${data.max_score}`);
      setIsGradingModalOpen(false);

      if (selectedExam) {
        await loadSubmissions(selectedExam.id);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'حدث خطأ أثناء اعتماد الدرجة');
    } finally {
      setIsSavingGrade(false);
    }
  };

  // Filtered submissions
  const pendingCount = submissions.filter((s) => !s.is_graded).length;
  const gradedCount = submissions.filter((s) => s.is_graded).length;

  const filteredSubmissions = submissions.filter((sub) => {
    if (gradingFilter === 'pending' && sub.is_graded) return false;
    if (gradingFilter === 'graded' && !sub.is_graded) return false;

    if (searchStudent.trim()) {
      const q = searchStudent.toLowerCase();
      const name = sub.user?.full_name?.toLowerCase() || '';
      const phone = sub.user?.phone || '';
      const code = sub.user?.attendance_code || '';
      return name.includes(q) || phone.includes(q) || code.includes(q);
    }

    return true;
  });

  // Calculate live total score in grading modal
  const liveTotalScore = Object.values(gradesState).reduce((acc, curr) => acc + (curr.score || 0), 0);
  const maxExamScore = questions.reduce((acc, q) => acc + (q.score || 0), 0);
  const livePercentage = maxExamScore > 0 ? Math.round((liveTotalScore / maxExamScore) * 100) : 0;
  const livePassed = selectedExam ? livePercentage >= selectedExam.pass_score : false;

  if (!canManage) {
    return (
      <AppShell>
        <div className="p-8 text-center bg-white dark:bg-[#231b15] rounded-2xl border border-brown-200">
          <p className="text-sm font-bold text-rose-600">
            ليس لديك صلاحية لإنشاء أو إدارة وتصحيح الامتحانات الروحية. يرجى مراجعة المشرف العام.
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
              <Award className="w-3.5 h-3.5 text-brown-600 dark:text-brown-400" />
              <span>إدارة وتصحيح التقييمات الروحية</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-brown-950 dark:text-brown-50">
              بوابة الخادم المصحح وبناء الامتحانات
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/exams">
              <Button variant="outline" size="md">
                عرض كطالب
              </Button>
            </Link>
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsExamModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              امتحان جديد
            </Button>
          </div>
        </div>

        {/* Primary Tabs: Questions Builder vs Examiner Grading Portal */}
        <div className="flex items-center gap-2 p-1.5 bg-brown-100/70 dark:bg-brown-950/60 rounded-2xl border border-brown-200 dark:border-brown-900 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('questions')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'questions'
                ? 'bg-brown-800 text-white shadow-warm'
                : 'text-brown-700 dark:text-brown-300 hover:text-brown-950 dark:hover:text-white'
            }`}
          >
            <FileQuestion className="w-4 h-4" />
            <span>بناء وإدارة الأسئلة</span>
          </button>

          <button
            onClick={() => setActiveTab('grading')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer relative ${
              activeTab === 'grading'
                ? 'bg-brown-800 text-white shadow-warm'
                : 'text-brown-700 dark:text-brown-300 hover:text-brown-950 dark:hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تصحيح إجابات المخدومين</span>
            {pendingCount > 0 && (
              <span className="min-w-[20px] h-5 rounded-full bg-amber-500 text-white text-[11px] font-black flex items-center justify-center px-1.5 shadow-sm">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: QUESTIONS BUILDER */}
        {activeTab === 'questions' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Exams List */}
            <Card className="lg:col-span-1">
              <CardHeader
                title="الامتحانات المنشأة"
                subtitle="اختر امتحاناً لإضافة وتعديل أسئلته"
                icon={<Award className="w-5 h-5" />}
              />

              {exams.length === 0 ? (
                <p className="text-xs text-brown-500 text-center py-6">لا توجد امتحانات مسجلة.</p>
              ) : (
                <div className="space-y-2.5">
                  {exams.map((e) => {
                    const isSelected = selectedExam?.id === e.id;
                    return (
                      <div
                        key={e.id}
                        onClick={() => handleSelectExam(e)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-brown-600 bg-brown-50 dark:bg-brown-900/40 shadow-sm'
                            : 'border-brown-200 dark:border-brown-800 hover:border-brown-400 bg-white dark:bg-[#231b15]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-bold text-brown-950 dark:text-brown-50">
                            {e.title}
                          </h4>
                          <Badge variant={e.is_published ? 'success' : 'warning'} size="sm">
                            {e.is_published ? 'منشور' : 'مسودة'}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-brown-500 mt-2">
                          <span>
                            {e.book_name} - الإصحاح {e.chapter_number}
                          </span>
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleTogglePublish(e);
                            }}
                            className="flex items-center gap-1 font-bold text-brown-700 hover:text-brown-900 cursor-pointer"
                          >
                            {e.is_published ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5" /> إلغاء النشر
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" /> نشر الآن
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Questions Editor for Selected Exam */}
            <Card className="lg:col-span-2">
              <CardHeader
                title={selectedExam ? `أسئلة: ${selectedExam.title}` : 'بنك الأسئلة'}
                subtitle={selectedExam ? `إجمالي الأسئلة: ${questions.length} (${maxExamScore} درجة)` : ''}
                icon={<FileQuestion className="w-5 h-5" />}
                action={
                  selectedExam ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setQuestionText('');
                        setQuestionType('short_answer');
                        setScore(10);
                        setOptions([
                          { text: '', isCorrect: true },
                          { text: '', isCorrect: false },
                          { text: '', isCorrect: false },
                          { text: '', isCorrect: false },
                        ]);
                        setIsQuestionModalOpen(true);
                      }}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      إضافة سؤال
                    </Button>
                  ) : null
                }
              />

              {questions.length === 0 ? (
                <p className="text-xs text-brown-500 text-center py-12">
                  لا توجد أسئلة مضافة في هذا الامتحان بعد. اضغط على &quot;إضافة سؤال&quot; لبدء البناء!
                </p>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl border border-brown-200 dark:border-brown-800 bg-white dark:bg-[#231b15]"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-start gap-2">
                          <span className="w-6 h-6 rounded-lg bg-brown-100 dark:bg-brown-900/60 font-bold text-xs flex items-center justify-center text-brown-900 dark:text-brown-100 shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-brown-100 dark:bg-brown-900 text-brown-700 dark:text-brown-300 mb-1">
                              {q.question_type === 'short_answer'
                                ? 'سؤال مقالي (يتطلب تصحيح الخادم)'
                                : q.question_type === 'true_false'
                                ? 'صح أو خطأ'
                                : 'اختيار من متعدد'}
                            </span>
                            <h4 className="text-sm font-bold text-brown-950 dark:text-brown-50">
                              {q.question_text}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="default" size="sm">
                            {q.score} درجات
                          </Badge>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 rounded cursor-pointer"
                            title="حذف السؤال"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Options Preview */}
                      {q.exam_options && q.exam_options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-brown-100 dark:border-brown-900/60">
                          {q.exam_options.map((opt: any) => (
                            <div
                              key={opt.id}
                              className={`p-2 rounded-lg text-xs font-semibold flex items-center justify-between ${
                                opt.is_correct
                                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-100'
                                  : 'bg-brown-50/50 text-brown-700 dark:bg-brown-950/30 dark:text-brown-300'
                              }`}
                            >
                              <span>{opt.option_text}</span>
                              {opt.is_correct && (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB 2: EXAMINER GRADING PORTAL */}
        {activeTab === 'grading' && (
          <div className="space-y-6">
            {/* Exam Selector & Stats Banner */}
            <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-[#231b15] border border-brown-200 dark:border-brown-800 shadow-warm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-brown-800 dark:text-brown-200 mb-1.5">
                    الامتحان المراد تصحيح إجاباته:
                  </label>
                  <select
                    value={selectedExam?.id || ''}
                    onChange={(e) => {
                      const ex = exams.find((x) => x.id === e.target.value);
                      if (ex) handleSelectExam(ex);
                    }}
                    className="w-full sm:max-w-md py-2.5 px-3 bg-brown-50/60 dark:bg-brown-950/50 border border-brown-300 dark:border-brown-700 rounded-xl text-sm font-bold text-brown-950 dark:text-brown-50 focus:outline-none focus:ring-2 focus:ring-brown-600"
                  >
                    {exams.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title} ({e.book_name} - الإصحاح {e.chapter_number})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Submissions Stats */}
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-brown-50 dark:bg-brown-900/40 border border-brown-200 dark:border-brown-800 text-center min-w-[90px]">
                    <span className="text-[10px] text-brown-500 font-bold block">إجمالي المسلم</span>
                    <span className="text-lg font-black text-brown-900 dark:text-brown-100 font-mono">
                      {submissions.length}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center min-w-[90px]">
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold block">
                      بانتظار التصحيح
                    </span>
                    <span className="text-lg font-black text-amber-600 font-mono">{pendingCount}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center min-w-[90px]">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold block">
                      معتمد ومُعلن
                    </span>
                    <span className="text-lg font-black text-emerald-600 font-mono">{gradedCount}</span>
                  </div>
                </div>
              </div>

              {/* Filters and Search Bar */}
              <div className="pt-3 border-t border-brown-100 dark:border-brown-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <button
                    onClick={() => setGradingFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      gradingFilter === 'all'
                        ? 'bg-brown-700 text-white shadow-sm'
                        : 'bg-brown-100 dark:bg-brown-900 text-brown-700 dark:text-brown-300'
                    }`}
                  >
                    الكل ({submissions.length})
                  </button>
                  <button
                    onClick={() => setGradingFilter('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      gradingFilter === 'pending'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200'
                    }`}
                  >
                    بانتظار تصحيح الخادم ⏳ ({pendingCount})
                  </button>
                  <button
                    onClick={() => setGradingFilter('graded')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      gradingFilter === 'graded'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                    }`}
                  >
                    تم الاعتماد والتقييم ✅ ({gradedCount})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    placeholder="بحث باسم أو رقم الخادم..."
                    className="w-full pl-3 pr-9 py-1.5 bg-brown-50/60 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brown-600"
                  />
                  <Search className="w-4 h-4 text-brown-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Submissions List */}
            {isLoadingSubmissions ? (
              <div className="p-8 text-center text-brown-500 font-semibold text-sm">
                جاري تحميل أوراق إجابات المخدومين...
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <Card className="p-10 text-center">
                <CheckCircle2 className="w-12 h-12 text-brown-400 mx-auto mb-2 opacity-60" />
                <h3 className="font-bold text-base text-brown-950 dark:text-brown-50 mb-1">
                  لا توجد أوراق إجابات مطابقة
                </h3>
                <p className="text-xs text-brown-500 max-w-sm mx-auto">
                  لم يقم أي مخدوم بتسليم هذا الامتحان بعد أو لا توجد نتائج مطابقة للبحث المحدد.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSubmissions.map((sub) => {
                  const student = sub.user;
                  const isGraded = sub.is_graded;

                  return (
                    <Card
                      key={sub.id}
                      className={`p-5 space-y-4 border transition-all ${
                        !isGraded
                          ? 'border-amber-300/80 dark:border-amber-800/80 bg-amber-50/20'
                          : 'border-brown-200 dark:border-brown-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-brown-200 dark:bg-brown-800 flex items-center justify-center font-bold text-sm text-brown-800 dark:text-brown-200">
                            {student?.full_name ? student.full_name.charAt(0) : <User className="w-5 h-5" />}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-brown-950 dark:text-brown-50">
                              {student?.full_name || 'خادم غير محدد'}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-brown-500">
                              <span className="font-mono">{student?.phone}</span>
                              <span>•</span>
                              <span className="font-mono font-bold">{student?.attendance_code}</span>
                            </div>
                          </div>
                        </div>

                        <Badge variant={!isGraded ? 'warning' : 'success'} size="sm">
                          {!isGraded ? 'بانتظار تصحيح الخادم ⏳' : `معتمد: ${sub.total_score} درجة`}
                        </Badge>
                      </div>

                      <div className="p-3 bg-white dark:bg-[#1a130e] rounded-xl border border-brown-200/60 dark:border-brown-900/60 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-brown-600 dark:text-brown-400">
                          <span>وقت التسليم:</span>
                          <span className="font-semibold text-brown-900 dark:text-brown-200">
                            {formatDateArabic(sub.submitted_at)}
                          </span>
                        </div>
                        {sub.feedback && (
                          <div className="pt-1 text-[11px] text-amber-800 dark:text-amber-300 italic truncate">
                            ملاحظتك: &quot;{sub.feedback}&quot;
                          </div>
                        )}
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-xs text-brown-500">
                          {sub.answers?.length || 0} أسئلة مجابة
                        </span>

                        <Button
                          variant={!isGraded ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => openGradingModal(sub)}
                          leftIcon={!isGraded ? <Edit2 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        >
                          {!isGraded ? 'تصحيح الإجابات ورصد الدرجة' : 'مراجعة وتعديل التصحيح'}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MODAL: EXAMINER FULL GRADING MODAL */}
        <Modal
          isOpen={isGradingModalOpen}
          onClose={() => setIsGradingModalOpen(false)}
          title={`تصحيح ورقة إجابة: ${activeSubmission?.user?.full_name || ''}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Student & Exam Info Header */}
            <div className="p-4 rounded-2xl bg-brown-50/70 dark:bg-brown-950/40 border border-brown-200 dark:border-brown-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-brown-950 dark:text-brown-50 text-sm block">
                  {selectedExam?.title}
                </span>
                <span className="text-brown-600 dark:text-brown-400">
                  {selectedExam?.book_name} - الإصحاح {selectedExam?.chapter_number}
                </span>
              </div>
              <div className="text-left font-mono">
                <span className="text-brown-500 block">كود المخدوم: {activeSubmission?.user?.attendance_code}</span>
                <span className="text-brown-500">وقت التسليم: {activeSubmission?.submitted_at ? formatDateArabic(activeSubmission.submitted_at) : ''}</span>
              </div>
            </div>

            {/* Questions Grading List */}
            <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
              {activeSubmission?.answers?.map((ans: any, idx: number) => {
                const q = ans.question;
                const selectedOpt = q?.exam_options?.find((o: any) => o.id === ans.selected_option_id);
                const isEssay = q?.question_type === 'short_answer';
                const currentScore = gradesState[ans.id]?.score ?? ans.score_awarded ?? 0;

                return (
                  <div
                    key={ans.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isEssay
                        ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/30 dark:bg-amber-950/20'
                        : 'border-brown-200 dark:border-brown-800 bg-white dark:bg-[#1a130e]'
                    }`}
                  >
                    {/* Question Header */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-lg bg-brown-200 dark:bg-brown-800 text-brown-900 dark:text-brown-100 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-brown-100 dark:bg-brown-900 text-brown-700 dark:text-brown-300 mb-1">
                            {isEssay ? 'سؤال مقالي (يتطلب تقييمك)' : q?.question_type === 'true_false' ? 'صح أو خطأ' : 'اختيار من متعدد'}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-brown-950 dark:text-brown-50">
                            {q?.question_text}
                          </h4>
                        </div>
                      </div>

                      <Badge variant="default" size="sm" className="shrink-0">
                        القصوى: {q?.score} درجة
                      </Badge>
                    </div>

                    {/* Student Response Display */}
                    {isEssay ? (
                      /* Essay Response (Highlighted) */
                      <div className="my-3 p-3.5 bg-white dark:bg-[#231b15] rounded-xl border border-amber-300 dark:border-amber-700 space-y-1">
                        <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 block">
                          إجابة المخدوم المكتوبة:
                        </span>
                        <p className="text-xs sm:text-sm font-semibold text-brown-950 dark:text-brown-50 whitespace-pre-wrap leading-relaxed">
                          {ans.text_answer || <span className="text-rose-500 italic">لم يقدم إجابة نصية</span>}
                        </p>
                      </div>
                    ) : (
                      /* Objective Response */
                      <div className="my-2.5 p-2.5 bg-brown-50/60 dark:bg-brown-900/30 rounded-xl text-xs space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-brown-700 dark:text-brown-300">اختيار المخدوم:</span>
                          <span className="font-bold text-brown-950 dark:text-brown-100">
                            {selectedOpt?.option_text || 'لم يختر إجابة'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Examiner Score Controls */}
                    <div className="pt-3 border-t border-brown-100 dark:border-brown-900/60 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-brown-900 dark:text-brown-200">
                          الدرجة الممنوحة:
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={q?.score || 10}
                          value={currentScore}
                          onChange={(e) =>
                            handleScoreChange(ans.id, parseInt(e.target.value) || 0, q?.score || 10)
                          }
                          className="w-16 py-1 px-2 text-center font-mono font-bold text-sm bg-white dark:bg-[#231b15] border border-brown-300 dark:border-brown-700 rounded-lg focus:ring-1 focus:ring-brown-600"
                        />
                        <span className="text-xs text-brown-500 font-bold">من {q?.score}</span>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePresetScore(ans.id, q?.score || 10)}
                          className="px-2 py-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          كاملة ({q?.score})
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePresetScore(ans.id, Math.round((q?.score || 10) / 2))}
                          className="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          نصف ({Math.round((q?.score || 10) / 2)})
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePresetScore(ans.id, 0)}
                          className="px-2 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          صفر
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Score Summary & Feedback */}
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-300/70 dark:border-amber-800/70 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-brown-700 dark:text-brown-300 block">
                    إجمالي الدرجة المرصودة حالياً:
                  </span>
                  <div className="text-2xl font-black text-brown-950 dark:text-brown-50 font-mono">
                    {liveTotalScore} <span className="text-sm text-brown-500">/ {maxExamScore}</span>
                  </div>
                </div>

                <div className="text-left">
                  <Badge variant={livePassed ? 'success' : 'danger'} size="md">
                    {livePassed ? 'مؤهل للنجاح' : 'دون درجة النجاح'} (%{livePercentage})
                  </Badge>
                  <span className="text-[10px] text-brown-500 block mt-1">
                    درجة النجاح المقررة: {selectedExam?.pass_score}%
                  </span>
                </div>
              </div>

              {/* Examiner Written Feedback */}
              <div>
                <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                  ملاحظات وتوجيهات الخادم المصحح (تظهر للمخدوم في صفحته):
                </label>
                <textarea
                  value={examinerFeedback}
                  onChange={(e) => setExaminerFeedback(e.target.value)}
                  rows={2}
                  placeholder="مثال: إجابة ممتازة واستيعاب روحي عميق، باركك الرب..."
                  className="w-full py-2 px-3 bg-white dark:bg-[#1a130e] border border-brown-300 dark:border-brown-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brown-600"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => setIsGradingModalOpen(false)}
              >
                إغلاق
              </Button>

              <Button
                variant="primary"
                size="lg"
                onClick={handleApproveGrade}
                isLoading={isSavingGrade}
                leftIcon={<CheckCircle2 className="w-5 h-5" />}
                className="font-bold shadow-warm"
              >
                اعتماد الدرجة النهائية وإعلان النتيجة للمخدوم
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal: Create Exam */}
        <Modal
          isOpen={isExamModalOpen}
          onClose={() => setIsExamModalOpen(false)}
          title="إنشاء امتحان روحي جديد"
          maxWidth="md"
        >
          <form onSubmit={handleCreateExam} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                عنوان الامتحان
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: اختبار إنجيل يوحنا - الإصحاح الثاني"
                className="w-full py-2 px-3 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brown-600"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                  السفر
                </label>
                <input
                  type="text"
                  value={bookName}
                  onChange={(e) => setBookName(e.target.value)}
                  className="w-full py-2 px-3 bg-brown-50/50 border border-brown-300 rounded-xl text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                  رقم الإصحاح
                </label>
                <input
                  type="number"
                  min={1}
                  value={chapterNumber}
                  onChange={(e) => setChapterNumber(parseInt(e.target.value) || 1)}
                  className="w-full py-2 px-3 bg-brown-50/50 border border-brown-300 rounded-xl text-sm font-semibold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                  مدة الامتحان (بالدقائق)
                </label>
                <input
                  type="number"
                  min={5}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 15)}
                  className="w-full py-2 px-3 bg-brown-50/50 border border-brown-300 rounded-xl text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                  درجة النجاح (%)
                </label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={passScore}
                  onChange={(e) => setPassScore(parseInt(e.target.value) || 60)}
                  className="w-full py-2 px-3 bg-brown-50/50 border border-brown-300 rounded-xl text-sm font-semibold"
                  required
                />
              </div>
            </div>

            {/* Requires manual examiner grading checkbox */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-brown-900 dark:text-brown-100">
                <input
                  type="checkbox"
                  checked={requiresManualGrading}
                  onChange={(e) => setRequiresManualGrading(e.target.checked)}
                  className="w-4 h-4 text-brown-700 rounded"
                />
                <span>يتطلب مراجعة واعتماد الخادم المصحح قبل إعلان النتيجة</span>
              </label>
              <p className="text-[11px] text-brown-600 dark:text-brown-400 mt-1 pr-6 leading-relaxed">
                عند التفعيل (أو عند احتواء الامتحان على أسئلة مقالية)، لن تظهر الدرجة للمخدوم حتى يعتمدها الخادم المصحح.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-brown-100">
              <Button variant="ghost" size="md" type="button" onClick={() => setIsExamModalOpen(false)}>
                إلغاء
              </Button>
              <Button variant="primary" size="md" type="submit" isLoading={isSavingExam}>
                حفظ الامتحان كمسودة
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Add Question */}
        <Modal
          isOpen={isQuestionModalOpen}
          onClose={() => setIsQuestionModalOpen(false)}
          title="إضافة سؤال جديد"
          maxWidth="lg"
        >
          <form onSubmit={handleAddQuestion} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                نص السؤال
              </label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={2}
                placeholder="اكتب السؤال بوضوح هنا..."
                className="w-full py-2 px-3 bg-brown-50/50 border border-brown-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brown-600"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                  نوع السؤال
                </label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value as any)}
                  className="w-full py-2 px-3 bg-brown-50/50 border border-brown-300 rounded-xl text-sm font-semibold"
                >
                  <option value="short_answer">سؤال مقالي (يتطلب تصحيح الخادم المصحح)</option>
                  <option value="multiple_choice">اختيار من متعدد (4 خيارات)</option>
                  <option value="true_false">صح أو خطأ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                  درجة السؤال
                </label>
                <input
                  type="number"
                  min={1}
                  value={score}
                  onChange={(e) => setScore(parseInt(e.target.value) || 10)}
                  className="w-full py-2 px-3 bg-brown-50/50 border border-brown-300 rounded-xl text-sm font-semibold"
                  required
                />
              </div>
            </div>

            {/* Multiple Choice Options Builder */}
            {questionType === 'multiple_choice' && (
              <div className="space-y-2.5 pt-2">
                <span className="text-xs font-bold text-brown-900 dark:text-brown-200 block">
                  خيارات الإجابة (اختر الإجابة الصحيحة):
                </span>
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={opt.isCorrect}
                      onChange={() => {
                        setOptions((prev) =>
                          prev.map((o, idx) => ({ ...o, isCorrect: idx === i }))
                        );
                      }}
                      className="w-4 h-4 text-brown-700"
                    />
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOptions((prev) =>
                          prev.map((o, idx) => (idx === i ? { ...o, text: val } : o))
                        );
                      }}
                      placeholder={`الخيار ${i + 1}`}
                      className="w-full py-2 px-3 bg-brown-50/50 border border-brown-300 rounded-xl text-xs sm:text-sm font-semibold"
                      required
                    />
                  </div>
                ))}
              </div>
            )}

            {/* True / False Builder */}
            {questionType === 'true_false' && (
              <div className="pt-2">
                <span className="text-xs font-bold text-brown-900 dark:text-brown-200 block mb-2">
                  الإجابة الصحيحة لهذا السؤال:
                </span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tfCorrect"
                      checked={options[0].isCorrect}
                      onChange={() =>
                        setOptions([{ text: 'صح', isCorrect: true }, { text: 'خطأ', isCorrect: false }])
                      }
                      className="w-4 h-4 text-brown-700"
                    />
                    <span className="text-sm font-bold">صح</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tfCorrect"
                      checked={!options[0].isCorrect}
                      onChange={() =>
                        setOptions([{ text: 'صح', isCorrect: false }, { text: 'خطأ', isCorrect: true }])
                      }
                      className="w-4 h-4 text-brown-700"
                    />
                    <span className="text-sm font-bold">خطأ</span>
                  </label>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-brown-100">
              <Button variant="ghost" size="md" type="button" onClick={() => setIsQuestionModalOpen(false)}>
                إلغاء
              </Button>
              <Button variant="primary" size="md" type="submit" isLoading={isSavingQuestion}>
                إضافة السؤال للمقرر
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
