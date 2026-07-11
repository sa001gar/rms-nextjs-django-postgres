import api from './client';

export interface Teacher {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export const teachersApi = {
  getAll: async (): Promise<Teacher[]> => {
    const response = await api.get<{ results?: Teacher[] } | Teacher[]>('/identity/teachers/');
    return Array.isArray(response) ? response : (response.results || []);
  },
  getById: async (id: string): Promise<Teacher> => {
    return api.get<Teacher>(`/identity/teachers/${id}/`);
  },
  create: async (data: { email: string; password: string; name: string }): Promise<Teacher> => {
    return api.post<Teacher>('/identity/teachers/', data);
  },
  update: async (id: string, data: { email?: string; name?: string }): Promise<Teacher> => {
    return api.patch<Teacher>(`/identity/teachers/${id}/`, data);
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/identity/teachers/${id}/`);
  },
  resetPassword: async (id: string): Promise<{ message: string }> => {
    return api.post<{ message: string }>(`/identity/teachers/${id}/reset-password/`);
  },
};
