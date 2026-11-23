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
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { AdminPermission } from '@/types/database';

const ALL_PERMISSIONS: { key: AdminPermission; label: string; desc: string }[] = [
  { key: 'scan_attendance', label: 'مسح باركود الحضور', desc: 'استخدام كاميرا QR وتسجيل الحضور المباشر' },
  { key: 'view_attendance', label: 'عرض سجلات الحضور', desc: 'الاطلاع على كشوف الحضور والغياب الأسبوعية' },
  { key: 'correct_attendance', label: 'تصحيح وتعديل الحضور', desc: 'تعديل حالة الحضور وحل الأخطاء' },
  { key: 'create_reading_plans', label: 'إنشاء خطط القراءة', desc: 'تأليف خطط قراءة جديدة وتعيين إصحاحات' },
  { key: 'edit_reading_plans', label: 'تعديل خطط القراءة', desc: 'تعديل وحذف خطط القراءة المنشورة' },
  { key: 'create_exams', label: 'إنشاء وبناء الامتحانات (خادم مصحح)', desc: 'إعداد وبناء أسئلة الامتحانات وتعيين درجاتها' },
  { key: 'edit_exams', label: 'تعديل ونشر الامتحانات', desc: 'تعديل الأسئلة والدرجات ونشر وإلغاء نشر الامتحانات' },
  { key: 'view_exam_results', label: 'تصحيح واعتماد درجات الامتحانات', desc: 'مراجعة أوراق الإجابات وتصحيح الأسئلة المقالية واعتماد النتيجة للمخدومين' },
  { key: 'send_notifications', label: 'إرسال إشعارات وتنبيهات', desc: 'إرسال رسائل وتنبيهات للمخدومين والمشرفين' },
];

export default function AdminPermissionsPage() {
  const { role, profile: superAdmin } = useAuth();
  const [admins, setAdmins] = useState<any[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [permissionsMap, setPermissionsMap] = useState<Record<string, boolean>>({});
  const [expiryDates, setExpiryDates] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchAdmins = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'super_admin'])
        .order('full_name', { ascending: true });

      if (error) throw error;
      setAdmins(data || []);

      if (data && data.length > 0) {
        const first = data.find((a) => a.role === 'admin') || data[0];
        setSelectedAdmin(first);
        await loadAdminPermissions(first.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdminPermissions = async (adminId: string) => {
    const { data } = await supabase
      .from('admin_permissions')
      .select('*')
      .eq('admin_id', adminId);

    const pMap: Record<string, boolean> = {};
    const eMap: Record<string, string> = {};

    data?.forEach((p) => {
      pMap[p.permission] = p.granted;
      if (p.valid_until) {
        eMap[p.permission] = p.valid_until.split('T')[0];
      }
    });

    setPermissionsMap(pMap);
    setExpiryDates(eMap);
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleSelectAdmin = async (admin: any) => {
    setSelectedAdmin(admin);
    setSaveSuccess(false);
    await loadAdminPermissions(admin.id);
  };

  const handleTogglePermission = (permKey: AdminPermission) => {
    setPermissionsMap((prev) => ({
      ...prev,
      [permKey]: !prev[permKey],
    }));
    setSaveSuccess(false);
  };

  const handleDateChange = (permKey: AdminPermission, dateStr: string) => {
    setExpiryDates((prev) => ({
      ...prev,
      [permKey]: dateStr,
    }));
    setSaveSuccess(false);
  };

  const handleSavePermissions = async () => {
    if (!selectedAdmin) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Upsert permissions in a single atomic batch
      const rows = ALL_PERMISSIONS.map((p) => ({
        admin_id: selectedAdmin.id,
        permission: p.key,
        granted: !!permissionsMap[p.key],
        valid_until: expiryDates[p.key] ? new Date(expiryDates[p.key]).toISOString() : null,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertErr } = await supabase
        .from('admin_permissions')
        .upsert(rows, { onConflict: 'admin_id, permission' });

      if (upsertErr) throw upsertErr;

      // Log activity
      await supabase.from('activity_logs').insert({
        actor_id: superAdmin?.id,
        action: 'UPDATE_ADMIN_PERMISSIONS',
        entity_type: 'admin_permission',
        entity_id: selectedAdmin.id,
        details: { admin_name: selectedAdmin.full_name, permissions: permissionsMap },
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'حدث خطأ في حفظ الصلاحيات');
    } finally {
      setIsSaving(false);
    }
  };

  if (role !== 'super_admin') {
    return (
      <AppShell>
        <div className="p-8 text-center bg-white dark:bg-[#231b15] rounded-2xl border border-brown-200">
          <p className="text-sm font-bold text-rose-600">
            لوحة إدارة وتفويض صلاحيات المشرفين مخصصة حصرياً للمشرف العام.
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 text-xs font-semibold mb-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>إدارة الرقابة والصلاحيات</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-brown-950 dark:text-brown-50">
              صلاحيات وتفويضات المشرفين والخدام
            </h1>
            <p className="text-xs sm:text-sm text-brown-600 dark:text-brown-400 mt-1">
              حدد الصلاحيات بدقة لكل مشرف مع إمكانية تحديد تواريخ انتهاء صلاحية مؤقتة
            </p>
          </div>

          {selectedAdmin && selectedAdmin.role === 'admin' && (
            <Button
              variant="primary"
              size="md"
              onClick={handleSavePermissions}
              isLoading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
              className="font-bold shadow-warm"
            >
              حفظ التعديلات فوراً
            </Button>
          )}
        </div>

        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-100 flex items-center gap-2 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>تم حفظ الصلاحيات بنجاح وتسري فوراً على حساب المشرف!</span>
          </div>
        )}

        {/* Layout: Admins List & Permissions Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Admins List */}
          <Card className="lg:col-span-1">
            <CardHeader
              title="قائمة المشرفين"
              subtitle="اختر مشرفاً لتعديل صلاحياته"
              icon={<User className="w-5 h-5" />}
            />

            <div className="space-y-2">
              {admins.map((adm) => {
                const isSelected = selectedAdmin?.id === adm.id;
                const isSuper = adm.role === 'super_admin';

                return (
                  <div
                    key={adm.id}
                    onClick={() => handleSelectAdmin(adm)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-brown-700 bg-brown-50 dark:bg-brown-900/40 shadow-sm'
                        : 'border-brown-200 dark:border-brown-800 hover:border-brown-400 bg-white dark:bg-[#231b15]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs sm:text-sm font-bold text-brown-950 dark:text-brown-50">
                        {adm.full_name}
                      </h4>
                      <Badge variant={isSuper ? 'brown' : 'warning'} size="sm">
                        {isSuper ? 'مشرف عام' : 'مشرف'}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-brown-500 font-mono">{adm.phone}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Permissions Matrix */}
          <Card className="lg:col-span-2">
            <CardHeader
              title={
                selectedAdmin
                  ? `صلاحيات: ${selectedAdmin.full_name}`
                  : 'مصفوفة الصلاحيات'
              }
              subtitle={
                selectedAdmin?.role === 'super_admin'
                  ? 'المشرف العام يملك كافة الصلاحيات بدون قيود افتراضياً'
                  : 'فعّل أو عطّل الصلاحيات المحددة'
              }
              icon={<ShieldCheck className="w-5 h-5" />}
            />

            {selectedAdmin?.role === 'super_admin' ? (
              <div className="p-8 text-center bg-brown-50/50 dark:bg-brown-950/30 rounded-xl border border-brown-200">
                <ShieldCheck className="w-12 h-12 text-brown-600 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-brown-900 dark:text-brown-100">
                  حساب المشرف العام
                </h4>
                <p className="text-xs text-brown-500 max-w-sm mx-auto mt-1">
                  يمتلك المشرف العام وصولاً شاملاً ومطلقاً لكافة وظائف التطبيق تلقائياً بموجب سياسات الأمان (RLS).
                </p>
              </div>
            ) : (
              <div className="divide-y divide-brown-100 dark:divide-brown-900/60">
                {ALL_PERMISSIONS.map((perm) => {
                  const isChecked = !!permissionsMap[perm.key];
                  const expiry = expiryDates[perm.key] || '';

                  return (
                    <div
                      key={perm.key}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id={perm.key}
                          checked={isChecked}
                          onChange={() => handleTogglePermission(perm.key)}
                          className="w-5 h-5 rounded text-brown-700 mt-0.5 cursor-pointer"
                        />
                        <div>
                          <label
                            htmlFor={perm.key}
                            className="text-xs sm:text-sm font-bold text-brown-950 dark:text-brown-50 cursor-pointer block"
                          >
                            {perm.label}
                          </label>
                          <span className="text-[11px] text-brown-500 leading-relaxed block mt-0.5">
                            {perm.desc}
                          </span>
                        </div>
                      </div>

                      {/* Expiration date for temporary permission */}
                      {isChecked && (
                        <div className="flex items-center gap-2 self-start sm:self-center pr-8 sm:pr-0">
                          <span className="text-[11px] text-brown-600 dark:text-brown-400 font-semibold whitespace-nowrap">
                            صالحة حتى:
                          </span>
                          <input
                            type="date"
                            value={expiry}
                            onChange={(e) => handleDateChange(perm.key, e.target.value)}
                            className="py-1 px-2 text-xs bg-brown-50/60 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-lg font-mono"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
