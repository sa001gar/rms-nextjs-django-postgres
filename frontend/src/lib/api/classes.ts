import api from './client';
import type { Class, Section } from '@/types';

export const classesApi = {
  getAll: async (): Promise<Class[]> => {
    const response = await api.get<{ results?: Class[] } | Class[]>('/academics/classes/');
    return Array.isArray(response) ? response : (response.results || []);
  },
  getById: async (id: string): Promise<Class> => {
    return api.get<Class>(`/academics/classes/${id}/`);
  },
  create: async (data: Partial<Class>): Promise<Class> => {
    return api.post<Class>('/academics/classes/', data);
  },
  update: async (id: string, data: Partial<Class>): Promise<Class> => {
    return api.patch<Class>(`/academics/classes/${id}/`, data);
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/academics/classes/${id}/`);
  },
  getSections: async (classId: string): Promise<Section[]> => {
    const response = await api.get<{ results?: Section[] } | Section[]>(`/academics/classes/${classId}/sections/`);
    return Array.isArray(response) ? response : (response.results || []);
  },
  createSection: async (data: { name: string; class_id: string }): Promise<Section> => {
    return api.post<Section>(`/academics/classes/${data.class_id}/sections/`, data);
  },
  updateSection: async (classId: string, id: string, data: Partial<Section>): Promise<Section> => {
    return api.patch<Section>(`/academics/classes/${classId}/sections/${id}/`, data);
  },
  deleteSection: async (classId: string, id: string): Promise<void> => {
    await api.delete(`/academics/classes/${classId}/sections/${id}/`);
  },
};
