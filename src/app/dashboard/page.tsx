'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { UserDashboard } from '@/components/dashboard/UserDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { SuperAdminDashboard } from '@/components/dashboard/SuperAdminDashboard';
import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardPage() {
  const { role, isLoading } = useAuth();

  return (
    <AppShell>
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        </div>
      ) : role === 'super_admin' ? (
        <SuperAdminDashboard />
      ) : role === 'admin' ? (
        <AdminDashboard />
      ) : (
        <UserDashboard />
      )}
    </AppShell>
  );
}
