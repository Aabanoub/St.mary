'use client';

import React from 'react';
import Image from 'next/image';
import { WifiOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#fbf8f5] dark:bg-[#18120e] text-center">
      <div className="w-20 h-20 rounded-3xl bg-brown-700 flex items-center justify-center p-3 shadow-warm-lg mb-6 ring-4 ring-brown-100 dark:ring-brown-900/60">
        <Image
          src="/icons/icon.svg"
          alt="كنيسة العذراء مريم"
          width={64}
          height={64}
          className="w-full h-full object-contain"
        />
      </div>

      <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto mb-3">
        <WifiOff className="w-6 h-6" />
      </div>

      <h1 className="text-xl sm:text-2xl font-black text-brown-950 dark:text-brown-50 mb-2">
        لا يوجد اتصال بالإنترنت
      </h1>

      <p className="text-xs sm:text-sm text-brown-600 dark:text-brown-400 max-w-sm mx-auto mb-6 leading-relaxed">
        تطبيق كنيسة السيدة العذراء مريم يعمل كـ PWA. عند عودة اتصال الإنترنت سيتم مزامنة بياناتك وحضورك تلقائياً.
      </p>

      <Button
        variant="primary"
        size="md"
        onClick={handleRetry}
        leftIcon={<RotateCcw className="w-4 h-4" />}
        className="font-bold shadow-warm"
      >
        إعادة المحاولة الآن
      </Button>
    </div>
  );
}
