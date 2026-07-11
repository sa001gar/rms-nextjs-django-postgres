import api from './client';

export interface Term {
  id: string;
  session: string;
  name: string;
  display_order: number;
  created_at: string;
}

export const termsApi = {
  getAll: async (sessionId?: string): Promise<Term[]> => {
    const response = await api.get<{ results?: Term[] } | Term[]>('/academics/terms/', sessionId ? { session_id: sessionId } : undefined);
    return Array.isArray(response) ? response : (response.results || []);
  },
  create: async (data: Partial<Term>): Promise<Term> => {
    return api.post<Term>('/academics/terms/', data);
  },
  update: async (id: string, data: Partial<Term>): Promise<Term> => {
    return api.patch<Term>(`/academics/terms/${id}/`, data);
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/academics/terms/${id}/`);
  },
};
