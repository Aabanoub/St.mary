'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  QrCode,
  BookOpen,
  Award,
  Bell,
  Menu,
} from 'lucide-react';

export function MobileNav() {
  const pathname = usePathname();
  const { role, hasPermission } = useAuth();

  const isScanner = role === 'super_admin' || (role === 'admin' && hasPermission('scan_attendance'));

  const items = [
    { label: 'الرئيسية', href: '/dashboard', icon: LayoutDashboard },
    {
      label: isScanner ? 'مسح QR' : 'كودي',
      href: isScanner ? '/attendance/scan' : '/attendance/my-qr',
      icon: QrCode,
      highlight: true,
    },
    { label: 'القراءات', href: '/bible-reading', icon: BookOpen },
    { label: 'الامتحانات', href: '/exams', icon: Award },
    { label: 'الإشعارات', href: '/notifications', icon: Bell },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1f1712]/95 backdrop-blur border-t border-brown-200/80 dark:border-brown-900/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-6 group"
              >
                <div className="w-13 h-13 rounded-full bg-brown-700 dark:bg-brown-600 text-white flex items-center justify-center shadow-warm-lg ring-4 ring-white dark:ring-[#1f1712] transition-transform active:scale-95">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-brown-900 dark:text-brown-100 mt-1">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                isActive
                  ? 'text-brown-700 dark:text-brown-400 font-bold'
                  : 'text-brown-500 dark:text-brown-400 hover:text-brown-800'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
