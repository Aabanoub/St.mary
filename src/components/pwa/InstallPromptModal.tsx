'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  X,
  CheckCircle2,
  Sparkles,
  QrCode,
  Bell,
  WifiOff,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function InstallPromptModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalledJustNow, setIsInstalledJustNow] = useState(false);

  useEffect(() => {
    // 1. Check if already installed / running in standalone mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');

      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    if (checkStandalone()) {
      return; // Already installed, do nothing
    }

    // 2. Detect iOS devices (Safari on iOS requires manual Add to Home Screen)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent) && !/crios|fxios|opios/.test(userAgent);
    setIsIOS(isAppleDevice);

    // 3. Listen for Chrome / Android / Edge install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Check if user dismissed in this session
      const dismissedThisSession = sessionStorage.getItem('pwa_prompt_dismissed');
      if (!dismissedThisSession) {
        // Show after a gentle 1.2s delay for great UX
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. For iOS or browsers where beforeinstallprompt doesn't fire immediately,
    // show the prompt if not in standalone and not dismissed
    const dismissedThisSession = sessionStorage.getItem('pwa_prompt_dismissed');
    if (!dismissedThisSession) {
      const fallbackTimer = setTimeout(() => {
        if (!checkStandalone()) {
          setIsOpen(true);
        }
      }, 1500);

      return () => {
        clearTimeout(fallbackTimer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    // 5. Listen for successful install
    const handleAppInstalled = () => {
      setIsInstalledJustNow(true);
      setDeferredPrompt(null);
      setTimeout(() => {
        setIsOpen(false);
      }, 3000);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // 6. Support opening modal manually from anywhere in the app
    const handleManualOpen = () => {
      setIsOpen(true);
    };
    window.addEventListener('open-pwa-install', handleManualOpen);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('open-pwa-install', handleManualOpen);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Chrome / Edge / Android native prompt
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalledJustNow(true);
          setTimeout(() => {
            setIsOpen(false);
          }, 2500);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('PWA install error:', err);
      }
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    setIsOpen(false);
  };

  // If running in standalone app mode, render nothing
  if (isStandalone) {
    return null;
  }

  // Floating small badge if dismissed but not standalone (allows user to install anytime)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 lg:bottom-6 left-4 z-40 flex items-center gap-2 px-3 py-2 bg-brown-800 hover:bg-brown-900 text-white rounded-full shadow-warm-lg border border-amber-500/30 text-xs font-semibold transition-all hover:scale-105 active:scale-95 animate-fade-in"
        title="تثبيت التطبيق على جهازك"
      >
        <Smartphone className="w-4 h-4 text-amber-300" />
        <span>تثبيت التطبيق</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#1f1712] rounded-3xl p-5 sm:p-6 shadow-2xl border border-brown-200/80 dark:border-brown-800/80 overflow-hidden transform transition-all animate-scale-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Decorative background accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-400/10 dark:bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-brown-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 left-4 p-1.5 text-brown-400 hover:text-brown-700 dark:hover:text-brown-200 rounded-full hover:bg-brown-100 dark:hover:bg-brown-900/50 transition-colors cursor-pointer"
          aria-label="إغلاق التنبيه"
        >
          <X className="w-5 h-5" />
        </button>

        {isInstalledJustNow ? (
          // Success State
          <div className="py-6 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-xl font-black text-brown-950 dark:text-brown-50">
              تم تثبيت التطبيق بنجاح!
            </h3>
            <p className="text-sm text-brown-600 dark:text-brown-300">
              يمكنك الآن فتح التطبيق مباشرة من الشاشة الرئيسية لجهازك في أي وقت.
            </p>
          </div>
        ) : (
          // Main Install Prompt
          <div className="space-y-4">
            {/* Header: App Emblem & Title */}
            <div className="flex items-center gap-3.5 pt-1">
              <div className="relative w-14 h-14 rounded-2xl bg-brown-800 p-2 shadow-warm-md flex items-center justify-center ring-2 ring-amber-400/40 shrink-0">
                <Image
                  src="/icons/icon.svg"
                  alt="شعار كنيسة السيدة العذراء مريم"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/40">
                    تطبيق PWA مجاني
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-brown-950 dark:text-brown-50 truncate mt-0.5">
                  كنيسة السيدة العذراء مريم
                </h3>
                <p className="text-xs font-semibold text-brown-600 dark:text-brown-400">
                  إعداد خدام — تطبيق الهاتف المحمول
                </p>
              </div>
            </div>

            {/* Value Proposition / Benefits */}
            <div className="bg-brown-50/70 dark:bg-brown-950/40 rounded-2xl p-3.5 border border-brown-200/60 dark:border-brown-900/60 space-y-2 text-xs">
              <p className="font-bold text-brown-900 dark:text-brown-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>قم بتثبيت التطبيق على جهازك للحصول على:</span>
              </p>
              <ul className="space-y-1.5 text-brown-700 dark:text-brown-300 pr-1">
                <li className="flex items-center gap-2">
                  <QrCode className="w-3.5 h-3.5 text-brown-600 dark:text-brown-400 shrink-0" />
                  <span>فتح فوري لكارت الحضور الذكي QR بدون كتابة الرابط.</span>
                </li>
                <li className="flex items-center gap-2">
                  <WifiOff className="w-3.5 h-3.5 text-brown-600 dark:text-brown-400 shrink-0" />
                  <span>الوصول للكود ومحتوى القراءات حتى بدون اتصال بالإنترنت.</span>
                </li>
                <li className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-brown-600 dark:text-brown-400 shrink-0" />
                  <span>استقبال إشعارات وتنبيهات اجتماعات السبت فوراً.</span>
                </li>
              </ul>
            </div>

            {/* Platform Instructions or One-Click Button */}
            {isIOS ? (
              // iOS Safari specific instructions
              <div className="bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl p-3.5 border border-amber-200/70 dark:border-amber-900/70 space-y-2 text-xs">
                <p className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>خطوات التثبيت على أجهزة iPhone / iPad:</span>
                </p>
                <div className="space-y-2 pr-1 text-brown-800 dark:text-brown-300">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold flex items-center justify-center text-[10px] shrink-0">
                      1
                    </span>
                    <span>
                      اضغط على زر المشاركة{' '}
                      <Share className="w-3.5 h-3.5 inline mx-1 text-blue-500" />{' '}
                      <strong>(Share)</strong> في شريط Safari بالأسفل.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold flex items-center justify-center text-[10px] shrink-0">
                      2
                    </span>
                    <span>
                      مرر للأسفل واختر{' '}
                      <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-emerald-600" />{' '}
                      <strong>«إضافة إلى الشاشة الرئيسية»</strong>.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold flex items-center justify-center text-[10px] shrink-0">
                      3
                    </span>
                    <span>
                      اضغط على <strong>«إضافة» (Add)</strong> في أعلى اليمين.
                    </span>
                  </div>
                </div>
              </div>
            ) : deferredPrompt ? (
              // 1-Click Install Button for Android / Chrome / Edge / Windows / Mac
              <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-brown-800 hover:bg-brown-900 active:scale-[0.98] transition-all shadow-warm-md hover:shadow-warm-lg cursor-pointer border border-amber-400/30"
              >
                <Download className="w-4 h-4 text-amber-300" />
                <span>تثبيت التطبيق الآن على الجهاز</span>
              </button>
            ) : (
              // Fallback for browsers when beforeinstallprompt has not fired
              <div className="space-y-2">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs text-brown-800 dark:text-brown-300">
                  <p className="font-semibold">
                    للتثبيت: اضغط على قائمة المتصفح (<strong>⋮</strong> أو <strong>···</strong>) ثم اختر{' '}
                    <strong>«تثبيت التطبيق»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.
                  </p>
                </div>
                <button
                  onClick={handleDismiss}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-brown-800 hover:bg-brown-900 transition-colors"
                >
                  فهمت ذلك، شكراً
                </button>
              </div>
            )}

            {/* Actions: Dismiss button */}
            <div className="pt-1 flex items-center justify-between text-xs">
              <button
                onClick={handleDismiss}
                className="text-brown-500 hover:text-brown-800 dark:hover:text-brown-300 font-medium transition-colors cursor-pointer"
              >
                المتابعة من المتصفح (لاحقاً)
              </button>
              <span className="text-[11px] text-brown-400 dark:text-brown-500">
                تطبيق خفيف وسريع • 0 ميجابايت
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
