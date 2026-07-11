import api from './client';
import type { ReportCardData } from '@/types/report-card';

export const reportCardApi = {
  getStudentReportCard: async (
    enrollmentId: string,
    templateId?: string
  ): Promise<ReportCardData> => {
    const params: Record<string, string> = {};
    if (templateId) params.template_id = templateId;
    return api.get<ReportCardData>(
      `/reporting/report-cards/student/${enrollmentId}/`,
      params
    );
  },

  getByUserId: async (
    userId: string,
    sessionId?: string,
    templateId?: string
  ): Promise<ReportCardData> => {
    const params: Record<string, string> = {};
    if (sessionId) params.session_id = sessionId;
    if (templateId) params.template_id = templateId;
    return api.get<ReportCardData>(
      `/reporting/report-cards/by-user/${userId}/`,
      params
    );
  },

  getClassReportCards: async (
    classId: string,
    sectionId: string,
    sessionId: string
  ): Promise<ReportCardData[]> => {
    return api.get<ReportCardData[]>('/reporting/report-cards/class/', {
      class_id: classId,
      section_id: sectionId,
      session_id: sessionId,
    });
  },
};
