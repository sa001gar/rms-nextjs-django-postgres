import api from './client';
import type { SubjectCategory } from '@/types';

export const subjectCategoriesApi = {
  getAll: async (): Promise<SubjectCategory[]> => {
    const response = await api.get<{ results?: SubjectCategory[] } | SubjectCategory[]>('/academics/subject-categories/');
    return Array.isArray(response) ? response : (response.results || []);
  },
  getById: async (id: string): Promise<SubjectCategory> => {
    return api.get<SubjectCategory>(`/academics/subject-categories/${id}/`);
  },
  create: async (data: Partial<SubjectCategory>): Promise<SubjectCategory> => {
    return api.post<SubjectCategory>('/academics/subject-categories/', data);
  },
  update: async (id: string, data: Partial<SubjectCategory>): Promise<SubjectCategory> => {
    return api.patch<SubjectCategory>(`/academics/subject-categories/${id}/`, data);
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/academics/subject-categories/${id}/`);
  },
};
