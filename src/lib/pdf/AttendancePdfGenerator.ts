import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatShortDateArabic } from '../utils/formatters';

export interface AttendanceReportData {
  churchName: string;
  subtitle: string;
  dateRange: string;
  totalMeetings: number;
  meetings: { id: string; title: string; meeting_date: string }[];
  attendees: {
    user_id: string;
    full_name: string;
    phone: string;
    attendance_code: string;
    records: Record<string, 'present' | 'late' | 'absent'>;
    attendedCount: number;
    missedCount: number;
    percentage: number;
  }[];
}

export function generateAttendancePdf(data: AttendanceReportData) {
  // Landscape A4 for wide matrix tables
  const doc = new jsPDF({
    orientation: data.meetings.length > 4 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Title
  doc.setFontSize(16);
  doc.setTextColor(104, 67, 43); // #68432b deep brown
  doc.text(data.churchName, pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(159, 115, 77); // #9f734d
  doc.text(data.subtitle, pageWidth / 2, 22, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`الفترة: ${data.dateRange} | إجمالي الاجتماعات: ${data.totalMeetings}`, pageWidth / 2, 28, {
    align: 'center',
  });

  // Table Headers
  const tableHeaders = [
    'نسبة الحضور',
    'غياب',
    'حضور',
    ...data.meetings.map((m) => formatShortDateArabic(m.meeting_date)).reverse(),
    'كود الحضور',
    'رقم الهاتف',
    'الاسم',
  ];

  const tableRows = data.attendees.map((attendee) => {
    const meetingStatuses = data.meetings.map((m) => {
      const st = attendee.records[m.id];
      if (st === 'present') return '✓';
      if (st === 'late') return 'م';
      if (st === 'absent') return '✗';
      return '-';
    }).reverse();

    return [
      `%${attendee.percentage}`,
      String(attendee.missedCount),
      String(attendee.attendedCount),
      ...meetingStatuses,
      attendee.attendance_code,
      attendee.phone,
      attendee.full_name,
    ];
  });

  autoTable(doc, {
    startY: 33,
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      halign: 'center',
      valign: 'middle',
      cellPadding: 2,
      textColor: [50, 40, 30],
    },
    headStyles: {
      fillColor: [104, 67, 43], // #68432b
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [251, 248, 245], // #fbf8f5 warm beige
    },
    margin: { top: 33, right: 10, bottom: 15, left: 10 },
    didDrawPage: (hookData) => {
      // Footer with page numbering
      const str = `صفحة ${hookData.pageNumber}`;
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, {
        align: 'center',
      });
    },
  });

  return doc;
}
