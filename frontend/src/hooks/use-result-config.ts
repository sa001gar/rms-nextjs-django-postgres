'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resultConfigApi, type ResultConfig } from '@/lib/api/result-config';

export function useResultConfig(sessionId: string, classId: string) {
  return useQuery({
    queryKey: ['result-config', sessionId, classId],
    queryFn: () => resultConfigApi.get(sessionId, classId),
    enabled: !!sessionId && !!classId,
    staleTime: 60_000,
  });
}

export function useSaveResultConfig(sessionId: string, classId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<ResultConfig>) =>
      resultConfigApi.save(sessionId, classId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['result-config', sessionId, classId] });
    },
  });
}

export function useSubjectGroups() {
  return useQuery({
    queryKey: ['subject-groups'],
    queryFn: async () => {
      const { subjectGroupsApi } = await import('@/lib/api/result-config');
      return subjectGroupsApi.list();
    },
  });
}
