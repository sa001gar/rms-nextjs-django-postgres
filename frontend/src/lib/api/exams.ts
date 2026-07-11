import api from './client';
import type { Term, Exam, ExamComponent, SubjectAssessmentScheme } from '@/types/exam';

export const termsApi = {
  getAll: async (sessionId?: string): Promise<Term[]> => {
    const params: Record<string, string> = {};
    if (sessionId) params.session_id = sessionId;
    const res = await api.get<{ results?: Term[] } | Term[]>('/academics/terms/', params);
    return Array.isArray(res) ? res : (res.results || []);
  },
  create: async (data: Partial<Term>): Promise<Term> =>
    api.post<Term>('/academics/terms/', data),
  update: async (id: string, data: Partial<Term>): Promise<Term> =>
    api.patch<Term>(`/academics/terms/${id}/`, data),
  delete: async (id: string): Promise<void> =>
    api.delete(`/academics/terms/${id}/`),
};

export const examsApi = {
  getAll: async (sessionId?: string): Promise<Exam[]> => {
    const params: Record<string, string> = {};
    if (sessionId) params.session_id = sessionId;
    const res = await api.get<{ results?: Exam[] } | Exam[]>('/academics/exams/', params);
    return Array.isArray(res) ? res : (res.results || []);
  },
  get: async (id: string): Promise<Exam> =>
    api.get<Exam>(`/academics/exams/${id}/`),
  create: async (data: Partial<Exam>): Promise<Exam> =>
    api.post<Exam>('/academics/exams/', data),
  update: async (id: string, data: Partial<Exam>): Promise<Exam> =>
    api.patch<Exam>(`/academics/exams/${id}/`, data),
  delete: async (id: string): Promise<void> =>
    api.delete(`/academics/exams/${id}/`),
};

export const examComponentsApi = {
  getAll: async (examId?: string): Promise<ExamComponent[]> => {
    const params: Record<string, string> = {};
    if (examId) params.exam_id = examId;
    const res = await api.get<{ results?: ExamComponent[] } | ExamComponent[]>('/academics/exam-components/', params);
    return Array.isArray(res) ? res : (res.results || []);
  },
  create: async (data: Partial<ExamComponent>): Promise<ExamComponent> =>
    api.post<ExamComponent>('/academics/exam-components/', data),
  update: async (id: string, data: Partial<ExamComponent>): Promise<ExamComponent> =>
    api.patch<ExamComponent>(`/academics/exam-components/${id}/`, data),
  delete: async (id: string): Promise<void> =>
    api.delete(`/academics/exam-components/${id}/`),
};

export const assessmentSchemesApi = {
  getAll: async (params?: {
    class_id?: string;
    subject_id?: string;
    session_id?: string;
  }): Promise<SubjectAssessmentScheme[]> => {
    const res = await api.get<{ results?: SubjectAssessmentScheme[] } | SubjectAssessmentScheme[]>(
      '/academics/subject-assessment-schemes/', params
    );
    return Array.isArray(res) ? res : (res.results || []);
  },
  bulkSave: async (mappings: any[]): Promise<SubjectAssessmentScheme[]> => {
    return api.post<SubjectAssessmentScheme[]>('/academics/subject-assessment-schemes/bulk-save/', { mappings });
  },
};
