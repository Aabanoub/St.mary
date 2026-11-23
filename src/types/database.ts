export type UserRole = 'user' | 'admin' | 'super_admin';

export type MeetingStatus = 'upcoming' | 'open' | 'closed';

export type AttendanceStatus = 'present' | 'late' | 'absent';

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export type AdminPermission =
  | 'scan_attendance'
  | 'view_attendance'
  | 'correct_attendance'
  | 'create_reading_plans'
  | 'edit_reading_plans'
  | 'create_exams'
  | 'edit_exams'
  | 'view_exam_results'
  | 'send_notifications';

export interface Profile {
  id: string;
  phone: string;
  full_name: string;
  role: UserRole;
  attendance_code: string;
  qr_token: string;
  is_active: boolean;
  must_change_password: boolean;
  avatar_url?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  title: string;
  meeting_date: string; // YYYY-MM-DD
  status: MeetingStatus;
  notes?: string | null;
  late_cutoff_time?: string | null; // HH:mm:ss
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  meeting_id: string;
  user_id: string;
  status: AttendanceStatus;
  scanned_at: string;
  scanned_by?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // joined fields
  user?: Profile;
  meeting?: Meeting;
}

export interface ReadingPlan {
  id: string;
  title: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  chapters?: ReadingPlanChapter[];
}

export interface ReadingPlanChapter {
  id: string;
  plan_id: string;
  book_name: string;
  chapter_number: number;
  assigned_date: string;
  created_at: string;
  is_completed?: boolean;
}

export interface UserReadingProgress {
  id: string;
  plan_id: string;
  chapter_id: string;
  user_id: string;
  completed: boolean;
  completed_at: string;
}

export interface Exam {
  id: string;
  title: string;
  description?: string | null;
  book_name: string;
  chapter_number: number;
  duration_minutes: number;
  start_time?: string | null;
  end_time?: string | null;
  is_published: boolean;
  pass_score: number;
  requires_manual_grading?: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  questions?: ExamQuestion[];
  submission?: ExamSubmission | null;
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  question_text: string;
  question_type: QuestionType;
  score: number;
  order_index: number;
  created_at: string;
  options?: ExamOption[];
}

export interface ExamOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct?: boolean;
  order_index: number;
}

export interface ExamSubmission {
  id: string;
  exam_id: string;
  user_id: string;
  submitted_at: string;
  total_score: number;
  is_graded: boolean;
  feedback?: string | null;
  graded_by?: string | null;
  graded_at?: string | null;
  user?: Profile;
  exam?: Exam;
  answers?: ExamAnswer[];
}

export interface ExamAnswer {
  id: string;
  submission_id: string;
  question_id: string;
  selected_option_id?: string | null;
  text_answer?: string | null;
  score_awarded: number;
  is_correct: boolean;
  question?: ExamQuestion;
}

export interface AdminPermissionRecord {
  id: string;
  admin_id: string;
  permission: AdminPermission;
  granted: boolean;
  valid_until?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  target_type: 'all' | 'users' | 'admins' | 'specific';
  link_url?: string | null;
  created_by?: string | null;
  created_at: string;
  is_read?: boolean;
}

export interface ActivityLog {
  id: string;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
  actor?: Profile | null;
}
