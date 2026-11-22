'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import {
  LayoutDashboard,
  QrCode,
  CalendarCheck,
  BookOpen,
  FileSpreadsheet,
  Users,
  FileUp,
  Award,
  ShieldAlert,
  Bell,
  ScrollText,
  FileText,
  Download,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { role, hasPermission } = useAuth();
  const { isInstalled } = usePwaInstall();

  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin';

  const userNav = [
    { label: 'الرئيسية', href: '/dashboard', icon: LayoutDashboard },
    { label: 'كود الحضور الشخصي', href: '/attendance/my-qr', icon: QrCode },
    { label: 'سجل الحضور', href: '/attendance', icon: CalendarCheck },
    { label: 'قراءات الكتاب المقدس', href: '/bible-reading', icon: BookOpen },
    { label: 'الاختبارات الروحية', href: '/exams', icon: Award },
    { label: 'مركز الإشعارات', href: '/notifications', icon: Bell },
  ];

  const adminNav = [
    { label: 'الرئيسية', href: '/dashboard', icon: LayoutDashboard },
    { label: 'مسح كود الحضور QR', href: '/attendance/scan', icon: QrCode, visible: hasPermission('scan_attendance') },
    { label: 'إدارة الحضور والاجتماعات', href: '/attendance', icon: CalendarCheck, visible: hasPermission('view_attendance') },
    { label: 'إدارة خطط القراءة', href: '/bible-reading/manage', icon: BookOpen, visible: hasPermission('create_reading_plans') || hasPermission('edit_reading_plans') },
    { label: 'إدارة الامتحانات والأسئلة', href: '/exams/manage', icon: Award, visible: hasPermission('create_exams') || hasPermission('edit_exams') },
    { label: 'مركز الإشعارات', href: '/notifications', icon: Bell },
  ];

  const superAdminNav = [
    { label: 'لوحة القيادة العامة', href: '/dashboard', icon: LayoutDashboard },
    { label: 'مسح كود الحضور QR', href: '/attendance/scan', icon: QrCode },
    { label: 'إدارة الحضور والاجتماعات', href: '/attendance', icon: CalendarCheck },
    { label: 'تقارير الحضور الرسمية (PDF)', href: '/attendance/reports', icon: FileSpreadsheet },
    { label: 'حسابات المخدومين والخدام', href: '/users', icon: Users },
    { label: 'استيراد الحسابات من Excel', href: '/users/import', icon: FileUp },
    { label: 'إدارة خطط القراءة', href: '/bible-reading/manage', icon: BookOpen },
    { label: 'إدارة الامتحانات والتقييمات', href: '/exams/manage', icon: Award },
    { label: 'صلاحيات المشرفين', href: '/exams/permissions', icon: ShieldAlert },
    { label: 'مركز الإشعارات العام', href: '/notifications', icon: Bell },
    { label: 'سجل نشاط النظام (Audit)', href: '/activity-logs', icon: ScrollText },
  ];

  const items = isSuperAdmin
    ? superAdminNav
    : isAdmin
    ? adminNav.filter((i) => i.visible !== false)
    : userNav;

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-[#231b15] border-l border-brown-200/80 dark:border-brown-900/80 min-h-[calc(100vh-4rem)] p-4 shrink-0 shadow-warm">
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-brown-700 text-white shadow-sm dark:bg-brown-600'
                  : 'text-brown-800 dark:text-brown-200 hover:bg-brown-50 dark:hover:bg-brown-900/50 hover:text-brown-950 dark:hover:text-brown-50'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? 'text-white' : 'text-brown-600 dark:text-brown-400'
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Quick Info Box at Bottom & PWA Install Button (Hidden if already installed) */}
      <div className="mt-auto pt-4 border-t border-brown-100 dark:border-brown-900/60">
        {!isInstalled && (
          <button
            onClick={() => window.dispatchEvent(new Event('open-pwa-install'))}
            className="w-full mb-3 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300/60 dark:border-amber-800/60 text-amber-950 dark:text-amber-200 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all cursor-pointer shadow-sm group"
          >
            <Download className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
            <span>تثبيت التطبيق على جهازك</span>
          </button>
        )}

        <div className="p-3 bg-brown-50/70 dark:bg-brown-950/40 rounded-xl border border-brown-200/50 dark:border-brown-900/40 text-center">
          <p className="text-[11px] font-bold text-brown-900 dark:text-brown-200 mb-0.5">
            كنيسة السيدة العذراء مريم
          </p>
          <p className="text-[10px] text-brown-600 dark:text-brown-400">
            خدمة إعداد الخدام - 2026
          </p>
        </div>
      </div>
    </aside>
  );
}
