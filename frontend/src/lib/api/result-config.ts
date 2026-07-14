import api from './client';

export interface SubjectConfig {
  id: string;
  name: string;
  code: string;
  category: { id: string | null; name: string | null; code: string | null; is_scholastic: boolean } | null;
  group: { id: string | null; name: string | null; code: string | null } | null;
  is_required: boolean;
  display_order: number;
}

export interface ComponentData {
  id: string;
  name: string;
  code: string;
  value_type: 'numeric' | 'grade' | 'descriptive';
  full_marks: number | null;
  display_order: number;
  is_optional: boolean;
}

export interface ExamData {
  id: string;
  name: string;
  display_order: number;
  components: ComponentData[];
}

export interface TermData {
  id: string;
  name: string;
  display_order: number;
  exams: ExamData[];
}

export interface ComponentConfig {
  id: string;
  component_id: string;
  component_name: string;
  subject_id: string;
  subject_name: string;
  full_marks: number | null;
  weightage_pct: number;
  is_applicable: boolean;
  display_order: number;
}

export interface GradeRule {
  id?: string;
  label: string;
  min_percentage: number;
  max_percentage: number;
  grade_point: number;
  display_order: number;
}

export interface GradeScale {
  id: string;
  name: string;
  rules: GradeRule[];
}

export interface PromotionRule {
  id?: string;
  from_class_id: string;
  to_class_id: string;
  to_class_name?: string;
  min_percentage: number;
  max_subjects_fail: number;
}

export interface ResultConfig {
  subjects: SubjectConfig[];
  academic_structure: TermData[];
  configs: ComponentConfig[];
  grade_scale: GradeScale | null;
  promotion_rule: PromotionRule | null;
}

export const resultConfigApi = {
  get: (sessionId: string, classId: string): Promise<ResultConfig> =>
    api.get(`/academics/result-config/${sessionId}/${classId}/`),

  save: (sessionId: string, classId: string, data: Partial<ResultConfig>): Promise<ResultConfig> =>
    api.put(`/academics/result-config/${sessionId}/${classId}/`, data),
};

export const subjectGroupsApi = {
  list: (): Promise<any[]> => api.get('/academics/subject-groups/'),
  create: (data: any): Promise<any> => api.post('/academics/subject-groups/', data),
};
