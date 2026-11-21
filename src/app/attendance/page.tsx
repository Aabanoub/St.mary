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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  CalendarCheck,
  Plus,
  QrCode,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';
import { formatDateArabic, formatShortDateArabic, getAttendanceStatusConfig } from '@/lib/utils/formatters';

export default function AttendanceHubPage() {
  const { role, hasPermission, profile } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [usersCount, setUsersCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Meeting modal state (create / edit)
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<any>(null);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingStatus, setMeetingStatus] = useState<'upcoming' | 'open' | 'closed'>('upcoming');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);

  // Status correction modal state
  const [correctingRecord, setCorrectingRecord] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<'present' | 'late' | 'absent'>('present');
  const [correctionNote, setCorrectionNote] = useState('');
  const [isCorrecting, setIsCorrecting] = useState(false);

  const isSuperAdmin = role === 'super_admin';
  const canScan = hasPermission('scan_attendance');
  const canCorrect = hasPermission('correct_attendance');

  const fetchMeetingsAndAttendance = async () => {
    try {
      setIsLoading(true);

      // 1. Fetch total users
      const { count: uCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'user')
        .eq('is_active', true);

      setUsersCount(uCount || 0);

      // 2. Fetch meetings
      const { data: mList } = await supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: false });

      setMeetings(mList || []);

      if (mList && mList.length > 0) {
        const target = selectedMeeting
          ? mList.find((m) => m.id === selectedMeeting.id) || mList[0]
          : mList[0];

        setSelectedMeeting(target);
        await loadMeetingAttendees(target.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMeetingAttendees = async (meetingId: string) => {
    const { data: att } = await supabase
      .from('attendance')
      .select('*, user:profiles(id, full_name, phone, attendance_code)')
      .eq('meeting_id', meetingId)
      .order('scanned_at', { ascending: false });

    setAttendees(att || []);
  };

  useEffect(() => {
    fetchMeetingsAndAttendance();
  }, []);

  const handleSelectMeeting = async (m: any) => {
    setSelectedMeeting(m);
    await loadMeetingAttendees(m.id);
  };

  // Open modal for new meeting
  const handleOpenNewMeeting = () => {
    setEditingMeeting(null);
    setMeetingTitle('اجتماع إعداد الخدام - الأسبوع الحالي');
    // Default next Saturday
    const d = new Date();
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
    setMeetingDate(d.toISOString().split('T')[0]);
    setMeetingStatus('upcoming');
    setMeetingNotes('');
    setIsMeetingModalOpen(true);
  };

  // Save Meeting
  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle || !meetingDate) return;
    setIsSavingMeeting(true);

    try {
      if (editingMeeting) {
        await supabase
          .from('meetings')
          .update({
            title: meetingTitle,
            meeting_date: meetingDate,
            status: meetingStatus,
            notes: meetingNotes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingMeeting.id);
      } else {
        await supabase.from('meetings').insert({
          title: meetingTitle,
          meeting_date: meetingDate,
          status: meetingStatus,
          notes: meetingNotes,
          created_by: profile?.id,
        });
      }

      setIsMeetingModalOpen(false);
      await fetchMeetingsAndAttendance();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'حدث خطأ في حفظ بيانات الاجتماع');
    } finally {
      setIsSavingMeeting(false);
    }
  };

  // Quick toggle status (Open / Close)
  const handleToggleMeetingStatus = async (m: any) => {
    const nextStatus = m.status === 'open' ? 'closed' : 'open';
    await supabase
      .from('meetings')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', m.id);

    // Log activity
    await supabase.from('activity_logs').insert({
      actor_id: profile?.id,
      action: 'UPDATE_MEETING_STATUS',
      entity_type: 'meeting',
      entity_id: m.id,
      details: { from: m.status, to: nextStatus, meeting_date: m.meeting_date },
    });

    await fetchMeetingsAndAttendance();
  };

  // Correct attendance record
  const handleSaveCorrection = async () => {
    if (!correctingRecord) return;
    setIsCorrecting(true);

    try {
      await supabase
        .from('attendance')
        .update({
          status: newStatus,
          notes: correctionNote || 'تصحيح بواسطة المشرف',
          updated_at: new Date().toISOString(),
        })
        .eq('id', correctingRecord.id);

      // Log correction to activity_logs
      await supabase.from('activity_logs').insert({
        actor_id: profile?.id,
        action: 'CORRECT_ATTENDANCE',
        entity_type: 'attendance',
        entity_id: correctingRecord.id,
        details: {
          meeting_id: correctingRecord.meeting_id,
          user_id: correctingRecord.user_id,
          old_status: correctingRecord.status,
          new_status: newStatus,
          note: correctionNote,
        },
      });

      setCorrectingRecord(null);
      if (selectedMeeting) {
        await loadMeetingAttendees(selectedMeeting.id);
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'حدث خطأ أثناء تعديل الحضور');
    } finally {
      setIsCorrecting(false);
    }
  };

  const presentCount = attendees.filter((a) => a.status === 'present').length;
  const lateCount = attendees.filter((a) => a.status === 'late').length;
  const attendedTotal = presentCount + lateCount;
  const absentCount = Math.max(0, usersCount - attendedTotal);
  const attendanceRate = usersCount > 0 ? Math.round((attendedTotal / usersCount) * 100) : 0;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brown-100 dark:bg-brown-900/60 text-brown-800 dark:text-brown-200 text-xs font-semibold mb-1">
              <CalendarCheck className="w-3.5 h-3.5 text-brown-600 dark:text-brown-400" />
              <span>إدارة الحضور والغياب</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-brown-950 dark:text-brown-50">
              اجتماعات السبت وسجلات الحضور
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {canScan && (
              <Link href="/attendance/scan">
                <Button variant="gold" size="md" leftIcon={<QrCode className="w-4 h-4" />}>
                  مسح QR
                </Button>
              </Link>
            )}

            {isSuperAdmin && (
              <>
                <Link href="/attendance/reports">
                  <Button variant="secondary" size="md" leftIcon={<FileSpreadsheet className="w-4 h-4" />}>
                    تقارير PDF
                  </Button>
                </Link>
                <Button variant="primary" size="md" onClick={handleOpenNewMeeting} leftIcon={<Plus className="w-4 h-4" />}>
                  اجتماع جديد
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Selected Meeting KPIs */}
        {selectedMeeting && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="text-center p-4">
              <span className="text-xs text-brown-600 dark:text-brown-400 font-bold block mb-1">
                نسبة الحضور
              </span>
              <span className="text-3xl font-black text-brown-950 dark:text-brown-50">
                %{attendanceRate}
              </span>
              <span className="text-[11px] text-brown-500 block mt-1">
                {attendedTotal} من {usersCount} خادم
              </span>
            </Card>

            <Card className="text-center p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60">
              <span className="text-xs text-emerald-800 dark:text-emerald-300 font-bold block mb-1">
                حاضر في الموعد
              </span>
              <span className="text-3xl font-black text-emerald-700 dark:text-emerald-400">
                {presentCount}
              </span>
              <span className="text-[11px] text-emerald-600 block mt-1">تسجيل مبكر</span>
            </Card>

            <Card className="text-center p-4 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60">
              <span className="text-xs text-amber-800 dark:text-amber-300 font-bold block mb-1">
                حضور متأخر
              </span>
              <span className="text-3xl font-black text-amber-700 dark:text-amber-400">
                {lateCount}
              </span>
              <span className="text-[11px] text-amber-600 block mt-1">بعد بدء المحاضرة</span>
            </Card>

            <Card className="text-center p-4 bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60">
              <span className="text-xs text-rose-800 dark:text-rose-300 font-bold block mb-1">
                غائب
              </span>
              <span className="text-3xl font-black text-rose-700 dark:text-rose-400">
                {absentCount}
              </span>
              <span className="text-[11px] text-rose-600 block mt-1">لم يحضر الاجتماع</span>
            </Card>
          </div>
        )}

        {/* Content Layout: Meetings List (Left) & Selected Meeting Attendees (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Meetings List */}
          <Card className="lg:col-span-1">
            <CardHeader
              title="قائمة الاجتماعات"
              subtitle="اختر اجتماعاً لعرض تفاصيل الحضور"
              icon={<CalendarCheck className="w-5 h-5" />}
            />

            {meetings.length === 0 ? (
              <p className="text-xs text-brown-500 text-center py-8">لا توجد اجتماعات مسجلة.</p>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
                {meetings.map((m) => {
                  const isSelected = selectedMeeting?.id === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleSelectMeeting(m)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-brown-600 bg-brown-50/80 dark:bg-brown-900/40 shadow-sm'
                          : 'border-brown-200 dark:border-brown-800 hover:border-brown-400 bg-white dark:bg-[#231b15]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-brown-950 dark:text-brown-50 truncate">
                          {m.title}
                        </span>
                        <Badge
                          variant={m.status === 'open' ? 'success' : m.status === 'upcoming' ? 'warning' : 'default'}
                          size="sm"
                          dot
                        >
                          {m.status === 'open' ? 'مفتوح' : m.status === 'upcoming' ? 'قادم' : 'مغلق'}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-brown-500">
                        <span>{formatDateArabic(m.meeting_date)}</span>
                        {isSuperAdmin && (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleToggleMeetingStatus(m)}
                              className="text-brown-600 hover:text-brown-900 font-bold"
                              title={m.status === 'open' ? 'إغلاق الاجتماع' : 'فتح الاجتماع'}
                            >
                              {m.status === 'open' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Attendees Details Table */}
          <Card className="lg:col-span-2">
            <CardHeader
              title={selectedMeeting ? `سجل حضور: ${selectedMeeting.title}` : 'تفاصيل الحضور'}
              subtitle={selectedMeeting ? formatDateArabic(selectedMeeting.meeting_date) : ''}
              icon={<Users className="w-5 h-5" />}
              action={
                selectedMeeting && canScan ? (
                  <Link href={`/attendance/scan`}>
                    <Button variant="primary" size="sm" leftIcon={<QrCode className="w-4 h-4" />}>
                      مسح حضور
                    </Button>
                  </Link>
                ) : null
              }
            />

            {attendees.length === 0 ? (
              <p className="text-xs text-brown-500 text-center py-12">
                لم يتم تسجيل أي حضور في هذا الاجتماع حتى الآن.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-brown-200 dark:border-brown-800 text-brown-600 dark:text-brown-400 font-bold">
                      <th className="py-2.5 px-3">الخادم / المخدوم</th>
                      <th className="py-2.5 px-3">كود الحضور</th>
                      <th className="py-2.5 px-3">الحالة</th>
                      <th className="py-2.5 px-3">وقت المسح</th>
                      {canCorrect && <th className="py-2.5 px-3 text-center">تعديل</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brown-100 dark:divide-brown-900/60">
                    {attendees.map((a) => {
                      const cfg = getAttendanceStatusConfig(a.status);
                      return (
                        <tr key={a.id} className="hover:bg-brown-50/50 dark:hover:bg-brown-950/30">
                          <td className="py-3 px-3 font-bold text-brown-950 dark:text-brown-50">
                            {a.user?.full_name}
                            <span className="block text-[10px] text-brown-400 font-mono">
                              {a.user?.phone}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-brown-700 dark:text-brown-300">
                            {a.user?.attendance_code}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.badgeBg}`} />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-brown-500 text-xs font-mono">
                            {new Date(a.scanned_at).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          {canCorrect && (
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => {
                                  setCorrectingRecord(a);
                                  setNewStatus(a.status);
                                  setCorrectionNote(a.notes || '');
                                }}
                                className="p-1.5 text-brown-600 hover:text-brown-900 dark:text-brown-400 dark:hover:text-brown-100 rounded-lg hover:bg-brown-100 dark:hover:bg-brown-800 transition-colors"
                                title="تعديل الحالة أو تصحيح الخطأ"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Modal: Create or Edit Meeting */}
        <Modal
          isOpen={isMeetingModalOpen}
          onClose={() => setIsMeetingModalOpen(false)}
          title={editingMeeting ? 'تعديل بيانات الاجتماع' : 'إنشاء اجتماع سبت جديد'}
          maxWidth="md"
        >
          <form onSubmit={handleSaveMeeting} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                عنوان الاجتماع
              </label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="مثال: اجتماع السبت - الأسبوع الأول"
                className="w-full py-2 px-3 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brown-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                تاريخ الاجتماع
              </label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full py-2 px-3 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brown-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                حالة الاجتماع
              </label>
              <select
                value={meetingStatus}
                onChange={(e) => setMeetingStatus(e.target.value as any)}
                className="w-full py-2 px-3 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brown-600"
              >
                <option value="upcoming">قادم (Upcoming)</option>
                <option value="open">مفتوح لتسجيل الحضور (Open)</option>
                <option value="closed">مغلق (Closed)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                ملاحظات
              </label>
              <textarea
                value={meetingNotes}
                onChange={(e) => setMeetingNotes(e.target.value)}
                rows={2}
                placeholder="أي ملاحظات حول موضوع الاجتماع أو المتحدث"
                className="w-full py-2 px-3 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brown-600"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-brown-100 dark:border-brown-900/60">
              <Button variant="ghost" size="md" type="button" onClick={() => setIsMeetingModalOpen(false)}>
                إلغاء
              </Button>
              <Button variant="primary" size="md" type="submit" isLoading={isSavingMeeting}>
                حفظ الاجتماع
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Correct Attendance Record */}
        <Modal
          isOpen={!!correctingRecord}
          onClose={() => setCorrectingRecord(null)}
          title="تصحيح حالة الحضور"
          description={`تعديل حضور الخادم: ${correctingRecord?.user?.full_name}`}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                الحالة الجديدة
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['present', 'late', 'absent'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setNewStatus(st)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      newStatus === st
                        ? 'bg-brown-700 text-white border-brown-700 shadow-sm'
                        : 'bg-white dark:bg-[#231b15] text-brown-700 dark:text-brown-300 border-brown-200 dark:border-brown-700'
                    }`}
                  >
                    {st === 'present' ? 'حاضر' : st === 'late' ? 'متأخر' : 'غائب'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                سبب التصحيح
              </label>
              <input
                type="text"
                value={correctionNote}
                onChange={(e) => setCorrectionNote(e.target.value)}
                placeholder="مثال: تصحيح خطأ مسح الباركود"
                className="w-full py-2 px-3 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brown-600"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-brown-100 dark:border-brown-900/60">
              <Button variant="ghost" size="md" onClick={() => setCorrectingRecord(null)}>
                إلغاء
              </Button>
              <Button variant="primary" size="md" onClick={handleSaveCorrection} isLoading={isCorrecting}>
                حفظ التعديل
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
