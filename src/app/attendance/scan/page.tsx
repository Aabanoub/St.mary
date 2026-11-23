'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode,
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  UserCheck,
  Search,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatDateArabic, getAttendanceStatusConfig } from '@/lib/utils/formatters';

export default function ScanAttendancePage() {
  const { profile, hasPermission } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'present' | 'late'>('present');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Manual code check-in state
  const [manualCode, setManualCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scan result popup / modal
  const [lastScannedResult, setLastScannedResult] = useState<any>(null);
  const [resultMessage, setResultMessage] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  // Recent scans during this session
  const [sessionScans, setSessionScans] = useState<any[]>([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  // Beep sound function
  const playBeep = (isSuccess = true) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = isSuccess ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(isSuccess ? 880 : 300, audioCtx.currentTime); // A5 or low buzz
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + (isSuccess ? 0.2 : 0.4));

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + (isSuccess ? 0.2 : 0.4));
    } catch {
      // Audio not permitted or supported
    }
  };

  // 1. Fetch meetings on load
  useEffect(() => {
    const fetchMeetings = async () => {
      const { data } = await supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: false });

      if (data && data.length > 0) {
        setMeetings(data);
        // Default to first open meeting, or first meeting
        const openM = data.find((m) => m.status === 'open');
        setSelectedMeetingId(openM ? openM.id : data[0].id);
      }
    };

    fetchMeetings();
  }, []);

  // 2. Start / Stop Camera Scanner
  const startScanner = async () => {
    setCameraError(null);
    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = html5QrCode;

      const qrCodeSuccessCallback = async (decodedText: string) => {
        if (isProcessingRef.current) return;

        const now = Date.now();
        // Prevent continuous rapid scanning of the same code within 4 seconds
        if (
          lastScannedRef.current.code === decodedText.trim() &&
          now - lastScannedRef.current.time < 4000
        ) {
          return;
        }

        isProcessingRef.current = true;
        lastScannedRef.current = { code: decodedText.trim(), time: now };

        await processIdentifier(decodedText);

        // Debounce subsequent scans for 2 seconds
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 2000);
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        qrCodeSuccessCallback,
        undefined
      );

      setIsScanning(true);
    } catch (err: unknown) {
      console.error('Camera start error:', err);
      const msg = err instanceof Error ? err.message : 'تعذر فتح الكاميرا.';
      if (msg.includes('Permission')) {
        setCameraError('تم رفض إذن الوصول للكاميرا. يرجى تفعيل الكاميرا من إعدادات المتصفح.');
      } else {
        setCameraError('تعذر العثور على كاميرا مناسبة أو حدث خطأ أثناء تشغيلها.');
      }
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // 3. Process Attendance Check-In (either from QR or Manual input)
  const processIdentifier = async (identifier: string) => {
    if (!selectedMeetingId) {
      setResultMessage({ type: 'error', text: 'يرجى اختيار الاجتماع أولاً.' });
      playBeep(false);
      return;
    }

    setIsSubmitting(true);
    setResultMessage(null);

    try {
      // Call secure stored procedure: record_attendance_scan
      const { data, error } = await supabase.rpc('record_attendance_scan', {
        p_meeting_id: selectedMeetingId,
        p_identifier: identifier.trim(),
        p_status: scanStatus,
        p_notes: 'تسجيل عبر كاميرا QR',
      });

      if (error) {
        setResultMessage({ type: 'error', text: error.message });
        playBeep(false);
      } else if (data && data.already_recorded) {
        setResultMessage({
          type: 'warning',
          text: data.message || `⚠️ تنبيه: تم تسجيل حضور الخادم (${data.full_name}) مسبقاً في هذا الاجتماع!`,
        });
        playBeep(false);
      } else if (data && data.success) {
        setLastScannedResult(data);
        setResultMessage({
          type: 'success',
          text: `تم تسجيل حضور الخادم: ${data.full_name} (${scanStatus === 'present' ? 'حاضر' : 'متأخر'})`,
        });
        playBeep(true);

        // Add to session list (ensuring uniqueness by user_id)
        setSessionScans((prev) => {
          if (prev.some((s) => s.user_id === data.user_id)) {
            return prev;
          }
          return [
            {
              ...data,
              timestamp: new Date().toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
            },
            ...prev,
          ];
        });

        setManualCode('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ غير متوقع.';
      setResultMessage({ type: 'error', text: msg });
      playBeep(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    processIdentifier(manualCode.trim());
  };

  const selectedMeeting = meetings.find((m) => m.id === selectedMeetingId);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brown-100 dark:bg-brown-900/60 text-brown-800 dark:text-brown-200 text-xs font-semibold mb-1">
              <QrCode className="w-3.5 h-3.5 text-brown-600 dark:text-brown-400" />
              <span>تسجيل الحضور الإلكتروني</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-brown-950 dark:text-brown-50">
              ماسح باركود الحضور (QR)
            </h1>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="self-start sm:self-center flex items-center gap-2 px-3 py-1.5 rounded-lg border border-brown-200 dark:border-brown-800 text-xs text-brown-700 dark:text-brown-300 hover:bg-brown-50 cursor-pointer"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-600" />
                <span>صوت التأكيد مفعّل</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-brown-400" />
                <span>صوت التأكيد مكتوم</span>
              </>
            )}
          </button>
        </div>

        {/* Meeting & Status Selector Bar */}
        <Card className="p-4 bg-brown-50/60 dark:bg-brown-950/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Meeting selector */}
            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                الاجتماع المستهدف
              </label>
              <select
                value={selectedMeetingId}
                onChange={(e) => setSelectedMeetingId(e.target.value)}
                className="w-full py-2 px-3 bg-white dark:bg-[#231b15] border border-brown-300 dark:border-brown-700 rounded-xl text-xs sm:text-sm font-semibold text-brown-950 dark:text-brown-50 focus:outline-none focus:ring-2 focus:ring-brown-600"
              >
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} - {formatDateArabic(m.meeting_date)} ({m.status === 'open' ? 'مفتوح' : m.status === 'upcoming' ? 'قادم' : 'مغلق'})
                  </option>
                ))}
              </select>
            </div>

            {/* Attendance Status Selector */}
            <div>
              <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                حالة الحضور عند المسح
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScanStatus('present')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    scanStatus === 'present'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white dark:bg-[#231b15] text-brown-700 dark:text-brown-300 border-brown-200 dark:border-brown-700 hover:bg-emerald-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>حاضر (في الموعد)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScanStatus('late')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    scanStatus === 'late'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-white dark:bg-[#231b15] text-brown-700 dark:text-brown-300 border-brown-200 dark:border-brown-700 hover:bg-amber-50'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>متأخر</span>
                </button>
              </div>
            </div>
          </div>

          {selectedMeeting && selectedMeeting.status !== 'open' && (
            <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                تنبيه: هذا الاجتماع ليس في حالة &quot;مفتوح&quot;. المشرف العام فقط يمكنه تسجيل الحضور فيه.
              </span>
            </div>
          )}
        </Card>

        {/* Scan Result Feedback Banner */}
        {resultMessage && (
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
              resultMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-100 dark:border-emerald-800'
                : resultMessage.type === 'warning'
                ? 'bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-950/60 dark:text-amber-100 dark:border-amber-800'
                : 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-100 dark:border-rose-800'
            }`}
          >
            {resultMessage.type === 'success' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : resultMessage.type === 'warning' ? (
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <div className="text-sm font-bold leading-relaxed">{resultMessage.text}</div>
          </div>
        )}

        {/* Camera Scanner & Manual Input Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Camera Scanner Viewport */}
          <Card className="text-center overflow-hidden flex flex-col items-center">
            <CardHeader
              title="كاميرا المسح المباشر"
              subtitle="وجّه الكاميرا نحو باركود الخادم"
              icon={<Camera className="w-5 h-5" />}
            />

            <div className="relative w-full aspect-square max-w-[320px] bg-zinc-950 rounded-2xl overflow-hidden border-2 border-brown-300 dark:border-brown-700 flex items-center justify-center my-3 shadow-inner">
              <div id="qr-reader" className="w-full h-full" />
              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-zinc-900/90 text-white text-center">
                  <CameraOff className="w-12 h-12 text-zinc-500 mb-2" />
                  <p className="text-xs text-zinc-300 max-w-[200px]">
                    الكاميرا متوقفة حالياً. اضغط على الزر أدناه لبدء المسح.
                  </p>
                </div>
              )}
            </div>

            {cameraError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 max-w-xs mb-3">
                {cameraError}
              </p>
            )}

            <div className="w-full pt-3 border-t border-brown-100 dark:border-brown-900/60 flex items-center justify-center gap-3">
              {!isScanning ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={startScanner}
                  leftIcon={<Camera className="w-4 h-4" />}
                  className="font-bold w-full"
                >
                  تشغيل الكاميرا
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="md"
                  onClick={stopScanner}
                  leftIcon={<CameraOff className="w-4 h-4" />}
                  className="font-bold w-full text-rose-600 hover:text-rose-700"
                >
                  إيقاف الكاميرا
                </Button>
              )}
            </div>
          </Card>

          {/* Manual Code Check-In */}
          <Card className="flex flex-col justify-between">
            <div>
              <CardHeader
                title="إدخال يدوي بديل"
                subtitle="في حال عدم توفر كاميرا أو تعذر قراءة الباركود"
                icon={<Search className="w-5 h-5" />}
              />

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-brown-900 dark:text-brown-200 mb-1">
                    كود الحضور أو رقم الهاتف
                  </label>
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="مثال: SM-1002 أو 01012345678"
                    className="w-full py-2.5 px-4 bg-brown-50/50 dark:bg-brown-950/40 border border-brown-300 dark:border-brown-700 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brown-600"
                  />
                  <p className="text-[11px] text-brown-500 mt-1">
                    يمكنك إدخال الكود المطبوع على بطاقة المخدوم أو رقم هاتفه
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  className="w-full font-bold"
                  leftIcon={<UserCheck className="w-4 h-4" />}
                >
                  تسجيل الحضور يدوياً
                </Button>
              </form>
            </div>

            {/* Quick tips */}
            <div className="mt-6 p-3 rounded-xl bg-brown-50/70 dark:bg-brown-950/30 border border-brown-200/60 dark:border-brown-900/60">
              <span className="text-[11px] font-bold text-brown-900 dark:text-brown-200 block mb-0.5">
                تلميح للمشرف:
              </span>
              <p className="text-[11px] text-brown-600 dark:text-brown-400 leading-relaxed">
                يتم منع تسجيل الحضور المكرر لنفس الشخص في نفس الاجتماع تلقائياً.
              </p>
            </div>
          </Card>
        </div>

        {/* Live Attendance Scans in this session */}
        <Card>
          <CardHeader
            title="سجل الحضور المسجل خلال هذه الجلسة"
            subtitle={`${sessionScans.length} خادم تم تسجيل حضورهم`}
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          />

          {sessionScans.length === 0 ? (
            <p className="text-xs text-brown-500 text-center py-6">
              لم تسجل حضور أي خادم في هذه الجلسة بعد. ابدأ بالمسح أعلاه!
            </p>
          ) : (
            <div className="divide-y divide-brown-100 dark:divide-brown-900/60 max-h-72 overflow-y-auto">
              {sessionScans.map((scan, idx) => {
                const cfg = getAttendanceStatusConfig(scan.status);
                return (
                  <div key={scan.user_id || idx} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-brown-950 dark:text-brown-50">
                          {scan.full_name}
                        </h4>
                        <span className="text-[10px] text-brown-500 font-mono">
                          {scan.attendance_code}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-brown-400 font-mono">
                        {scan.timestamp}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.badgeBg}`} />
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
