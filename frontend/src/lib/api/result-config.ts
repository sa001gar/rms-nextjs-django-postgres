import api from './client';

// ─── Types ─────────────────────────────────────────────────────────────────

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
  is_locked: boolean;
}

export interface ResultConfigPayload {
  academic_structure?: TermData[];
  subjects?: Partial<SubjectConfig>[];
  configs?: Partial<ComponentConfig>[];
  grade_scale?: Partial<GradeScale> | null;
  promotion_rule?: Partial<PromotionRule> | null;
}

// ─── API Client ────────────────────────────────────────────────────────────

export const resultConfigApi = {
  get: (sessionId: string, classId: string): Promise<ResultConfig> =>
    api.get(`/academics/result-config/${sessionId}/${classId}/`),

  save: (sessionId: string, classId: string, data: ResultConfigPayload): Promise<ResultConfig> =>
    api.put(`/academics/result-config/${sessionId}/${classId}/`, data),

  clone: (
    sessionId: string,
    classId: string,
    targetSessionId: string,
    targetClassId: string
  ): Promise<ResultConfig> =>
    api.post(`/academics/result-config/${sessionId}/${classId}/clone/`, {
      target_session_id: targetSessionId,
      target_class_id: targetClassId,
    }),

  duplicateTerm: (
    sessionId: string,
    classId: string,
    termId: string,
    name?: string
  ): Promise<ResultConfig> =>
    api.post(`/academics/result-config/${sessionId}/${classId}/duplicate-term/`, {
      term_id: termId,
      name,
    }),

  lock: (sessionId: string, classId: string): Promise<{ is_locked: boolean }> =>
    api.post(`/academics/result-config/${sessionId}/${classId}/lock/`),

  unlock: (sessionId: string, classId: string): Promise<{ is_locked: boolean }> =>
    api.post(`/academics/result-config/${sessionId}/${classId}/unlock/`),

  reset: (sessionId: string, classId: string): Promise<ResultConfig> =>
    api.post(`/academics/result-config/${sessionId}/${classId}/reset/`),

  importFromSession: (
    sessionId: string,
    classId: string,
    sourceSessionId: string
  ): Promise<ResultConfig> =>
    api.post(`/academics/result-config/${sessionId}/${classId}/import/`, {
      source_session_id: sourceSessionId,
    }),
};

export const subjectGroupsApi = {
  list: (): Promise<any[]> => api.get('/academics/subject-groups/'),
  create: (data: any): Promise<any> => api.post('/academics/subject-groups/', data),
};
