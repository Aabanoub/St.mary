'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ScrollText, Shield, Search, Clock, User, Filter } from 'lucide-react';
import { formatDateArabic, formatTimeArabic } from '@/lib/utils/formatters';

export default function ActivityLogsPage() {
  const { role } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [filterAction, setFilterAction] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*, actor:profiles(full_name, role, phone)')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        setLogs(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (role !== 'super_admin') {
    return (
      <AppShell>
        <div className="p-8 text-center bg-white dark:bg-[#231b15] rounded-2xl border border-brown-200">
          <p className="text-sm font-bold text-rose-600">
            سجل تدقيق الأنشطة والعمليات متاح حصرياً للمشرف العام لأغراض الأمان والرقابة.
          </p>
        </div>
      </AppShell>
    );
  }

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.action?.toLowerCase().includes(term) ||
      log.actor?.full_name?.toLowerCase().includes(term) ||
      log.entity_type?.toLowerCase().includes(term)
    );
  });

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brown-100 dark:bg-brown-900/60 text-brown-800 dark:text-brown-200 text-xs font-semibold mb-1">
            <ScrollText className="w-3.5 h-3.5 text-brown-600 dark:text-brown-400" />
            <span>الأمان والرقابة الإدارية</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-brown-950 dark:text-brown-50">
            سجل نشاط العمليات والتدقيق الأمني
          </h1>
          <p className="text-xs sm:text-sm text-brown-600 dark:text-brown-400 mt-1">
            سجل تاريخي غير قابل للتعديل يوثق كافة العمليات الإدارية والحضور والصلاحيات
          </p>
        </div>

        {/* Filter Bar */}
        <Card className="p-4 bg-white dark:bg-[#231b15]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث باسم المشرف أو العملية..."
                className="w-full pl-4 pr-10 py-2 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brown-600"
              />
              <Search className="w-4 h-4 text-brown-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-brown-600 dark:text-brown-400 whitespace-nowrap">
                نوع العملية:
              </span>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full sm:w-auto py-1.5 px-3 bg-brown-50/50 border border-brown-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brown-600"
              >
                <option value="all">كافة العمليات</option>
                <option value="RECORD_ATTENDANCE">تسجيل حضور (RECORD_ATTENDANCE)</option>
                <option value="CORRECT_ATTENDANCE">تصحيح حضور (CORRECT_ATTENDANCE)</option>
                <option value="CREATE_USER">إنشاء مستخدم (CREATE_USER)</option>
                <option value="UPDATE_ADMIN_PERMISSIONS">تعديل صلاحيات (PERMISSIONS)</option>
                <option value="SUBMIT_EXAM">تسليم امتحان (SUBMIT_EXAM)</option>
                <option value="RESET_PASSWORD">إعادة تعيين كلمة مرور</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Logs Table */}
        <Card className="overflow-hidden p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <p className="text-xs text-brown-500 text-center py-12">لا توجد سجلات مطابقة.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-brown-50 dark:bg-brown-950/60 border-b border-brown-200">
                  <tr className="text-brown-700 dark:text-brown-300 font-bold">
                    <th className="py-2.5 px-3">العملية الإدارية</th>
                    <th className="py-2.5 px-3">القائم بالعملية</th>
                    <th className="py-2.5 px-3">الكيان المتأثر</th>
                    <th className="py-2.5 px-3">التفاصيل</th>
                    <th className="py-2.5 px-3">التوقيت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brown-100 dark:divide-brown-900/60">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-brown-50/30">
                      <td className="py-3 px-3">
                        <Badge variant="brown" size="sm" className="font-mono">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-bold text-brown-950 dark:text-brown-50">
                        {log.actor?.full_name || 'النظام'}
                        <span className="block text-[10px] text-brown-400">
                          {log.actor?.role === 'super_admin' ? 'مشرف عام' : 'مشرف'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-brown-600 dark:text-brown-400">
                        {log.entity_type} {log.entity_id ? `(#${log.entity_id.slice(0, 8)})` : ''}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-brown-700 dark:text-brown-300 max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-brown-400 whitespace-nowrap">
                        {formatDateArabic(log.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
