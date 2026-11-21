import * as XLSX from 'xlsx';
import { normalizePhone, isValidEgyptianPhone } from './formatters';

export interface ParsedUserRow {
  rowIndex: number;
  rawName: string;
  rawPhone: string;
  normalizedPhone: string;
  isValid: boolean;
  error?: string;
  status: 'valid' | 'invalid_phone' | 'missing_name' | 'duplicate_in_file' | 'already_exists';
}

export function parseUsersExcel(data: ArrayBuffer): {
  rows: ParsedUserRow[];
  summary: {
    total: number;
    valid: number;
    invalidPhone: number;
    missingName: number;
    duplicatesInFile: number;
  };
} {
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to JSON array of objects or rows
  const rawData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  const rows: ParsedUserRow[] = [];
  const seenPhones = new Set<string>();

  let nameColIdx = 0;
  let phoneColIdx = 1;

  // Detect header row if present
  let startRow = 0;
  if (rawData.length > 0 && Array.isArray(rawData[0])) {
    const firstRow = rawData[0].map((cell) => String(cell || '').trim());
    const nameIdx = firstRow.findIndex(
      (h) => h.includes('الاسم') || h.toLowerCase().includes('name')
    );
    const phoneIdx = firstRow.findIndex(
      (h) => h.includes('الهاتف') || h.includes('موبايل') || h.toLowerCase().includes('phone')
    );

    if (nameIdx !== -1) nameColIdx = nameIdx;
    if (phoneIdx !== -1) phoneColIdx = phoneIdx;

    if (nameIdx !== -1 || phoneIdx !== -1) {
      startRow = 1;
    }
  }

  let invalidPhoneCount = 0;
  let missingNameCount = 0;
  let duplicatesInFileCount = 0;
  let validCount = 0;

  for (let i = startRow; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;

    const rawName = String(row[nameColIdx] || '').trim();
    const rawPhone = String(row[phoneColIdx] || '').trim();

    // Skip totally empty rows
    if (!rawName && !rawPhone) continue;

    const normalizedPhone = normalizePhone(rawPhone);

    let status: ParsedUserRow['status'] = 'valid';
    let error: string | undefined;

    if (!rawName) {
      status = 'missing_name';
      error = 'الاسم مطلوب';
      missingNameCount++;
    } else if (!normalizedPhone || !isValidEgyptianPhone(normalizedPhone)) {
      status = 'invalid_phone';
      error = 'رقم هاتف غير صحيح (يجب أن يكون رقم مصري من 11 رقماً يبدأ بـ 010 أو 011 أو 012 أو 015)';
      invalidPhoneCount++;
    } else if (seenPhones.has(normalizedPhone)) {
      status = 'duplicate_in_file';
      error = 'رقم الهاتف مكرر داخل هذا الملف';
      duplicatesInFileCount++;
    } else {
      seenPhones.add(normalizedPhone);
      validCount++;
    }

    rows.push({
      rowIndex: i + 1,
      rawName,
      rawPhone,
      normalizedPhone,
      isValid: status === 'valid',
      error,
      status,
    });
  }

  return {
    rows,
    summary: {
      total: rows.length,
      valid: validCount,
      invalidPhone: invalidPhoneCount,
      missingName: missingNameCount,
      duplicatesInFile: duplicatesInFileCount,
    },
  };
}

export function generateTemplateExcel(): Blob {
  const sampleData = [
    ['الاسم', 'رقم الهاتف'],
    ['أبانوب بيشوي', '01012345678'],
    ['مينا سامي', '01123456789'],
    ['مريم يوسف', '01234567890'],
    ['جورج عادل', '01545678901'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
  // Auto-fit column widths
  worksheet['!cols'] = [{ wch: 25 }, { wch: 18 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'قالب استيراد المستخدمين');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function generateImportResultsExcel(results: {
  full_name: string;
  phone: string;
  status: string;
  attendance_code?: string;
  error?: string;
}[]): Blob {
  const headers = ['الاسم', 'رقم الهاتف', 'الحالة', 'كود الحضور', 'التفاصيل / سبب الخطأ'];
  const rows = results.map((r) => [
    r.full_name,
    r.phone,
    r.status === 'success' ? 'تم الإنشاء بنجاح' : 'فشل / تم التخطي',
    r.attendance_code || '-',
    r.error || 'تم إنشاء الحساب وكود الحضور بنجاح',
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  worksheet['!cols'] = [{ wch: 25 }, { wch: 16 }, { wch: 18 }, { wch: 15 }, { wch: 35 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'نتائج الاستيراد');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function exportAttendanceMatrixExcel(
  meetings: { id: string; title: string; meeting_date: string }[],
  attendees: {
    user_id: string;
    full_name: string;
    phone: string;
    attendance_code: string;
    records: Record<string, 'present' | 'late' | 'absent'>;
    attendedCount: number;
    missedCount: number;
    percentage: number;
  }[]
): Blob {
  const header = [
    'الاسم',
    'رقم الهاتف',
    'كود الحضور',
    ...meetings.map((m) => `${m.meeting_date} (${m.title})`),
    'إجمالي الحضور',
    'إجمالي الغياب',
    'نسبة الحضور %',
  ];

  const rows = attendees.map((a) => {
    const meetingStatuses = meetings.map((m) => {
      const st = a.records[m.id];
      if (st === 'present') return 'حاضر';
      if (st === 'late') return 'متأخر';
      if (st === 'absent') return 'غائب';
      return '-';
    });

    return [
      a.full_name,
      a.phone,
      a.attendance_code,
      ...meetingStatuses,
      a.attendedCount,
      a.missedCount,
      `${a.percentage}%`,
    ];
  });

  const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'تقرير الحضور');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
