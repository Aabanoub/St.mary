'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  FileUp,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Users,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  parseUsersExcel,
  generateTemplateExcel,
  generateImportResultsExcel,
  ParsedUserRow,
} from '@/lib/utils/excel';

export default function UsersImportPage() {
  const { role } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedUserRow[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'invalid' | 'duplicates'>('all');
  const [isParsing, setIsParsing] = useState(false);

  // Import processing state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<any[] | null>(null);

  const handleDownloadTemplate = () => {
    const blob = generateTemplateExcel();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'قالب-استيراد-خدام-العذراء-مريم.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsParsing(true);
    setImportResults(null);

    try {
      const buffer = await uploadedFile.arrayBuffer();
      const { rows, summary: parsedSummary } = parseUsersExcel(buffer);

      // Check existing phone numbers in Supabase profiles
      const phonesToCheck = rows.map((r) => r.normalizedPhone).filter(Boolean);
      let existingPhones = new Set<string>();

      if (phonesToCheck.length > 0) {
        const { data: existingProfiles } = await supabase
          .from('profiles')
          .select('phone')
          .in('phone', phonesToCheck);

        if (existingProfiles) {
          existingPhones = new Set(existingProfiles.map((p) => p.phone));
        }
      }

      // Mark existing accounts
      let alreadyExistsCount = 0;
      const verifiedRows = rows.map((r) => {
        if (r.status === 'valid' && existingPhones.has(r.normalizedPhone)) {
          alreadyExistsCount++;
          return {
            ...r,
            status: 'already_exists' as const,
            isValid: false,
            error: 'الحساب مسجل بالفعل في قاعدة البيانات',
          };
        }
        return r;
      });

      setParsedRows(verifiedRows);
      setSummary({
        ...parsedSummary,
        alreadyExists: alreadyExistsCount,
        valid: parsedSummary.valid - alreadyExistsCount,
      });
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء قراءة ملف الإكسيل. تأكد من صحة الملف.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleStartImport = async () => {
    setIsConfirmOpen(false);
    setIsImporting(true);
    setImportProgress(0);

    const validRows = parsedRows.filter((r) => r.status === 'valid');
    const results: any[] = [];

    // Also include skipped / invalid rows in the final result report
    parsedRows.forEach((r) => {
      if (r.status !== 'valid') {
        results.push({
          full_name: r.rawName || 'بدون اسم',
          phone: r.normalizedPhone || r.rawPhone,
          status: 'skipped',
          error: r.error,
        });
      }
    });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        // Call RPC: create_church_user
        const { data, error } = await supabase.rpc('create_church_user', {
          p_phone: row.normalizedPhone,
          p_full_name: row.rawName,
          p_role: 'user',
          p_password: row.normalizedPhone, // initial temporary password is phone number
          p_notes: 'تم الاستيراد بواسطة كشف إكسيل',
        });

        if (error) {
          failCount++;
          results.unshift({
            full_name: row.rawName,
            phone: row.normalizedPhone,
            status: 'failed',
            error: error.message,
          });
        } else {
          successCount++;
          results.unshift({
            full_name: row.rawName,
            phone: row.normalizedPhone,
            status: 'success',
            attendance_code: data?.attendance_code,
          });
        }
      } catch (err: unknown) {
        failCount++;
        const msg = err instanceof Error ? err.message : 'خطأ غير معروف';
        results.unshift({
          full_name: row.rawName,
          phone: row.normalizedPhone,
          status: 'failed',
          error: msg,
        });
      }

      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    // Save batch summary to user_import_batches
    try {
      await supabase.from('user_import_batches').insert({
        filename: file?.name || 'import.xlsx',
        total_records: parsedRows.length,
        success_count: successCount,
        fail_count: failCount,
        details: { valid: validRows.length, skipped: results.length - validRows.length },
      });
    } catch {
      // Ignored if batch table insert fails
    }

    setImportResults(results);
    setIsImporting(false);
  };

  const handleDownloadResultReport = () => {
    if (!importResults) return;
    const blob = generateImportResultsExcel(importResults);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير-نتائج-الاستيراد-${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (role !== 'super_admin') {
    return (
      <AppShell>
        <div className="p-8 text-center bg-white dark:bg-[#231b15] rounded-2xl border border-brown-200">
          <p className="text-sm font-bold text-rose-600">
            عذراً، صلاحية استيراد وإنشاء الحسابات من Excel مخصصة حصرياً للمشرف العام.
          </p>
        </div>
      </AppShell>
    );
  }

  const filteredRows = parsedRows.filter((r) => {
    if (activeTab === 'valid') return r.status === 'valid';
    if (activeTab === 'invalid') return r.status === 'invalid_phone' || r.status === 'missing_name';
    if (activeTab === 'duplicates')
      return r.status === 'duplicate_in_file' || r.status === 'already_exists';
    return true;
  });

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brown-100 dark:bg-brown-900/60 text-brown-800 dark:text-brown-200 text-xs font-semibold mb-1">
              <FileUp className="w-3.5 h-3.5 text-brown-600 dark:text-brown-400" />
              <span>إدارة الحسابات</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-brown-950 dark:text-brown-50">
              استيراد حسابات المشتركين من Excel
            </h1>
            <p className="text-xs sm:text-sm text-brown-600 dark:text-brown-400 mt-1">
              توليد الحسابات وأكواد الحضور الذكية ورموز QR تلقائياً من كشف الإكسيل
            </p>
          </div>

          <Button
            variant="outline"
            size="md"
            onClick={handleDownloadTemplate}
            leftIcon={<Download className="w-4 h-4" />}
            className="font-bold"
          >
            تحميل قالب Excel المعتمد
          </Button>
        </div>

        {/* Upload Zone */}
        {!importResults && (
          <Card className="p-8 text-center border-2 border-dashed border-brown-300 dark:border-brown-700 bg-brown-50/40 dark:bg-brown-950/20">
            <div className="w-16 h-16 rounded-2xl bg-brown-100 dark:bg-brown-900/60 flex items-center justify-center text-brown-700 dark:text-brown-300 mx-auto mb-4 shadow-sm">
              <FileSpreadsheet className="w-8 h-8" />
            </div>

            <h3 className="font-bold text-base md:text-lg text-brown-950 dark:text-brown-50 mb-1">
              اختر ملف Excel (.xlsx أو .xls)
            </h3>
            <p className="text-xs sm:text-sm text-brown-600 dark:text-brown-400 max-w-md mx-auto mb-5 leading-relaxed">
              الملف يحتوي على عمودين: <strong className="text-brown-900 dark:text-brown-200">الاسم</strong> و{' '}
              <strong className="text-brown-900 dark:text-brown-200">رقم الهاتف</strong> (رقم مصري من 11 خانة).
            </p>

            <label className="inline-block">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isParsing || isImporting}
              />
              <span className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-brown-700 hover:bg-brown-800 text-white shadow-warm cursor-pointer transition-all active:scale-95">
                {isParsing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري فحص وتدقيق الملف...</span>
                  </>
                ) : (
                  <>
                    <FileUp className="w-4 h-4" />
                    <span>تحديد الملف وبدء الفحص</span>
                  </>
                )}
              </span>
            </label>
          </Card>
        )}

        {/* Import Results View */}
        {importResults && (
          <Card className="p-6 bg-white dark:bg-[#231b15] space-y-6 animate-in fade-in duration-300">
            <div className="text-center pb-4 border-b border-brown-100 dark:border-brown-900/60">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-brown-950 dark:text-brown-50">
                اكتملت عملية الاستيراد بنجاح!
              </h2>
              <p className="text-xs text-brown-500 mt-1">
                تم إنشاء حسابات Supabase Auth وأكواد الحضور تلقائياً للمستخدمين الصالحين.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="success" size="md">
                  تم بنجاح: {importResults.filter((r) => r.status === 'success').length}
                </Badge>
                <Badge variant="danger" size="md">
                  فشل: {importResults.filter((r) => r.status === 'failed').length}
                </Badge>
                <Badge variant="warning" size="md">
                  تم تخطيها: {importResults.filter((r) => r.status === 'skipped').length}
                </Badge>
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadResultReport}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  تحميل تقرير النتائج Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImportResults(null);
                    setParsedRows([]);
                    setSummary(null);
                    setFile(null);
                  }}
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                >
                  استيراد ملف آخر
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-brown-50 dark:bg-brown-950/40 text-brown-700 dark:text-brown-300 font-bold border-b border-brown-200">
                    <th className="py-2.5 px-3">الاسم</th>
                    <th className="py-2.5 px-3">رقم الهاتف</th>
                    <th className="py-2.5 px-3">كود الحضور</th>
                    <th className="py-2.5 px-3">الحالة</th>
                    <th className="py-2.5 px-3">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brown-100 dark:divide-brown-900/60">
                  {importResults.map((res, i) => (
                    <tr key={i}>
                      <td className="py-2.5 px-3 font-bold">{res.full_name}</td>
                      <td className="py-2.5 px-3 font-mono">{res.phone}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-brown-700 dark:text-brown-300">
                        {res.attendance_code || '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={res.status === 'success' ? 'success' : res.status === 'failed' ? 'danger' : 'warning'}
                          size="sm"
                        >
                          {res.status === 'success' ? 'ناجح' : res.status === 'failed' ? 'فشل' : 'تم التخطي'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-brown-500 text-[11px]">{res.error || 'تم بنجاح'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Import Preview Table & Summary before Confirmation */}
        {summary && !importResults && (
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#231b15] border border-brown-200 dark:border-brown-800 text-center">
                <span className="text-[11px] text-brown-600 dark:text-brown-400 block mb-0.5">
                  إجمالي الصفوف
                </span>
                <span className="text-xl font-black text-brown-950 dark:text-brown-50">
                  {summary.total}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold block mb-0.5">
                  حسابات صالحة للإنشاء
                </span>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                  {summary.valid}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
                <span className="text-[11px] text-amber-800 dark:text-amber-300 font-bold block mb-0.5">
                  مسجلين بالفعل
                </span>
                <span className="text-xl font-black text-amber-700 dark:text-amber-400">
                  {summary.alreadyExists}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center">
                <span className="text-[11px] text-rose-800 dark:text-rose-300 font-bold block mb-0.5">
                  أرقام هواتف غير صحيحة
                </span>
                <span className="text-xl font-black text-rose-700 dark:text-rose-400">
                  {summary.invalidPhone}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-center">
                <span className="text-[11px] text-zinc-700 dark:text-zinc-300 font-bold block mb-0.5">
                  مكرر بالملف
                </span>
                <span className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                  {summary.duplicatesInFile}
                </span>
              </div>
            </div>

            {/* Action Bar before Import */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#231b15] border border-brown-200 dark:border-brown-800">
              {/* Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-brown-700 text-white'
                      : 'text-brown-700 dark:text-brown-300 hover:bg-brown-50'
                  }`}
                >
                  الكل ({parsedRows.length})
                </button>
                <button
                  onClick={() => setActiveTab('valid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'valid'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50'
                  }`}
                >
                  صالح للإنشاء ({summary.valid})
                </button>
                <button
                  onClick={() => setActiveTab('duplicates')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'duplicates'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50'
                  }`}
                >
                  مكرر وموجود ({summary.alreadyExists + summary.duplicatesInFile})
                </button>
                <button
                  onClick={() => setActiveTab('invalid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'invalid'
                      ? 'bg-rose-600 text-white'
                      : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50'
                  }`}
                >
                  غير صحيح ({summary.invalidPhone + summary.missingName})
                </button>
              </div>

              {/* Start Import Button */}
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsConfirmOpen(true)}
                disabled={summary.valid === 0 || isImporting}
                isLoading={isImporting}
                className="font-bold shadow-warm shrink-0"
              >
                تأكيد إنشاء {summary.valid} حساب الآن
              </Button>
            </div>

            {/* Progress Bar during Import */}
            {isImporting && (
              <div className="p-4 rounded-xl bg-white dark:bg-[#231b15] border border-brown-200">
                <div className="flex items-center justify-between text-xs font-bold text-brown-900 dark:text-brown-100 mb-2">
                  <span>جاري إنشاء الحسابات وتوليد أكواد QR...</span>
                  <span>%{importProgress}</span>
                </div>
                <div className="w-full h-2.5 bg-brown-100 dark:bg-brown-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brown-700 dark:bg-brown-500 transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Preview Table */}
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-right text-xs">
                  <thead className="bg-brown-50 dark:bg-brown-950/60 sticky top-0 border-b border-brown-200">
                    <tr className="text-brown-700 dark:text-brown-300 font-bold">
                      <th className="py-2.5 px-3">رقم الصف</th>
                      <th className="py-2.5 px-3">الاسم بالملف</th>
                      <th className="py-2.5 px-3">رقم الهاتف</th>
                      <th className="py-2.5 px-3">الحالة</th>
                      <th className="py-2.5 px-3">الملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brown-100 dark:divide-brown-900/60">
                    {filteredRows.map((row) => (
                      <tr
                        key={row.rowIndex}
                        className={
                          row.status === 'valid'
                            ? 'hover:bg-emerald-50/30'
                            : 'bg-rose-50/20 hover:bg-rose-50/40'
                        }
                      >
                        <td className="py-2 px-3 text-brown-400 font-mono">{row.rowIndex}</td>
                        <td className="py-2 px-3 font-bold text-brown-950 dark:text-brown-50">
                          {row.rawName || <span className="text-rose-500">غير محدد</span>}
                        </td>
                        <td className="py-2 px-3 font-mono">{row.normalizedPhone || row.rawPhone}</td>
                        <td className="py-2 px-3">
                          <Badge
                            variant={
                              row.status === 'valid'
                                ? 'success'
                                : row.status === 'already_exists' || row.status === 'duplicate_in_file'
                                ? 'warning'
                                : 'danger'
                            }
                            size="sm"
                          >
                            {row.status === 'valid'
                              ? 'صالح للإنشاء'
                              : row.status === 'already_exists'
                              ? 'مسجل بالفعل'
                              : row.status === 'duplicate_in_file'
                              ? 'مكرر بالملف'
                              : row.status === 'invalid_phone'
                              ? 'هاتف غير صحيح'
                              : 'الاسم مفقود'}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-[11px] text-brown-500">
                          {row.error || 'جاهز للإنشاء وتوليد كود الحضور'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Confirmation Dialog */}
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleStartImport}
          title="تأكيد إنشاء الحسابات"
          message={`سيتم الآن إنشاء ${summary?.valid} حساب جديد للمخدومين، وتعيين أرقام هواتفهم ككلمات مرور مؤقتة وتوليد أكواد حضور وQR فريدة. هل ترغب بالاستمرار؟`}
          confirmLabel="نعم، ابدأ الإنشاء"
          cancelLabel="تراجع"
          variant="primary"
          isLoading={isImporting}
        />
      </div>
    </AppShell>
  );
}
