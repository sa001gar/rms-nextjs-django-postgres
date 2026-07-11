import api from './client';

export interface AssessmentCategory {
  id: string;
  name: string;
  code: string;
  category: string;
  term?: { id: string; name: string } | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface MarksDistribution {
  id: string;
  class_id: string;
  assessment_category_id: string;
  full_marks: number;
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

export const assessmentsApi = {
  getCategories: async (): Promise<AssessmentCategory[]> => {
    const response = await api.get<{ results?: AssessmentCategory[] } | AssessmentCategory[]>('/academics/assessment-types/');
    return Array.isArray(response) ? response : (response.results || []);
  },
  createCategory: async (data: Partial<AssessmentCategory>): Promise<AssessmentCategory> => {
    return api.post<AssessmentCategory>('/academics/assessment-types/', data);
  },
  updateCategory: async (id: string, data: Partial<AssessmentCategory>): Promise<AssessmentCategory> => {
    return api.patch<AssessmentCategory>(`/academics/assessment-types/${id}/`, data);
  },
  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/academics/assessment-types/${id}/`);
  },
  getMarksDistribution: async (classId?: string): Promise<MarksDistribution[]> => {
    const response = await api.get<{ results?: MarksDistribution[] } | MarksDistribution[]>('/core-marks-distribution/', classId ? { class_id: classId } : undefined);
    return Array.isArray(response) ? response : (response.results || []);
  },
  bulkUpdateMarksDistribution: async (data: { class_id: string; distributions: Array<{ assessment_category_id: string; full_marks: number }> }): Promise<MarksDistribution[]> => {
    return api.post<MarksDistribution[]>('/core-marks-distribution/bulk-update/', data);
  },
  getWeightages: async (classId: string, subjectId?: string): Promise<AssessmentWeightage[]> => {
    const params: Record<string, string> = { class_id: classId };
    if (subjectId) params.subject_id = subjectId;
    const response = await api.get<{ results?: AssessmentWeightage[] } | AssessmentWeightage[]>('/academics/assessment-types/structure/', params);
    return Array.isArray(response) ? response : (response.results || []);
  },
  setWeightage: async (data: {
    class_id: string;
    subject_id: string;
    weightages: Array<{ assessment_type_id: string; full_marks: number; weightage_pct: number }>;
  }): Promise<void> => {
    await Promise.all(
      data.weightages.map((w) =>
        api.post('/academics/assessment-types/set-weightage/', {
          class_id: data.class_id,
          subject_id: data.subject_id,
          assessment_type_id: w.assessment_type_id,
          full_marks: w.full_marks,
          weightage_pct: w.weightage_pct,
        })
      )
    );
  },
};
