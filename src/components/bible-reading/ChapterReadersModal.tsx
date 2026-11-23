'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Users,
  CheckCircle2,
  Clock,
  Search,
  BookOpen,
  Calendar,
  X,
  Phone,
} from 'lucide-react';
import { formatDateArabic } from '@/lib/utils/formatters';

interface ChapterInfo {
  id: string;
  book_name: string;
  chapter_number: number;
  assigned_date: string;
}

interface ReaderStatus {
  id: string;
  full_name: string;
  phone: string;
  attendance_code: string;
  role: string;
  is_completed: boolean;
  completed_at?: string | null;
}

interface ChapterReadersModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: ChapterInfo | null;
}

export function ChapterReadersModal({
  isOpen,
  onClose,
  chapter,
}: ChapterReadersModalProps) {
  const [readers, setReaders] = useState<ReaderStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');

  useEffect(() => {
    if (!isOpen || !chapter) return;

    const loadReadersData = async () => {
      try {
        setIsLoading(true);

        // 1. Fetch active profiles (users & admins)
        const { data: profiles, error: profError } = await supabase
          .from('profiles')
          .select('id, full_name, phone, attendance_code, role')
          .eq('is_active', true)
          .in('role', ['user', 'admin'])
          .order('full_name', { ascending: true });

        if (profError) throw profError;

        // 2. Fetch reading progress for this chapter
        const { data: progressList, error: progError } = await supabase
          .from('user_reading_progress')
          .select('user_id, completed, completed_at')
          .eq('chapter_id', chapter.id)
          .eq('completed', true);

        if (progError) throw progError;

        const progressMap = new Map<string, { completed: boolean; completed_at: string | null }>();
        progressList?.forEach((pr) => {
          progressMap.set(pr.user_id, {
            completed: pr.completed,
            completed_at: pr.completed_at,
          });
        });

        const merged: ReaderStatus[] = (profiles || []).map((prof) => {
          const prog = progressMap.get(prof.id);
          return {
            id: prof.id,
            full_name: prof.full_name,
            phone: prof.phone,
            attendance_code: prof.attendance_code,
            role: prof.role,
            is_completed: !!prog?.completed,
            completed_at: prog?.completed_at || null,
          };
        });

        // Sort: completed first, then alphabetical
        merged.sort((a, b) => {
          if (a.is_completed && !b.is_completed) return -1;
          if (!a.is_completed && b.is_completed) return 1;
          return a.full_name.localeCompare(b.full_name, 'ar');
        });

        setReaders(merged);
      } catch (err) {
        console.error('Error loading chapter readers:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadReadersData();
    setSearchQuery('');
    setStatusFilter('all');
  }, [isOpen, chapter]);

  const totalCount = readers.length;
  const completedCount = readers.filter((r) => r.is_completed).length;
  const pendingCount = totalCount - completedCount;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredReaders = useMemo(() => {
    return readers.filter((r) => {
      // Status filter
      if (statusFilter === 'completed' && !r.is_completed) return false;
      if (statusFilter === 'pending' && r.is_completed) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = r.full_name?.toLowerCase().includes(q);
        const phoneMatch = r.phone?.includes(q);
        const codeMatch = r.attendance_code?.toLowerCase().includes(q);
        return nameMatch || phoneMatch || codeMatch;
      }

      return true;
    });
  }, [readers, statusFilter, searchQuery]);

  if (!chapter) return null;

  const formatCompletionTime = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('ar-EG', {
        timeZone: 'Africa/Cairo',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      }).format(date);
    } catch {
      return '';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`كشف قراءة: ${chapter.book_name} - الإصحاح ${chapter.chapter_number}`}
      description={`تاريخ الإصحاح: ${formatDateArabic(chapter.assigned_date)}`}
      maxWidth="lg"
    >
      <div className="space-y-4 pt-1">
        {/* Progress Overview Summary Box */}
        <div className="p-4 rounded-2xl bg-brown-50/60 dark:bg-brown-950/40 border border-brown-200/80 dark:border-brown-800/80">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-brown-800 dark:text-brown-200">
              نسبة إنجاز القراءة لهذا الإصحاح
            </span>
            <span className="text-xs font-black text-amber-700 dark:text-amber-400">
              %{completionPct} ({completedCount} من {totalCount} خادم ومخدوم)
            </span>
          </div>

          <div className="w-full bg-brown-200/70 dark:bg-brown-800/80 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${completionPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-3 text-[11px] font-bold">
            <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              أتموا القراءة: {completedCount}
            </span>
            <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              بانتظار القراءة: {pendingCount}
            </span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-brown-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث بالاسم أو كود الحضور أو الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2 pr-9 pl-4 bg-white dark:bg-[#1a120c] border border-brown-300 dark:border-brown-700 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brown-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-400 hover:text-brown-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-brown-700 text-white'
                  : 'text-brown-700 dark:text-brown-300 hover:bg-brown-100 dark:hover:bg-brown-900/40'
              }`}
            >
              الكل ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              أتموا القراءة ({completedCount})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-amber-600 text-white'
                  : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
            >
              لم يقرأوا بعد ({pendingCount})
            </button>
          </div>
        </div>

        {/* Readers List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-brown-100 dark:divide-brown-900/60 pr-1">
          {isLoading ? (
            <div className="space-y-2.5 py-2">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : filteredReaders.length === 0 ? (
            <div className="py-8 text-center text-xs text-brown-500 font-semibold">
              لا توجد بيانات مطابقة للبحث المحدد.
            </div>
          ) : (
            filteredReaders.map((reader) => (
              <div
                key={reader.id}
                className="py-2.5 flex items-center justify-between gap-3 hover:bg-brown-50/40 dark:hover:bg-brown-950/20 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      reader.is_completed
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-brown-100 text-brown-800 dark:bg-brown-900 dark:text-brown-300'
                    }`}
                  >
                    {reader.full_name?.charAt(0) || 'م'}
                  </div>

                  <div className="min-w-0">
                    <h5 className="text-xs sm:text-sm font-bold text-brown-950 dark:text-brown-50 truncate">
                      {reader.full_name}
                    </h5>
                    <div className="flex items-center gap-2 text-[10px] text-brown-500">
                      <span className="font-mono">{reader.attendance_code}</span>
                      <span>•</span>
                      <span>{reader.role === 'admin' ? 'مشرف / خادم' : 'مخدوم'}</span>
                      {reader.phone && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{reader.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-left">
                  {reader.is_completed ? (
                    <div>
                      <Badge variant="success" size="sm" className="gap-1 font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        تمت القراءة
                      </Badge>
                      {reader.completed_at && (
                        <span className="block text-[9px] text-brown-400 mt-0.5 text-left font-mono">
                          {formatCompletionTime(reader.completed_at)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <Badge variant="default" size="sm" className="gap-1 text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900">
                      <Clock className="w-3 h-3" />
                      لم يقرأ بعد
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
