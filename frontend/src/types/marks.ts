export interface MarksEntry {
  id: string;
  enrollment: string;
  subject: string;
  subject_name?: string;
  exam_component: string;
  exam_component_name?: string;
  obtained_marks: number | null;
  is_absent: boolean;
  is_grade_only: boolean;
  remarks: string;
  entered_by: string | null;
  entered_by_email?: string;
  created_at: string;
  updated_at: string;
}

export interface SubjectResult {
  id: string;
  enrollment: string;
  subject: string;
  subject_name: string;
  subject_code: string;
  total_obtained: number;
  total_full: number;
  percentage: number;
  grade: string;
  grade_point: number;
  created_at: string;
  updated_at: string;
}
