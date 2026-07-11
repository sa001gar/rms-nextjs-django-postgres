// ─── Report Card TypeScript types ───

export interface SchoolInfo {
  name: string;
}

export interface StudentInfo {
  id: string;
  name: string;
  roll_no: string;
  registration_number: string;
  father_name: string;
  mother_name: string;
  class_name: string;
  section_name: string;
  date_of_birth: string | null;
}

export interface SessionInfo {
  id: string;
  name: string;
}

export interface ComponentMarksData {
  component_id: string;
  name: string;
  code: string;
  obtained: number;
  full: number;
  is_absent: boolean;
  is_grade_only: boolean;
  weightage_pct: number;
}

export interface ExamGroupData {
  exam_id: string;
  exam_name: string;
  display_order: number;
  components: ComponentMarksData[];
  total_obtained: number;
  total_full: number;
  percentage: number | null;
  grade: string;
  grade_point: number;
}

export interface SubjectResultData {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  category_code: string | null;
  category_name: string | null;
  exam_groups: ExamGroupData[];
  total_obtained: number;
  total_full: number;
  overall_percentage: number | null;
  overall_grade: string;
  overall_grade_point: number;
  is_scholastic: boolean;
}

export interface CoScholasticData {
  subject_name: string;
  grade: string;
  grade_point: number;
  remarks: string;
}

export interface AttendanceData {
  exam_name: string | null;
  present: number;
  total: number;
  percentage: number;
}

export interface RemarkData {
  remark_type: string;
  content: string;
}

export interface GradingScaleEntry {
  grade: string;
  min_percentage: number;
  max_percentage: number;
  grade_point: number;
}

export interface SignatureData {
  role: string;
  label: string;
  name: string;
}

export interface SummaryData {
  total_marks_obtained: number;
  total_marks_full: number;
  overall_percentage: number | null;
  overall_grade: string;
  overall_grade_point: number;
  promotion_status: string;
  rank_value: number | null;
  rank_total: number | null;
}

export interface ReportCardData {
  school: SchoolInfo;
  student: StudentInfo;
  session: SessionInfo;
  template_id: string | null;
  attendance: AttendanceData[];
  attendance_overall: AttendanceData | null;
  subjects: SubjectResultData[];
  co_scholastic: CoScholasticData[];
  discipline: CoScholasticData | null;
  summary: SummaryData;
  remarks: RemarkData[];
  signatures: SignatureData[];
  grading_scale: GradingScaleEntry[];
}
