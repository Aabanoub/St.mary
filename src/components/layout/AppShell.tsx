'use client';

import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fbf8f5] dark:bg-[#18120e]">
        <div className="w-16 h-16 rounded-2xl bg-brown-700 flex items-center justify-center mb-4 shadow-warm-lg animate-pulse">
          <Loader2 className="w-8 h-8 text-amber-300 animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-brown-950 dark:text-brown-50">
          كنيسة السيدة العذراء مريم
        </h2>
        <p className="text-xs text-brown-600 dark:text-brown-400 mt-1">
          جاري تحميل بيانات الخدمة...
        </p>
      </div>
    );
  }

  // If user is not authenticated, render without shell (e.g. login)
  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf8f5] dark:bg-[#18120e]">
      <Navbar />
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 w-full overflow-x-hidden">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
