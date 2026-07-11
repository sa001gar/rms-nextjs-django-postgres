import api from './client';
import type { Student, PaginatedResponse } from '@/types';

export const studentsApi = {
  getAll: async (params?: {
    class_id?: string;
    section_id?: string;
    session_id?: string;
    search?: string;
    page?: number;
  }): Promise<PaginatedResponse<Student>> => {
    return api.get<PaginatedResponse<Student>>('/enrollments/students/', params);
  },
  getAllUnpaginated: async (params?: {
    class_id?: string;
    section_id?: string;
    session_id?: string;
  }): Promise<Student[]> => {
    const response = await api.get<PaginatedResponse<Student>>('/enrollments/students/', { ...params, page_size: 1000 });
    return response.results || [];
  },
  getByFilters: async (sessionId: string, classId: string, sectionId: string): Promise<Student[]> => {
    const response = await api.get<{ results?: Student[] } | Student[]>('/enrollments/students/', {
      session_id: sessionId,
      class_id: classId,
      section_id: sectionId,
    });
    return Array.isArray(response) ? response : (response.results || []);
  },
  getById: async (id: string): Promise<Student> => {
    return api.get<Student>(`/enrollments/students/${id}/`);
  },
  create: async (data: Partial<Student>): Promise<Student> => {
    return api.post<Student>('/enrollments/students/', data);
  },
  update: async (id: string, data: Partial<Student>): Promise<Student> => {
    return api.patch<Student>(`/enrollments/students/${id}/`, data);
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/enrollments/students/${id}/`);
  },
  bulkCreate: async (students: Partial<Student>[]): Promise<Student[]> => {
    return api.post<Student[]>('/enrollments/students/bulk/', { students });
  },
};
