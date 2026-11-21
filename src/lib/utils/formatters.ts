export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';

  // Convert Arabic/Eastern digits to standard digits
  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let cleaned = rawPhone.toString().trim();
  for (let i = 0; i < 10; i++) {
    cleaned = cleaned.replace(new RegExp(easternDigits[i], 'g'), i.toString());
  }

  // Remove non-digit characters except +
  cleaned = cleaned.replace(/[^\d+]/g, '');

  // Handle +20 or 20 prefix for Egypt
  if (cleaned.startsWith('+20')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('20') && cleaned.length === 12) {
    cleaned = '0' + cleaned.substring(2);
  }

  return cleaned;
}

export function isValidEgyptianPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  // Egyptian mobile numbers: 010, 011, 012, 015 followed by 8 digits (total 11 digits)
  return /^01[0125][0-9]{8}$/.test(normalized);
}

export function formatDateArabic(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '-';

    return new Intl.DateTimeFormat('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

export function formatShortDateArabic(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '-';

    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

export function formatTimeArabic(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '-';

    return new Intl.DateTimeFormat('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return '';
  }
}

export function getAttendanceStatusConfig(status: string) {
  switch (status) {
    case 'present':
      return {
        label: 'حاضر',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        badgeBg: 'bg-emerald-500',
        icon: 'check',
      };
    case 'late':
      return {
        label: 'متأخر',
        bg: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        badgeBg: 'bg-amber-500',
        icon: 'clock',
      };
    case 'absent':
    default:
      return {
        label: 'غائب',
        bg: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
        badgeBg: 'bg-rose-500',
        icon: 'x',
      };
  }
}

export function getRoleBadgeConfig(role: string) {
  switch (role) {
    case 'super_admin':
      return {
        label: 'مشرف عام',
        bg: 'bg-brown-100 text-brown-900 border-brown-300 dark:bg-brown-900 dark:text-brown-100 dark:border-brown-700',
      };
    case 'admin':
      return {
        label: 'مشرف',
        bg: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/60 dark:text-amber-100 dark:border-amber-700',
      };
    case 'user':
    default:
      return {
        label: 'مخدوم / خادم',
        bg: 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700',
      };
  }
}
