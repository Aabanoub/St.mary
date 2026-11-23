'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  Check,
  X,
  Clock,
  Sparkles,
} from 'lucide-react';
import { exportAttendanceMatrixExcel } from '@/lib/utils/excel';
import { formatShortDateArabic, formatDateArabic } from '@/lib/utils/formatters';

export default function AttendanceReportsPage() {
  const { role } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<any[]>([]);
  const [reportRows, setReportRows] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReportData = async () => {
      try {
        setIsLoading(true);

        // 1. Fetch all meetings
        const { data: mList } = await supabase
          .from('meetings')
          .select('*')
          .order('meeting_date', { ascending: true });

        const allMeetings = mList || [];
        setMeetings(allMeetings);

        // Set initial date filter (e.g. past 3 months)
        if (allMeetings.length > 0) {
          setStartDate(allMeetings[0].meeting_date);
          setEndDate(allMeetings[allMeetings.length - 1].meeting_date);
        }

        // 2. Fetch all active users
        const { data: uList } = await supabase
          .from('profiles')
          .select('id, full_name, phone, attendance_code')
          .eq('role', 'user')
          .eq('is_active', true)
          .order('full_name', { ascending: true });

        const allUsers = uList || [];
        setAttendees(allUsers);

        // 3. Fetch all attendance
        const { data: attList } = await supabase
          .from('attendance')
          .select('meeting_id, user_id, status');

        // Build report matrix
        buildMatrix(allMeetings, allUsers, attList || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadReportData();
  }, []);

  const buildMatrix = (mList: any[], uList: any[], attList: any[]) => {
    // Map attendance: `meeting_id:user_id` -> status
    const attMap = new Map<string, 'present' | 'late' | 'absent'>();
    attList.forEach((a) => {
      attMap.set(`${a.meeting_id}:${a.user_id}`, a.status);
    });

    const rows = uList.map((user) => {
      let attended = 0;
      let missed = 0;
      const records: Record<string, 'present' | 'late' | 'absent'> = {};

      mList.forEach((m) => {
        const st = attMap.get(`${m.id}:${user.id}`);
        if (st === 'present' || st === 'late') {
          attended++;
          records[m.id] = st;
        } else {
          missed++;
          records[m.id] = 'absent';
        }
      });

      const totalM = mList.length;
      const pct = totalM > 0 ? Math.round((attended / totalM) * 100) : 0;

      return {
        user_id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        attendance_code: user.attendance_code,
        records,
        attendedCount: attended,
        missedCount: missed,
        percentage: pct,
      };
    });

    setFilteredMeetings(mList);
    setReportRows(rows);
  };

  const handleApplyFilter = async () => {
    const filteredM = meetings.filter((m) => {
      if (startDate && m.meeting_date < startDate) return false;
      if (endDate && m.meeting_date > endDate) return false;
      return true;
    });

    // Fetch attendance for these meetings
    const { data: attList } = await supabase
      .from('attendance')
      .select('meeting_id, user_id, status')
      .in('meeting_id', filteredM.map((m) => m.id));

    buildMatrix(filteredM, attendees, attList || []);
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `تقرير-حضور-إعداد-خدام-${new Date().toISOString().split('T')[0]}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  const handleDownloadExcel = () => {
    const blob = exportAttendanceMatrixExcel(filteredMeetings, reportRows);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `سجل-حضور-إعداد-خدام-${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (role !== 'super_admin') {
    return (
      <AppShell>
        <div className="p-8 text-center bg-white dark:bg-[#231b15] rounded-2xl border border-brown-200">
          <p className="text-sm font-bold text-rose-600">
            عذراً، تقارير الحضور الرسمية وتصدير PDF متاحة حصرياً للمشرف العام.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header (Hidden on Print) */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brown-100 dark:bg-brown-900/60 text-brown-800 dark:text-brown-200 text-xs font-semibold mb-1">
              <FileSpreadsheet className="w-3.5 h-3.5 text-brown-600 dark:text-brown-400" />
              <span>التقارير والإحصائيات الرسمية</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-brown-950 dark:text-brown-50">
              تقرير الحضور والغياب الشامل
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="primary"
              size="md"
              onClick={handlePrint}
              leftIcon={<Printer className="w-4 h-4" />}
              className="font-bold shadow-warm"
            >
              طباعة / حفظ PDF
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={handleDownloadExcel}
              leftIcon={<Download className="w-4 h-4" />}
              className="font-bold"
            >
              تصدير Excel
            </Button>
          </div>
        </div>

        {/* Filter Bar (Hidden on Print) */}
        <Card className="no-print p-4 bg-brown-50/50 dark:bg-brown-950/40">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                من تاريخ
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full py-2 px-3 bg-white dark:bg-[#231b15] border border-brown-300 dark:border-brown-700 rounded-xl text-xs sm:text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                إلى تاريخ
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full py-2 px-3 bg-white dark:bg-[#231b15] border border-brown-300 dark:border-brown-700 rounded-xl text-xs sm:text-sm font-semibold"
              />
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleApplyFilter}
              leftIcon={<Filter className="w-4 h-4" />}
              className="font-bold"
            >
              تطبيق التصفية
            </Button>
          </div>
        </Card>

        {/* Helper Note for PDF (Hidden on Print) */}
        <div className="no-print flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 text-xs font-semibold text-amber-900 dark:text-amber-200">
          <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>لحفظ التقرير كملف PDF رسمي:</strong> اضغط على زر &quot;طباعة / حفظ PDF&quot;، ثم اختر من شاشة الطباعة الوجهة (Destination): <strong>&quot;حفظ بتنسيق PDF&quot; (Save as PDF)</strong> لتنزيل مستند معتمد عالي الدقة بخطوط عربية سليمة 100%.
          </span>
        </div>

        {/* Official Printable Report View (Visible on Screen & Perfectly Formatted for Print) */}
        <Card className="printable-report p-6 bg-white dark:bg-[#231b15]">
          {/* Official Letterhead Header */}
          <div className="text-center pb-6 mb-6 border-b-2 border-brown-700 dark:border-brown-500">
            <h2 className="text-xl sm:text-2xl font-black text-brown-950 dark:text-brown-50">
              كنيسة السيدة العذراء مريم
            </h2>
            <h3 className="text-sm sm:text-base font-bold text-brown-700 dark:text-brown-300 mt-1">
              خدمة إعداد خدام - كشف الحضور والغياب الأسبوعي
            </h3>
            <p className="text-xs text-brown-500 mt-1">
              الفترة: من {startDate ? formatShortDateArabic(startDate) : 'البداية'} إلى{' '}
              {endDate ? formatShortDateArabic(endDate) : 'الآن'} | إجمالي الاجتماعات:{' '}
              {filteredMeetings.length}
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : reportRows.length === 0 ? (
            <p className="text-xs text-brown-500 text-center py-12">
              لا توجد بيانات مطابقة للفترة المحددة.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr className="bg-brown-700 text-white font-bold">
                    <th className="py-2.5 px-2 text-right">م</th>
                    <th className="py-2.5 px-3 text-right">الاسم</th>
                    <th className="py-2.5 px-2">كود الحضور</th>
                    {filteredMeetings.map((m) => (
                      <th key={m.id} className="py-2.5 px-2 font-mono whitespace-nowrap">
                        {formatShortDateArabic(m.meeting_date)}
                      </th>
                    ))}
                    <th className="py-2.5 px-2">حضور</th>
                    <th className="py-2.5 px-2">غياب</th>
                    <th className="py-2.5 px-2">النسبة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brown-200 dark:divide-brown-800">
                  {reportRows.map((row, idx) => (
                    <tr
                      key={row.user_id}
                      className={idx % 2 === 0 ? 'bg-white dark:bg-[#231b15]' : 'bg-brown-50/40 dark:bg-brown-950/20'}
                    >
                      <td className="py-2 px-2 text-right text-brown-500 font-bold">{idx + 1}</td>
                      <td className="py-2 px-3 text-right font-bold text-brown-950 dark:text-brown-50 whitespace-nowrap">
                        {row.full_name}
                      </td>
                      <td className="py-2 px-2 font-mono text-[11px] text-brown-600 dark:text-brown-400">
                        {row.attendance_code}
                      </td>

                      {/* Matrix cells */}
                      {filteredMeetings.map((m) => {
                        const st = row.records[m.id];
                        return (
                          <td key={m.id} className="py-2 px-2 text-center">
                            {st === 'present' ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                                ✓
                              </span>
                            ) : st === 'late' ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                                م
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold">
                                ✗
                              </span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-2 px-2 font-bold text-emerald-700 dark:text-emerald-400">
                        {row.attendedCount}
                      </td>
                      <td className="py-2 px-2 font-bold text-rose-700 dark:text-rose-400">
                        {row.missedCount}
                      </td>
                      <td className="py-2 px-2 font-black text-brown-900 dark:text-brown-100">
                        %{row.percentage}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Official Stamp & Signatures Box for Print */}
          <div className="mt-8 pt-6 border-t border-brown-200 dark:border-brown-800 flex items-center justify-between text-xs font-bold text-brown-800 dark:text-brown-200 px-6">
            <div>
              <span>توقيع أمين الخدمة:</span>
              <div className="mt-6 border-b border-dashed border-brown-400 w-36" />
            </div>
            <div className="text-center">
              <span>خاتم الكنيسة</span>
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-brown-400 mt-2 mx-auto flex items-center justify-center text-[10px] text-brown-400">
                ختم الخدمة
              </div>
            </div>
            <div>
              <span>اعتماد المشرف العام:</span>
              <div className="mt-6 border-b border-dashed border-brown-400 w-36" />
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
