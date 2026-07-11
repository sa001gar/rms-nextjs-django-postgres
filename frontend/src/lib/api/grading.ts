import api from './client';
import type { GradePolicySet, GradePolicyGrade, PromotionRule } from '@/types/exam';

export const gradePolicySetsApi = {
  getAll: async (sessionId?: string): Promise<GradePolicySet[]> => {
    const params: Record<string, string> = {};
    if (sessionId) params.session_id = sessionId;
    const res = await api.get<{ results?: GradePolicySet[] } | GradePolicySet[]>('/academics/grade-policy-sets/', params);
    return Array.isArray(res) ? res : (res.results || []);
  },

  create: async (data: { name: string; session?: string; grades: Omit<GradePolicyGrade, 'id' | 'grade_policy_set'>[] }): Promise<GradePolicySet> =>
    api.post<GradePolicySet>('/academics/grade-policy-sets/', data),

  delete: async (id: string): Promise<void> =>
    api.delete(`/academics/grade-policy-sets/${id}/`),
};

export const gradePolicyGradesApi = {
  create: async (data: Partial<GradePolicyGrade>): Promise<GradePolicyGrade> =>
    api.post<GradePolicyGrade>('/academics/grade-policy-grades/', data),

  update: async (id: string, data: Partial<GradePolicyGrade>): Promise<GradePolicyGrade> =>
    api.patch<GradePolicyGrade>(`/academics/grade-policy-grades/${id}/`, data),

  delete: async (id: string): Promise<void> =>
    api.delete(`/academics/grade-policy-grades/${id}/`),
};

export const promotionRulesApi = {
  getAll: async (sessionId?: string): Promise<PromotionRule[]> => {
    const params: Record<string, string> = {};
    if (sessionId) params.session_id = sessionId;
    const res = await api.get<{ results?: PromotionRule[] } | PromotionRule[]>('/academics/promotion-rules/', params);
    return Array.isArray(res) ? res : (res.results || []);
  },

  create: async (data: Partial<PromotionRule>): Promise<PromotionRule> =>
    api.post<PromotionRule>('/academics/promotion-rules/', data),

  update: async (id: string, data: Partial<PromotionRule>): Promise<PromotionRule> =>
    api.patch<PromotionRule>(`/academics/promotion-rules/${id}/`, data),

  delete: async (id: string): Promise<void> =>
    api.delete(`/academics/promotion-rules/${id}/`),
};
