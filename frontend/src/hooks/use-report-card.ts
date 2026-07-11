import { useQuery } from '@tanstack/react-query';
import { reportCardApi } from '@/lib/api/report-card';

export function useReportCard(
  userId: string,
  sessionId?: string,
  templateId?: string
) {
  return useQuery({
    queryKey: ['report-card', userId, sessionId, templateId],
    queryFn: () => reportCardApi.getByUserId(userId, sessionId, templateId),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

export function useClassReportCards(
  classId: string,
  sectionId: string,
  sessionId: string
) {
  return useQuery({
    queryKey: ['report-cards', classId, sectionId, sessionId],
    queryFn: () => reportCardApi.getClassReportCards(classId, sectionId, sessionId),
    enabled: !!classId && !!sectionId && !!sessionId,
    staleTime: 60 * 1000,
  });
}
