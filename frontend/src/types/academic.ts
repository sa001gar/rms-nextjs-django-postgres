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
  sections?: Section[];
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

export type SubjectType = 'core' | 'optional' | 'cocurricular';

export interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  subject?: Subject;
  is_required: boolean;
  created_at: string;
}

export interface AssessmentType {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export interface AssessmentWeightage {
  id: string;
  assessment_type_id: string;
  class_id: string;
  subject_id: string;
  weightage: number;
  full_marks: number;
  created_at: string;
}

export interface GradePolicy {
  id: string;
  min_percentage: number;
  max_percentage: number;
  grade_label: string;
  grade_point: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
}
