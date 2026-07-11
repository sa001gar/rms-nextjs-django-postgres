import api from './client';
import type { MarksEntry } from '@/types/exam';

export const marksEntriesApi = {
  getByEnrollment: async (enrollmentId: string): Promise<MarksEntry[]> => {
    const res = await api.get<{ results?: MarksEntry[] } | MarksEntry[]>(
      `/results/marks-entries/by-enrollment/${enrollmentId}/`
    );
    return Array.isArray(res) ? res : (res.results || []);
  },

  getByClassSubject: async (
    classId: string,
    subjectId: string,
    examComponentId: string
  ): Promise<MarksEntry[]> => {
    const res = await api.get<{ results?: MarksEntry[] } | MarksEntry[]>(
      '/results/marks-entries/',
      { class_id: classId, subject_id: subjectId, exam_component_id: examComponentId }
    );
    return Array.isArray(res) ? res : (res.results || []);
  },

  create: async (data: {
    enrollment_id: string;
    subject_id: string;
    exam_component_id: string;
    marks_value?: number;
    grade_value?: string;
    descriptive_value?: string;
    is_absent?: boolean;
    remarks?: string;
  }): Promise<MarksEntry> =>
    api.post<MarksEntry>('/results/marks-entries/', data),

  update: async (id: string, data: {
    marks_value?: number;
    grade_value?: string;
    descriptive_value?: string;
    is_absent?: boolean;
    remarks?: string;
  }): Promise<MarksEntry> =>
    api.patch<MarksEntry>(`/results/marks-entries/${id}/`, data),

  bulkUpsert: async (entries: any[]): Promise<MarksEntry[]> =>
    api.post<MarksEntry[]>('/results/marks-entries/bulk-upsert/', { entries }),
};
