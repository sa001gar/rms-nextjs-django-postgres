import api from './client';
import type { MarksEntry } from '@/types/marks';

export const marksApi = {
  getAll: async (params?: Record<string, unknown>): Promise<MarksEntry[]> => {
    const response = await api.get<{ results?: MarksEntry[] } | MarksEntry[]>('/results/marks-entries/', params);
    return Array.isArray(response) ? response : (response.results || []);
  },

  create: async (data: {
    enrollment_id: string;
    subject_id: string;
    exam_component_id: string;
    obtained_marks: number;
    is_absent?: boolean;
    is_grade_only?: boolean;
    remarks?: string;
  }): Promise<MarksEntry> => {
    return api.post<MarksEntry>('/results/marks-entries/', data);
  },

  update: async (id: string, data: {
    obtained_marks: number;
    is_absent?: boolean;
    remarks?: string;
  }): Promise<MarksEntry> => {
    return api.patch<MarksEntry>(`/results/marks-entries/${id}/`, data);
  },

  bulkUpsert: async (entries: Array<{
    enrollment_id: string;
    subject_id: string;
    exam_component_id: string;
    obtained_marks: number;
    is_absent?: boolean;
    is_grade_only?: boolean;
    remarks?: string;
  }>): Promise<MarksEntry[]> => {
    return api.post<MarksEntry[]>('/results/marks-entries/bulk-upsert/', { entries });
  },
};
