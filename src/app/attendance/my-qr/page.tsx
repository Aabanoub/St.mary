'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Shield, Download, Sparkles, User, Info } from 'lucide-react';
import Link from 'next/link';

export default function MyQrPage() {
  const { profile } = useAuth();

  const handleDownloadQr = () => {
    const svg = document.getElementById('user-qr-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new window.Image();

    img.onload = () => {
      canvas.width = img.width + 80;
      canvas.height = img.height + 140;

      if (ctx) {
        // Draw background card
        ctx.fillStyle = '#ffffff';
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(0, 0, canvas.width, canvas.height, 20);
        } else {
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.fill();

        // Draw header text
        ctx.fillStyle = '#68432b';
        ctx.font = 'bold 20px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('كنيسة السيدة العذراء مريم', canvas.width / 2, 40);

        ctx.fillStyle = '#9f734d';
        ctx.font = '14px Cairo, sans-serif';
        ctx.fillText('إعداد خدام', canvas.width / 2, 65);

        // Draw QR
        ctx.drawImage(img, 40, 85);

        // Draw User info below
        ctx.fillStyle = '#22140c';
        ctx.font = 'bold 18px Cairo, sans-serif';
        ctx.fillText(profile?.full_name || '', canvas.width / 2, canvas.height - 45);

        ctx.fillStyle = '#825739';
        ctx.font = '14px monospace';
        ctx.fillText(profile?.attendance_code || '', canvas.width / 2, canvas.height - 20);

        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `QR-${profile?.attendance_code || 'stmary'}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <AppShell>
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brown-100 dark:bg-brown-900/60 text-brown-800 dark:text-brown-200 text-xs font-semibold mb-2">
            <QrCode className="w-3.5 h-3.5 text-brown-600 dark:text-brown-400" />
            <span>بطاقة الحضور الشخصية</span>
          </div>
          <h1 className="text-2xl font-black text-brown-950 dark:text-brown-50">
            كود الحضور الذكي (QR)
          </h1>
          <p className="text-xs sm:text-sm text-brown-600 dark:text-brown-400 mt-1">
            أبرز هذا الباركود لمشرف الحضور عند وصولك اجتماع السبت الأسبوعي
          </p>
        </div>

        {/* QR Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-[#231b15] border-2 border-brown-200 dark:border-brown-800 p-6 sm:p-8 shadow-warm-xl text-center">
          {/* Top Decorative Header */}
          <div className="pb-4 mb-6 border-b border-brown-100 dark:border-brown-900/60 flex items-center justify-between">
            <div className="text-right">
              <span className="text-[11px] font-bold text-brown-600 dark:text-brown-400 block">
                كنيسة السيدة العذراء مريم
              </span>
              <span className="text-xs font-black text-brown-900 dark:text-brown-100">
                إعداد خدام
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-brown-100 dark:bg-brown-900/60 flex items-center justify-center text-brown-700 dark:text-brown-300">
              <Shield className="w-5 h-5" />
            </div>
          </div>

          {/* User Name & Code */}
          <div className="mb-6">
            <div className="w-16 h-16 rounded-full bg-brown-100 dark:bg-brown-900/80 border-2 border-brown-300 dark:border-brown-700 flex items-center justify-center text-brown-800 dark:text-brown-200 font-black text-xl mx-auto mb-3 shadow-sm">
              {profile?.full_name ? profile.full_name.charAt(0) : <User className="w-8 h-8" />}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-brown-950 dark:text-brown-50">
              {profile?.full_name}
            </h2>
            <div className="inline-block mt-2 px-3.5 py-1 rounded-full bg-brown-50 dark:bg-brown-950/60 border border-brown-300 dark:border-brown-700">
              <span className="text-xs font-bold text-brown-800 dark:text-brown-200 font-mono tracking-widest">
                {profile?.attendance_code}
              </span>
            </div>
          </div>

          {/* High-Contrast QR Code */}
          <div className="inline-block p-4 sm:p-5 bg-white rounded-2xl border-4 border-brown-700 dark:border-brown-600 shadow-warm-lg my-2">
            <QRCodeSVG
              id="user-qr-svg"
              value={profile?.qr_token || 'stmary'}
              size={220}
              level="H"
              includeMargin={false}
              fgColor="#22140c"
              bgColor="#ffffff"
            />
          </div>

          {/* Security Notice */}
          <p className="text-[11px] text-brown-500 dark:text-brown-400 mt-4 max-w-xs mx-auto">
            هذا الرمز مشفر وآمن ولا يحتوي على رقم هاتفك أو أي بيانات حساسة.
          </p>

          {/* Actions */}
          <div className="mt-6 pt-5 border-t border-brown-100 dark:border-brown-900/60 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={handleDownloadQr}
              leftIcon={<Download className="w-4 h-4" />}
              className="w-full sm:w-auto font-bold"
            >
              حفظ بطاقة QR كصورة
            </Button>
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button variant="outline" size="md" className="w-full sm:w-auto">
                العودة للرئيسية
              </Button>
            </Link>
          </div>
        </div>

        {/* Instructions Box */}
        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <span className="font-bold block mb-1">تعليمات تسجيل الحضور:</span>
            ١. افتح هذه الصفحة على هاتفك المحمول أو اطبع الصورة واحفظها معك.
            <br />
            ٢. اجعل إضاءة شاشة هاتفك واضحة وقدم الباركود لكاميرا المشرف.
            <br />
            ٣. سيظهر لك إشعار فوري على لوحتك بتأكيد تسجيل حضورك في موعد الاجتماع.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
