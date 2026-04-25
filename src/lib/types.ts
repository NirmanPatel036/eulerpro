// ─── User & Auth ──────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'instructor' | 'student';

export interface Profile {
  id: string;
  role: UserRole;
  photo_url?: string;
  organization?: string;
  full_name?: string;
  email?: string;
  created_at: string;
}

// ─── Questions ────────────────────────────────────────────────────────────────

export type QuestionType =
  | 'multiple_choice'
  | 'checkbox'
  | 'fill_blank'
  | 'true_false'
  | 'matching'
  | 'reorder';

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 0.8,
  medium: 1.0,
  hard: 1.5,
};

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  text: string;
  points: number;
  difficulty: Difficulty;
  partial_credit: boolean;
  negative_marking: boolean;
  media_url?: string; // image/video URL
  media_type?: 'image' | 'video';
  order: number;
  render_as_code?: boolean;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  options: string[];
  correct_option: number;
}

export interface CheckboxQuestion extends BaseQuestion {
  type: 'checkbox';
  options: string[];
  correct_options: number[];
}

export interface FillBlankQuestion extends BaseQuestion {
  type: 'fill_blank';
  answer_regex: string;
  sample_answer: string;
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true_false';
  correct_answer: boolean;
}

export interface MatchingQuestion extends BaseQuestion {
  type: 'matching';
  pairs: { left: string; right: string }[];
}

export interface ReorderQuestion extends BaseQuestion {
  type: 'reorder';
  items: string[];
  correct_order: number[];
}

export type Question =
  | MultipleChoiceQuestion
  | CheckboxQuestion
  | FillBlankQuestion
  | TrueFalseQuestion
  | MatchingQuestion
  | ReorderQuestion;

// ─── Exams ────────────────────────────────────────────────────────────────────

export type ExamStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'archived';

export interface Exam {
  id: string;
  title: string;
  description?: string;
  instructor_id: string;
  duration: number; // minutes
  passing_score: number; // percentage (0-100)
  questions: Question[];
  scheduled_at?: string;
  status: ExamStatus;
  allow_review: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Exam Sessions ────────────────────────────────────────────────────────────

export type SessionStatus = 'pending' | 'verified' | 'active' | 'submitted' | 'completed';

export interface ProctoringFlag {
  id: string;
  type: ProctoringFlagType;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  description: string;
  screenshot_url?: string;
}

export type ProctoringFlagType =
  | 'face_not_detected'
  | 'multiple_faces'
  | 'tab_switch'
  | 'copy_paste'
  | 'unusual_eye_movement'
  | 'phone_detected'
  | 'face_mismatch';

export interface ExamSession {
  id: string;
  exam_id: string;
  student_id: string;
  answers: Record<string, unknown>;
  score?: number;
  passed?: boolean;
  proctoring_flags: ProctoringFlag[];
  started_at?: string;
  completed_at?: string;
  status: SessionStatus;
  exam?: Exam;
  student?: Profile;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export interface QuestionResult {
  question_id: string;
  question_text: string;
  type: QuestionType;
  points_possible: number;
  points_earned: number;
  difficulty: Difficulty;
  is_correct: boolean;
  is_partial: boolean;
  student_answer: unknown;
  correct_answer: unknown;
}

export interface ExamResult {
  session_id: string;
  exam_title: string;
  total_score: number;
  max_possible_score: number;
  percentage: number;
  passed: boolean;
  passing_score: number;
  question_results: QuestionResult[];
  proctoring_flags: ProctoringFlag[];
  duration_taken: number;
  completed_at: string;
}

// ─── Invites ──────────────────────────────────────────────────────────────────

export interface ExamInvite {
  id: string;
  exam_id: string;
  email: string;
  token: string;
  used: boolean;
  created_at: string;
}
