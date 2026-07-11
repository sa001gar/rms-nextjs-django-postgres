import api from './client';
import type {
  ReportCardTemplate,
  ReportCardSection,
  SectionSubjectGroup,
  TemplateAssignment,
} from '@/types/template';

export const templatesApi = {
  getAll: async (): Promise<ReportCardTemplate[]> => {
    const res = await api.get<{ results?: ReportCardTemplate[] } | ReportCardTemplate[]>('/academics/report-card-templates/');
    return Array.isArray(res) ? res : (res.results || []);
  },

  get: async (id: string): Promise<ReportCardTemplate> =>
    api.get<ReportCardTemplate>(`/academics/report-card-templates/${id}/`),

  create: async (data: Partial<ReportCardTemplate>): Promise<ReportCardTemplate> =>
    api.post<ReportCardTemplate>('/academics/report-card-templates/', data),

  update: async (id: string, data: Partial<ReportCardTemplate>): Promise<ReportCardTemplate> =>
    api.patch<ReportCardTemplate>(`/academics/report-card-templates/${id}/`, data),

  delete: async (id: string): Promise<void> =>
    api.delete(`/academics/report-card-templates/${id}/`),

  sections: {
    create: async (templateId: string, data: Partial<ReportCardSection>): Promise<ReportCardSection> =>
      api.post<ReportCardSection>(`/academics/report-card-templates/${templateId}/sections/`, data),

    update: async (sectionId: string, data: Partial<ReportCardSection>): Promise<ReportCardSection> =>
      api.patch<ReportCardSection>(`/academics/report-card-sections/${sectionId}/`, data),

    delete: async (sectionId: string): Promise<void> =>
      api.delete(`/academics/report-card-sections/${sectionId}/`),
  },

  subjectGroups: {
    create: async (sectionId: string, data: Partial<SectionSubjectGroup>): Promise<SectionSubjectGroup> =>
      api.post<SectionSubjectGroup>(`/academics/report-card-sections/${sectionId}/subject-groups/`, data),

    delete: async (groupId: string): Promise<void> =>
      api.delete(`/academics/report-card-section-subject-groups/${groupId}/`),
  },

  assignments: {
    create: async (data: Partial<TemplateAssignment>): Promise<TemplateAssignment> =>
      api.post<TemplateAssignment>('/academics/report-card-template-assignments/', data),

    delete: async (id: string): Promise<void> =>
      api.delete(`/academics/report-card-template-assignments/${id}/`),
  },
};
