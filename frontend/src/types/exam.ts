export interface Term {
  id: string;
  session: string;
  name: string;
  display_order: number;
}

export interface Exam {
  id: string;
  term: string | null;
  session: string;
  name: string;
  display_order: number;
  components?: ExamComponent[];
}

export interface ExamComponent {
  id: string;
  exam: string;
  parent: string | null;
  name: string;
  code: string;
  value_type: 'numeric' | 'grade' | 'descriptive';
  full_marks: number | null;
  display_order: number;
  is_optional: boolean;
  children?: ExamComponent[];
}

export interface SubjectAssessmentScheme {
  id: string;
  class_id: string;
  class_name?: string;
  subject_id: string;
  subject_name?: string;
  session_id: string;
  exam_component_id: string;
  exam_component_name?: string;
  full_marks: number;
  weightage_pct: number;
  is_active: boolean;
  display_order: number;
}

export interface GradePolicySet {
  id: string;
  session: string | null;
  name: string;
  is_active: boolean;
  grades: GradePolicyGrade[];
}

export interface GradePolicyGrade {
  id: string;
  grade_policy_set: string;
  grade_label: string;
  min_percentage: number;
  max_percentage: number;
  grade_point: number;
  display_order: number;
}

export interface PromotionRule {
  id: string;
  session: string;
  from_class: string;
  from_class_name?: string;
  to_class: string;
  to_class_name?: string;
  min_percentage: number;
  max_subjects_fail: number;
}

export interface MarksEntry {
  id: string;
  enrollment: string;
  subject: string;
  subject_name?: string;
  exam_component: string;
  exam_component_name?: string;
  marks_value: number | null;
  grade_value: string | null;
  descriptive_value: string | null;
  is_absent: boolean;
  remarks: string;
  entered_by: string | null;
  entered_by_email?: string;
  created_at: string;
  updated_at: string;
}
