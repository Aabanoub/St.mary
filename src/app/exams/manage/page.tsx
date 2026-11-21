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
} from 'lucide-react';
import { formatDateArabic } from '@/lib/utils/formatters';

export default function ManageExamsPage() {
  const { role, hasPermission, profile } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Exam Modal state
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bookName, setBookName] = useState('إنجيل يوحنا');
  const [chapterNumber, setChapterNumber] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [passScore, setPassScore] = useState(60);
  const [isSavingExam, setIsSavingExam] = useState(false);

  // New Question Modal state
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'true_false' | 'short_answer'>('multiple_choice');
  const [score, setScore] = useState(10);
  const [options, setOptions] = useState<Array<{ text: string; isCorrect: boolean }>>([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  const canManage =
    role === 'super_admin' || hasPermission('create_exams') || hasPermission('edit_exams');

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
        await loadExamQuestions(cur.id);
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

  useEffect(() => {
    fetchExams();
  }, []);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !bookName) return;
    setIsSavingExam(true);

    try {
      const { data, error } = await supabase
        .from('exams')
        .insert({
          title,
          description,
          book_name: bookName,
          chapter_number: chapterNumber,
          duration_minutes: durationMinutes,
          pass_score: passScore,
          is_published: false, // draft by default
          created_by: profile?.id,
        })
        .select()
        .single();

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
      // 1. Insert Question
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

      // 2. Insert Options if multiple_choice or true_false
      if (questionType === 'multiple_choice') {
        const optionRows = options
          .filter((o) => o.text.trim())
          .map((o, idx) => ({
            question_id: qData.id,
            option_text: o.text.trim(),
            is_correct: o.isCorrect,
            order_index: idx + 1,
          }));

        await supabase.from('exam_options').insert(optionRows);
      } else if (questionType === 'true_false') {
        await supabase.from('exam_options').insert([
          { question_id: qData.id, option_text: 'صح', is_correct: options[0].isCorrect, order_index: 1 },
          { question_id: qData.id, option_text: 'خطأ', is_correct: !options[0].isCorrect, order_index: 2 },
        ]);
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

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('هل ترغب بحذف هذا السؤال؟')) return;
    await supabase.from('exam_questions').delete().eq('id', qId);
    if (selectedExam) await loadExamQuestions(selectedExam.id);
  };

  if (!canManage) {
    return (
      <AppShell>
        <div className="p-8 text-center bg-white dark:bg-[#231b15] rounded-2xl border border-brown-200">
          <p className="text-sm font-bold text-rose-600">
            ليس لديك صلاحية لإنشاء أو إدارة الامتحانات الروحية. يرجى مراجعة المشرف العام.
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
              <span>إدارة التقييمات الروحية</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-brown-950 dark:text-brown-50">
              إنشاء وإدارة امتحانات الفصول
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

        {/* Layout: Exams List (Left) & Selected Exam Questions (Right) */}
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
                      onClick={() => {
                        setSelectedExam(e);
                        loadExamQuestions(e.id);
                      }}
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
                          className="flex items-center gap-1 font-bold text-brown-700 hover:text-brown-900"
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
              subtitle={selectedExam ? `إجمالي الأسئلة: ${questions.length}` : ''}
              icon={<FileQuestion className="w-5 h-5" />}
              action={
                selectedExam ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setQuestionText('');
                      setQuestionType('multiple_choice');
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
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-brown-100 dark:bg-brown-900/60 font-bold text-xs flex items-center justify-center text-brown-900 dark:text-brown-100">
                          {idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-brown-950 dark:text-brown-50">
                          {q.question_text}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="default" size="sm">
                          {q.score} درجات
                        </Badge>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 rounded cursor-pointer"
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
                  <option value="multiple_choice">اختيار من متعدد (4 خيارات)</option>
                  <option value="true_false">صح أو خطأ</option>
                  <option value="short_answer">سؤال مقالي قصير</option>
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
