'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSiteLock } from '@/context/SiteLockContext';
import { SiteLockScreen } from '@/components/layout/SiteLockScreen';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const { isAccessBlocked, isLoadingLock } = useSiteLock();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isLoadingLock) {
      if (user) {
        router.replace('/dashboard');
      } else if (!isAccessBlocked) {
        router.replace('/login');
      }
    }
  }, [user, isLoading, isLoadingLock, isAccessBlocked, router]);

  if (isAccessBlocked && !user) {
    return <SiteLockScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fbf8f5] dark:bg-[#18120e]">
      <Loader2 className="w-8 h-8 text-brown-600 animate-spin" />
    </div>
  );
}
