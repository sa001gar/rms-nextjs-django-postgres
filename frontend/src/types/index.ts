/**
 * TypeScript Types for Django Backend API
 * These types match the Django models and serializers
 */

// ============================================================================
// User & Auth Types
// ============================================================================

export type UserRole = 'site_admin' | 'admin' | 'teacher' | 'student';

export interface School {
  id: string;
  name: string;
  code: string;
  logo: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  email: string;
  phone: string;
  website: string;
  student_id_prefix?: string;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  role: UserRole;
  is_active?: boolean;
  school?: School | null; // Site admin might have null school
  class_info?: Class;
  section_info?: Section;
}

export interface Teacher {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Admin {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
  teacher: Teacher | null;
  admin: Admin | null;
}

export interface CurrentUserResponse {
  user: User;
  teacher: Teacher | null;
  admin: Admin | null;
}

export interface StudentLoginResponse {
  access: string;
  refresh: string;
  student: Student;
}

// ============================================================================
// Core Entity Types
// ============================================================================

export interface Session {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_locked: boolean;
  created_at: string;
}

export interface Class {
  id: string;
  name: string;
  level: number;
  created_at: string;
}

export interface Section {
  id: string;
  name: string;
  class_id: string;
  class_name?: string;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  full_marks: number;
  created_at: string;
}

export interface CocurricularSubject {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface OptionalSubject {
  id: string;
  name: string;
  code: string;
  default_full_marks: number;
  created_at: string;
}

// ============================================================================
// Teacher Subject Assignment Types
// ============================================================================

export interface SubjectAssignment {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
  section_id: string;
  session_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  teacher?: Teacher;
  subject?: Subject;
  subject_info?: Subject; // Alias for subject
  class_info?: Class;
  section_info?: Section;
  session_info?: Session;
}

export interface ExamType {
  id: string;
  name: string;
  code: string;
  display_name?: string;
  is_active: boolean;
}

export interface SubjectMark {
  id: string;
  student_id: string;
  subject_id: string;
  exam_type_id: string;
  session_id: string;
  marks_obtained: number;
  full_marks: number;
  is_absent: boolean;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  student?: Student;
  subject?: Subject;
  exam_type?: ExamType;
  // Extended fields for marks entry
  theory_marks?: number;
  practical_marks?: number;
  assignment_marks?: number;
}

export interface CocurricularGrade {
  id: string;
  student_id: string;
  cocurricular_subject_id: string;
  activity_id?: string; // Alias for cocurricular_subject_id
  term: 'first' | 'second' | 'final';
  session_id: string;
  grade: string;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  student?: Student;
  cocurricular_subject?: CocurricularSubject;
}

// ============================================================================
// Student Types
// ============================================================================

export interface Student {
  id: string;
  student_id: string;
  roll_no: string;
  name: string;
  date_of_birth?: string | null;
  father_name?: string;
  mother_name?: string;
  guardian_name?: string;
  guardian_relation?: string;
  phone?: string;
  alternate_phone?: string;
  email?: string | null;
  profile_pic?: string | null;
  address?: string;
  class_id: string | null;
  section_id: string | null;
  session_id: string | null;
  admission_date?: string | null;
  admission_class_id?: string | null;
  admission_session_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  class_info?: Class;
  section_info?: Section;
  session_info?: Session;
  // Fee summary (optional, populated on demand)
  fee_summary?: {
    total_amount: number;
    paid_amount: number;
    pending_amount: number;
    status: 'paid' | 'partial' | 'pending' | 'overdue';
  };
}

// StudentExtended is now just an alias for backward compatibility
export type StudentExtended = Student;

export type EnrollmentStatus = 'active' | 'promoted' | 'retained' | 'transferred' | 'graduated' | 'dropped';

export interface StudentEnrollment {
  id: string;
  student_id: string;
  student_name: string;
  student_permanent_id: string;
  session_id: string;
  session_name: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  roll_no: string;
  status: EnrollmentStatus;
  promotion_date: string | null;
  remarks: string;
  created_at: string;
}

// ============================================================================
// Class Configuration Types
// ============================================================================

export interface ClassSubjectAssignment {
  id: string;
  class_id: string;
  subject: Subject;
  subject_id?: string;
  is_required: boolean;
  created_at: string;
}

export interface ClassOptionalConfig {
  id: string;
  class_id: string;
  has_optional: boolean;
  created_at: string;
}

export interface ClassOptionalAssignment {
  id: string;
  class_id: string;
  optional_subject: OptionalSubject;
  optional_subject_id?: string;
  full_marks: number;
  is_required: boolean;
  created_at: string;
}

export interface ClassCocurricularConfig {
  id: string;
  class_id: string;
  has_cocurricular: boolean;
  created_at: string;
}

export interface ClassMarksDistribution {
  id: string;
  class_id: string;
  first_summative_marks: number;
  first_formative_marks: number;
  second_summative_marks: number;
  second_formative_marks: number;
  third_summative_marks: number;
  third_formative_marks: number;
  number_of_unit_tests: number;
  has_final_term: boolean;
  unit_test_marks: number;
  formative_marks: number;
  final_term_marks: number;
  total_marks: number;
  created_at: string;
  updated_at: string;
}

export interface SchoolConfig {
  id: string;
  class_id: string | null;
  session_id: string | null;
  total_school_days: number;
  created_at: string;
  updated_at: string;
}

export interface ClassConfigResponse {
  class: Class;
  sections: Section[];
  subject_assignments: ClassSubjectAssignment[];
  optional_config: ClassOptionalConfig | null;
  optional_assignments: ClassOptionalAssignment[];
  cocurricular_config: ClassCocurricularConfig | null;
  marks_distribution: ClassMarksDistribution | null;
}

// ============================================================================
// Result Types
// ============================================================================

export interface StudentResult {
  id: string;
  student_id: string;
  subject_id: string;
  session_id: string;
  first_summative_full: number;
  first_summative_obtained: number;
  first_formative_full: number;
  first_formative_obtained: number;
  second_summative_full: number;
  second_summative_obtained: number;
  second_formative_full: number;
  second_formative_obtained: number;
  third_summative_full: number;
  third_summative_obtained: number;
  third_formative_full: number;
  third_formative_obtained: number;
  total_marks: number;
  max_marks?: number;
  grade: string;
  conduct: string;
  attendance_days: number;
  created_at: string;
  updated_at: string;
  student?: Student;
  subject?: Subject;
  session?: Session;
  // Extended fields for student display
  percentage?: number;
  exam_type?: string;
  overall_grade?: string;
  is_passed?: boolean;
  subjects?: Array<{
    name: string;
    obtained: number;
    full: number;
    grade: string;
  }>;
}

export interface StudentCocurricularResult {
  id: string;
  student_id: string;
  cocurricular_subject_id: string;
  session_id: string;
  first_term_marks: number;
  second_term_marks: number;
  final_term_marks: number;
  full_marks: number;
  total_marks: number;
  first_term_grade: string;
  second_term_grade: string;
  final_term_grade: string;
  overall_grade: string;
  created_at: string;
  updated_at: string;
  student?: Student;
  cocurricular_subject?: CocurricularSubject;
  session?: Session;
}

export interface StudentOptionalResult {
  id: string;
  student_id: string;
  optional_subject_id: string;
  session_id: string;
  obtained_marks: number;
  full_marks: number;
  grade: string;
  created_at: string;
  updated_at: string;
  student?: Student;
  optional_subject?: OptionalSubject;
  session?: Session;
}

export interface StudentWithResult extends Student {
  result?: StudentResult;
}

export interface AssignedSubject extends Subject {
  isAssigned: boolean;
  completionStatus: {
    totalStudents: number;
    studentsWithMarks: number;
    isComplete: boolean;
  };
}

// ============================================================================
// Marksheet Types
// ============================================================================

export interface MarksheetSummary {
  total_marks: number;
  total_full_marks: number;
  optional_total: number;
  optional_full: number;
  grand_total: number;
  grand_full: number;
  percentage: number;
  overall_grade: string;
}

export interface StudentMarksheet {
  student: {
    id: string;
    roll_no: string;
    name: string;
    class: string | null;
    section: string | null;
    session: string | null;
  };
  results: StudentResult[];
  cocurricular_results: StudentCocurricularResult[];
  optional_results: StudentOptionalResult[];
  summary: MarksheetSummary;
}

export interface MarksheetSubject {
  name: string;
  subject_name?: string;
  marks_obtained?: number;
  max_marks?: number;
  theory_marks?: number;
  practical_marks?: number;
  assignment_marks?: number;
  total?: number;
  grade: string;
}

export interface MarksheetCocurricularGrade {
  activity: string;
  activity_name?: string;
  grade: string;
}

export interface MarksheetResponse {
  student?: Student;
  results: StudentResult[];
  cocurricular_results: StudentCocurricularResult[];
  optional_results: StudentOptionalResult[];
  summary: MarksheetSummary;
  fee_status: 'cleared' | 'pending';
  // Extended properties for marksheet display
  student_info?: {
    name: string;
    roll_no: string;
    admission_no?: string;
  };
  class_info?: Class;
  section_info?: Section;
  session?: Session;
  exam_type?: string;
  school_info?: {
    name: string;
    address?: string;
    logo?: string;
  };
  subjects?: MarksheetSubject[];
  cocurricular_grades?: MarksheetCocurricularGrade[];
  total_marks?: number;
  max_marks?: number;
  percentage?: number;
  overall_grade?: string;
  is_passed?: boolean;
  rank?: number;
  remarks?: string;
}

// Type alias for backward compatibility
export type Marksheet = MarksheetResponse;

// ============================================================================
// Payment Types
// ============================================================================

export interface FeeStructure {
  id: string;
  name: string;
  description: string | null;
  class_id: string;
  session_id: string;
  tuition_fee: number;
  admission_fee: number;
  library_fee: number;
  lab_fee: number;
  sports_fee: number;
  exam_fee: number;
  miscellaneous_fee: number;
  total_fee: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  class_info?: Class;
  session_info?: Session;
}

export interface FeeDiscount {
  id: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentFee {
  id: string;
  student_id: string;
  fee_structure_id: string;
  session_id: string;
  discount_id: string | null;
  gross_amount: number;
  discount_amount: number;
  net_amount: number;
  paid_amount: number;
  balance_amount: number;
  due_date: string | null;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'waived';
  created_at: string;
  updated_at: string;
  student?: Student;
  fee_structure?: FeeStructure;
  session?: Session;
  discount?: FeeDiscount;
}

export interface Payment {
  id: string;
  student_fee_id: string;
  amount: number;
  payment_method: 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'card' | 'online' | 'other';
  transaction_id: string | null;
  reference_number: string | null;
  receipt_number: string;
  payment_date: string;
  remarks: string | null;
  received_by_id: string | null;
  created_at: string;
  updated_at: string;
  student_fee?: StudentFee;
}

export interface PaymentReminder {
  id: string;
  student_fee_id: string;
  reminder_date: string;
  message: string;
  status: 'scheduled' | 'sent' | 'cancelled';
  sent_at: string | null;
  created_at: string;
}

export interface FeeSummary {
  total_students: number;
  total_net_amount: number;
  total_paid_amount: number;
  total_pending_amount: number;
  collection_percentage: number;
  status_counts: {
    paid: number;
    partial: number;
    pending: number;
    overdue: number;
    waived: number;
  };
}

export interface DailyCollection {
  date: string;
  total_collection: number;
  total_transactions: number;
  by_payment_method: Record<string, number>;
}

export interface StudentFeesSummary {
  student: Student;
  fees: StudentFee[];
  payments: Payment[];
  summary: {
    total_gross: string;
    total_discount: string;
    total_net: string;
    total_paid: string;
    balance: string;
  };
  // Convenience properties for direct access
  total_amount?: number;
  total_paid?: number;
  total_due?: number;
}

// ============================================================================
// Teacher Assignment Types
// ============================================================================

export interface ClassTeacher {
  id: string;
  teacher_id: string;
  teacher_name: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  session_id: string;
  session_name: string;
  is_active: boolean;
  created_at: string;
}

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  teacher_name: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  subject_id: string;
  subject_name: string;
  session_id: string;
  session_name: string;
  is_active: boolean;
  created_at: string;
}

export interface CocurricularTeacherAssignment {
  id: string;
  teacher_id: string;
  teacher_name: string;
  cocurricular_subject_name: string;
  class_name: string;
  section_name: string;
  session_name: string;
  is_active: boolean;
  created_at: string;
}

export interface OptionalTeacherAssignment {
  id: string;
  teacher_id: string;
  teacher_name: string;
  optional_subject_name: string;
  class_name: string;
  section_name: string;
  session_name: string;
  is_active: boolean;
  created_at: string;
}

export interface TeacherPendingTask {
  assignment_id: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  subject_id: string;
  subject_name: string;
  total_students: number;
  first_term: {
    entered: number;
    total: number;
    progress: number;
  };
  second_term: {
    entered: number;
    total: number;
    progress: number;
  };
  third_term: {
    entered: number;
    total: number;
    progress: number;
  };
}

export interface TeacherAssignmentsResponse {
  teacher: Teacher;
  assignments: TeacherAssignment[];
  session: Session | null;
}

export interface TeacherPendingTasksResponse {
  teacher: Teacher;
  pending_tasks: TeacherPendingTask[];
  session: Session | null;
}

// ============================================================================
// Dashboard Stats Types
// ============================================================================

export interface AdminDashboardStats {
  session: Session | null;
  counts: {
    total_students: number;
    session_students: number;
    total_teachers: number;
    total_classes: number;
  };
  fees: {
    total_fees: string;
    total_collected: string;
    pending: string;
    collection_rate: number;
  };
  recent_payments: Payment[];
  class_distribution: Array<{
    class_name: string;
    count: number;
  }>;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  message: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

// ============================================================================
// Form Types
// ============================================================================

export interface StudentFormData {
  student_id: string;
  name: string;
  roll_no: string;
  class_id: string;
  section_id: string;
  session_id: string;
  guardian_name?: string;
  guardian_relation?: string;
  alternate_phone?: string;
  email?: string;
}

export interface TeacherFormData {
  email: string;
  password: string;
  name: string;
}

export interface MarksEntryFormData {
  student_id: string;
  subject_id: string;
  session_id: string;
  first_summative_obtained?: number;
  first_formative_obtained?: number;
  second_summative_obtained?: number;
  second_formative_obtained?: number;
  third_summative_obtained?: number;
  third_formative_obtained?: number;
  conduct?: string;
  attendance_days?: number;
}

export interface PaymentFormData {
  student_fee_id: string;
  amount: number;
  payment_method: Payment['payment_method'];
  transaction_id?: string;
  reference_number?: string;
  payment_date?: string;
  remarks?: string;
}

// ============================================================================
// Dynamic Marks Distribution Types
// ============================================================================

export type AssessmentCategoryType = 'summative' | 'formative' | 'project' | 'practical' | 'other';

export interface AssessmentCategory {
  id: string;
  school_id: string;
  name: string;
  code: string;
  category_type: AssessmentCategoryType;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CoreSubjectMarksDistribution {
  id: string;
  class_id: string;
  class_name?: string;
  assessment_category?: AssessmentCategory;
  assessment_category_id: string;
  full_marks: number;
  created_at: string;
  updated_at: string;
}

export interface CocurricularMarksDistribution {
  id: string;
  class_id: string;
  class_name?: string;
  cocurricular_subject_id: string;
  cocurricular_subject_name?: string;
  assessment_category?: AssessmentCategory;
  assessment_category_id: string;
  full_marks: number;
  created_at: string;
  updated_at: string;
}

export interface OptionalMarksDistribution {
  id: string;
  class_id: string;
  class_name?: string;
  optional_subject_id: string;
  optional_subject_name?: string;
  assessment_category?: AssessmentCategory;
  assessment_category_id: string;
  full_marks: number;
  created_at: string;
  updated_at: string;
}
