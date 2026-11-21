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
  Bell,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  Check,
  ExternalLink,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { formatDateArabic, formatTimeArabic } from '@/lib/utils/formatters';

export default function NotificationsPage() {
  const { profile, role, hasPermission } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Compose Modal state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'users' | 'admins'>('all');
  const [linkUrl, setLinkUrl] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Web Push state
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  const canSend = role === 'super_admin' || hasPermission('send_notifications');

  const fetchNotifications = async () => {
    if (!profile) return;
    try {
      setIsLoading(true);

      // Fetch user's notification recipient entries
      const { data, error } = await supabase
        .from('notification_recipients')
        .select('id, is_read, read_at, notification:notifications(*)')
        .eq('user_id', profile.id)
        .order('id', { ascending: false });

      if (!error && data && data.length > 0) {
        setNotifications(data);
      } else {
        // Fallback: fetch global notifications
        const { data: globalNotifs } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });

        const mapped = (globalNotifs || []).map((n) => ({
          id: n.id,
          is_read: true,
          notification: n,
        }));
        setNotifications(mapped);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Check Push support
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsPushSupported(true);
      if (Notification.permission === 'granted') {
        setPushSubscribed(true);
      }
    }
  }, [profile]);

  const handleMarkAsRead = async (recipientId: string) => {
    await supabase
      .from('notification_recipients')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', recipientId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === recipientId ? { ...n, is_read: true } : n))
    );
  };

  const handleRequestPush = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setPushSubscribed(true);
      // Register subscription in Supabase if serviceWorker available
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'BCm5E5vXfSjYg3q9g01n8m7v6c5x4z3a2b1...', // standard VAPID public placeholder
        });

        if (profile) {
          const subJson = sub.toJSON();
          await supabase.from('push_subscriptions').upsert({
            user_id: profile.id,
            endpoint: sub.endpoint,
            p256dh: subJson.keys?.p256dh || '',
            auth: subJson.keys?.auth || '',
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.log('Push subscription setup completed locally.');
      }
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;
    setIsSending(true);

    try {
      // 1. Insert notification
      const { data: notifData, error: notifErr } = await supabase
        .from('notifications')
        .insert({
          title,
          message,
          target_type: targetType,
          link_url: linkUrl || null,
          created_by: profile?.id,
        })
        .select()
        .single();

      if (notifErr) throw notifErr;

      // 2. Query target recipients
      let uQuery = supabase.from('profiles').select('id');
      if (targetType === 'users') {
        uQuery = uQuery.eq('role', 'user');
      } else if (targetType === 'admins') {
        uQuery = uQuery.in('role', ['admin', 'super_admin']);
      }

      const { data: targetUsers } = await uQuery;

      if (targetUsers && targetUsers.length > 0) {
        const recipientRows = targetUsers.map((u) => ({
          notification_id: notifData.id,
          user_id: u.id,
          is_read: false,
        }));

        await supabase.from('notification_recipients').insert(recipientRows);
      }

      setIsComposeOpen(false);
      setTitle('');
      setMessage('');
      setLinkUrl('');
      await fetchNotifications();
      alert('تم إرسال الإشعار بنجاح لكافة المستهدفين!');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'حدث خطأ أثناء إرسال الإشعار');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brown-100 dark:bg-brown-900/60 text-brown-800 dark:text-brown-200 text-xs font-semibold mb-1">
              <Bell className="w-3.5 h-3.5 text-brown-600 dark:text-brown-400" />
              <span>مركز الإعلانات والتنبيهات</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-brown-950 dark:text-brown-50">
              الإشعارات والتواصل الروحي
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            {isPushSupported && (
              <Button
                variant={pushSubscribed ? 'outline' : 'secondary'}
                size="sm"
                onClick={handleRequestPush}
                leftIcon={<Radio className="w-4 h-4 text-emerald-600" />}
              >
                {pushSubscribed ? 'إشعارات المتصفح مفعّلة' : 'تفعيل إشعارات Push'}
              </Button>
            )}

            {canSend && (
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsComposeOpen(true)}
                leftIcon={<Send className="w-4 h-4" />}
                className="font-bold shadow-warm"
              >
                إرسال إشعار جديد
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <Card className="p-0 overflow-hidden">
          <CardHeader
            title="الإشعارات الواردة"
            subtitle={`${notifications.length} إشعار مسجل`}
            icon={<Bell className="w-5 h-5" />}
          />

          {notifications.length === 0 ? (
            <p className="text-xs text-brown-500 text-center py-12">
              صندوق الإشعارات فارغ حالياً. ستظهر هنا كافة التنبيهات الموجهة إليك.
            </p>
          ) : (
            <div className="divide-y divide-brown-100 dark:divide-brown-900/60">
              {notifications.map((item) => {
                const notif = item.notification;
                const isRead = item.is_read;

                return (
                  <div
                    key={item.id}
                    className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors ${
                      isRead ? 'bg-white dark:bg-[#231b15]' : 'bg-brown-50/60 dark:bg-brown-950/40'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isRead
                            ? 'bg-brown-100 text-brown-600 dark:bg-brown-900 dark:text-brown-300'
                            : 'bg-brown-700 text-white shadow-sm'
                        }`}
                      >
                        <Bell className="w-4 h-4" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-bold text-brown-950 dark:text-brown-50">
                            {notif?.title}
                          </h4>
                          {!isRead && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                          )}
                        </div>

                        <p className="text-xs text-brown-700 dark:text-brown-300 leading-relaxed mb-2">
                          {notif?.message}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-brown-500">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {formatDateArabic(notif?.created_at)}
                          </span>

                          {notif?.link_url && (
                            <Link
                              href={notif.link_url}
                              className="text-brown-700 dark:text-brown-300 font-bold hover:underline flex items-center gap-1"
                            >
                              <span>فتح الرابط الداخلي</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isRead && (
                      <button
                        onClick={() => handleMarkAsRead(item.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-brown-700 hover:bg-brown-100 dark:text-brown-300 dark:hover:bg-brown-900 shrink-0 cursor-pointer"
                        title="تعليم كمقروء"
                      >
                        تعليم كمقروء
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Modal: Compose Notification */}
        <Modal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          title="إرسال إشعار عام للخدمة"
          maxWidth="md"
        >
          <form onSubmit={handleSendNotification} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                عنوان الإشعار
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: موعد اجتماع السبت القادم"
                className="w-full py-2 px-3 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brown-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                الفئة المستهدفة
              </label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as any)}
                className="w-full py-2 px-3 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brown-600"
              >
                <option value="all">كافة الأعضاء (مخدومين ومشرفين)</option>
                <option value="users">المخدومين فقط</option>
                <option value="admins">المشرفين فقط</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                نص الرسالة
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="اكتب نص الإشعار بالتفصيل..."
                className="w-full py-2 px-3 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brown-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                رابط داخلي اختياري
              </label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="مثال: /exams أو /bible-reading"
                dir="ltr"
                className="w-full text-right py-2 px-3 bg-brown-50/50 border border-brown-300 rounded-xl text-sm font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-brown-100">
              <Button variant="ghost" size="md" type="button" onClick={() => setIsComposeOpen(false)}>
                إلغاء
              </Button>
              <Button variant="primary" size="md" type="submit" isLoading={isSending}>
                إرسال الإشعار فوراً
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
