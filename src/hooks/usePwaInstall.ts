'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePwaInstall() {
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Comprehensive standalone detection
    const checkStandalone = (): boolean => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');

      if (isStandaloneMode) {
        try {
          localStorage.setItem('pwa_installed_on_device', 'true');
        } catch {}
        return true;
      }

      // 2. Check if previously recorded as installed on this device/browser
      try {
        if (localStorage.getItem('pwa_installed_on_device') === 'true') {
          return true;
        }
      } catch {}

      return false;
    };

    const standaloneState = checkStandalone();
    setIsInstalled(standaloneState);

    // If already detected as installed, we're done
    if (standaloneState) {
      return;
    }

    // 3. Check Chromium getInstalledRelatedApps API
    if ('getInstalledRelatedApps' in navigator) {
      (navigator as unknown as { getInstalledRelatedApps: () => Promise<unknown[]> })
        .getInstalledRelatedApps()
        .then((relatedApps) => {
          if (relatedApps && relatedApps.length > 0) {
            try {
              localStorage.setItem('pwa_installed_on_device', 'true');
            } catch {}
            setIsInstalled(true);
          }
        })
        .catch(() => {});
    }

    // 4. Detect iOS devices
    const ua = window.navigator.userAgent.toLowerCase();
    const isApple = /iphone|ipad|ipod/.test(ua) && !/crios|fxios|opios/.test(ua);
    setIsIOS(isApple);

    // 5. Listen to media query changes (if user launches or switches to standalone)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        try {
          localStorage.setItem('pwa_installed_on_device', 'true');
        } catch {}
        setIsInstalled(true);
      }
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    // 6. Listen for beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 7. Listen for appinstalled
    const handleAppInstalled = () => {
      try {
        localStorage.setItem('pwa_installed_on_device', 'true');
      } catch {}
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return {
    isInstalled,
    deferredPrompt,
    setDeferredPrompt,
    isIOS,
  };
}
