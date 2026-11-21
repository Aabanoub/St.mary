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
import { QRCodeSVG } from 'qrcode.react';
import {
  Users,
  Search,
  Plus,
  FileUp,
  KeyRound,
  RefreshCw,
  QrCode,
  Shield,
  ShieldAlert,
  UserX,
  UserCheck,
  Phone,
  Eye,
} from 'lucide-react';
import { getRoleBadgeConfig, formatDateArabic } from '@/lib/utils/formatters';

export default function UsersDirectoryPage() {
  const { role, profile: currentAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New user form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');

  const isSuperAdmin = role === 'super_admin';

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('create_church_user', {
        p_phone: newPhone.trim(),
        p_full_name: newName.trim(),
        p_role: newRole,
        p_password: newPhone.trim(),
        p_notes: 'تمت الإضافة يدوياً بواسطة المشرف العام',
      });

      if (error) throw error;

      setIsCreateModalOpen(false);
      setNewName('');
      setNewPhone('');
      await fetchUsers();
      alert(`تم إنشاء الحساب بنجاح! كود الحضور: ${data.attendance_code}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء الحساب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSuspend = async (u: any) => {
    const nextState = !u.is_active;
    try {
      await supabase
        .from('profiles')
        .update({ is_active: nextState, updated_at: new Date().toISOString() })
        .eq('id', u.id);

      // Log activity
      await supabase.from('activity_logs').insert({
        actor_id: currentAdmin?.id,
        action: nextState ? 'ACTIVATE_USER' : 'SUSPEND_USER',
        entity_type: 'profile',
        entity_id: u.id,
        details: { user_name: u.full_name, phone: u.phone },
      });

      await fetchUsers();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'حدث خطأ أثناء تعديل حالة الحساب');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPasswordInput) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.rpc('admin_reset_password', {
        p_user_id: selectedUser.id,
        p_new_password: newPasswordInput.trim(),
      });

      if (error) throw error;

      setIsResetPasswordOpen(false);
      setNewPasswordInput('');
      alert('تم إعادة تعيين كلمة المرور بنجاح، وسيلزم المستخدم بتغييرها عند الدخول.');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'حدث خطأ في إعادة تعيين كلمة المرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerateQr = async (u: any) => {
    if (!confirm(`هل أنت متأكد من إعادة توليد رمز QR للخادم "${u.full_name}"؟ سيتوقف الرمز القديم عن العمل.`)) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('admin_regenerate_qr', {
        p_user_id: u.id,
      });

      if (error) throw error;
      await fetchUsers();
      alert('تم توليد رمز باركود جديد بنجاح.');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'حدث خطأ في إعادة توليد الرمز');
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter === 'user' && u.role !== 'user') return false;
    if (roleFilter === 'admin' && u.role !== 'admin') return false;
    if (roleFilter === 'inactive' && u.is_active) return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(term) ||
      u.phone?.includes(term) ||
      u.attendance_code?.toLowerCase().includes(term)
    );
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brown-100 dark:bg-brown-900/60 text-brown-800 dark:text-brown-200 text-xs font-semibold mb-1">
              <Users className="w-3.5 h-3.5 text-brown-600 dark:text-brown-400" />
              <span>دليل الحسابات والمشتركين</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-brown-950 dark:text-brown-50">
              إدارة الخدام والمخدومين
            </h1>
            <p className="text-xs sm:text-sm text-brown-600 dark:text-brown-400 mt-1">
              إجمالي الحسابات المسجلة: {users.length} حساب
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isSuperAdmin && (
              <>
                <Link href="/users/import">
                  <Button variant="secondary" size="md" leftIcon={<FileUp className="w-4 h-4" />}>
                    استيراد Excel
                  </Button>
                </Link>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsCreateModalOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  إضافة عضو جديد
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filters and Search Bar */}
        <Card className="p-4 bg-white dark:bg-[#231b15]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بالاسم أو الهاتف أو الكود..."
                className="w-full pl-4 pr-10 py-2 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brown-600"
              />
              <Search className="w-4 h-4 text-brown-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Role Filter Tabs */}
            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  roleFilter === 'all'
                    ? 'bg-brown-700 text-white'
                    : 'text-brown-700 dark:text-brown-300 hover:bg-brown-50'
                }`}
              >
                الكل ({users.length})
              </button>
              <button
                onClick={() => setRoleFilter('user')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  roleFilter === 'user'
                    ? 'bg-brown-700 text-white'
                    : 'text-brown-700 dark:text-brown-300 hover:bg-brown-50'
                }`}
              >
                المخدومين ({users.filter((u) => u.role === 'user').length})
              </button>
              <button
                onClick={() => setRoleFilter('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  roleFilter === 'admin'
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50'
                }`}
              >
                المشرفين ({users.filter((u) => u.role === 'admin').length})
              </button>
              <button
                onClick={() => setRoleFilter('inactive')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  roleFilter === 'inactive'
                    ? 'bg-rose-600 text-white'
                    : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50'
                }`}
              >
                معطلين ({users.filter((u) => !u.is_active).length})
              </button>
            </div>
          </div>
        </Card>

        {/* Users Table */}
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-brown-50 dark:bg-brown-950/60 border-b border-brown-200">
                <tr className="text-brown-700 dark:text-brown-300 font-bold">
                  <th className="py-3 px-4">الاسم بالكامل</th>
                  <th className="py-3 px-4">رقم الهاتف</th>
                  <th className="py-3 px-4">كود الحضور</th>
                  <th className="py-3 px-4">نوع الحساب</th>
                  <th className="py-3 px-4">الحالة</th>
                  {isSuperAdmin && <th className="py-3 px-4 text-center">الإجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-brown-100 dark:divide-brown-900/60">
                {filteredUsers.map((u) => {
                  const roleBadge = getRoleBadgeConfig(u.role);
                  return (
                    <tr
                      key={u.id}
                      className={u.is_active ? 'hover:bg-brown-50/40' : 'bg-rose-50/30'}
                    >
                      <td className="py-3.5 px-4 font-bold text-brown-950 dark:text-brown-50">
                        {u.full_name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-brown-700 dark:text-brown-300">
                        {u.phone}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-brown-900 dark:text-brown-100">
                        {u.attendance_code}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleBadge.bg}`}
                        >
                          {roleBadge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={u.is_active ? 'success' : 'danger'} size="sm" dot>
                          {u.is_active ? 'نشط' : 'معطل'}
                        </Badge>
                      </td>

                      {isSuperAdmin && (
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* QR Preview */}
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setIsQrModalOpen(true);
                              }}
                              className="p-1.5 text-brown-600 hover:text-brown-900 rounded-lg hover:bg-brown-100 transition-colors"
                              title="عرض كود QR"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>

                            {/* Reset Password */}
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setNewPasswordInput(u.phone); // default reset to phone
                                setIsResetPasswordOpen(true);
                              }}
                              className="p-1.5 text-amber-600 hover:text-amber-800 rounded-lg hover:bg-amber-50 transition-colors"
                              title="إعادة تعيين كلمة المرور"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>

                            {/* Regenerate QR */}
                            <button
                              onClick={() => handleRegenerateQr(u)}
                              className="p-1.5 text-brown-600 hover:text-brown-900 rounded-lg hover:bg-brown-100 transition-colors"
                              title="إعادة توليد رمز QR جديد"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>

                            {/* Toggle Suspend */}
                            {u.role !== 'super_admin' && (
                              <button
                                onClick={() => handleToggleSuspend(u)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  u.is_active
                                    ? 'text-rose-600 hover:text-rose-800 hover:bg-rose-50'
                                    : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                                }`}
                                title={u.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                              >
                                {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Modal: View QR */}
        <Modal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          title={`باركود الحضور: ${selectedUser?.full_name}`}
          maxWidth="sm"
        >
          <div className="flex flex-col items-center text-center p-4">
            <div className="p-4 bg-white rounded-2xl border-2 border-brown-700 shadow-md mb-4">
              <QRCodeSVG value={selectedUser?.qr_token || 'stmary'} size={200} />
            </div>
            <span className="text-base font-black text-brown-950 font-mono tracking-widest mb-1">
              {selectedUser?.attendance_code}
            </span>
            <span className="text-xs text-brown-500 font-mono">{selectedUser?.phone}</span>
          </div>
        </Modal>

        {/* Modal: Add Member */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="إضافة خادم / مخدوم جديد"
          maxWidth="md"
        >
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                الاسم بالكامل
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثال: يوسف ماهر كمال"
                className="w-full py-2 px-3 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brown-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                رقم الهاتف (مصري من 11 خانة)
              </label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="مثال: 01012345678"
                dir="ltr"
                className="w-full text-right py-2 px-3 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brown-600"
                required
              />
              <p className="text-[11px] text-brown-500 mt-1">
                سيكون رقم الهاتف هو اسم المستخدم وكلمة المرور المؤقتة للحساب
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                نوع الحساب (الدور)
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="w-full py-2 px-3 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brown-600"
              >
                <option value="user">مخدوم / خادم مشارك (User)</option>
                <option value="admin">مشرف إداري (Admin)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-brown-100 dark:border-brown-900/60">
              <Button variant="ghost" size="md" type="button" onClick={() => setIsCreateModalOpen(false)}>
                إلغاء
              </Button>
              <Button variant="primary" size="md" type="submit" isLoading={isSubmitting}>
                إنشاء الحساب وتوليد الباركود
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Reset Password */}
        <Modal
          isOpen={isResetPasswordOpen}
          onClose={() => setIsResetPasswordOpen(false)}
          title={`إعادة تعيين كلمة المرور: ${selectedUser?.full_name}`}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-brown-600 dark:text-brown-400">
              أدخل كلمة المرور الجديدة. يمكنك استخدام رقم هاتفه ككلمة مرور مؤقتة:
            </p>
            <input
              type="text"
              value={newPasswordInput}
              onChange={(e) => setNewPasswordInput(e.target.value)}
              placeholder="كلمة المرور الجديدة"
              dir="ltr"
              className="w-full text-right py-2 px-3 bg-brown-50/50 border border-brown-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brown-600"
            />
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-brown-100">
              <Button variant="ghost" size="md" onClick={() => setIsResetPasswordOpen(false)}>
                إلغاء
              </Button>
              <Button variant="primary" size="md" onClick={handleResetPassword} isLoading={isSubmitting}>
                تأكيد التعيين
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
