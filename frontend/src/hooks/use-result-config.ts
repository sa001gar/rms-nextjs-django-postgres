'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resultConfigApi, type ResultConfig, type ResultConfigPayload } from '@/lib/api/result-config';

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
    mutationFn: (data: ResultConfigPayload) =>
      resultConfigApi.save(sessionId, classId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['result-config', sessionId, classId] });
    },
  });
}

export function useCloneConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      classId,
      targetSessionId,
      targetClassId,
    }: {
      sessionId: string;
      classId: string;
      targetSessionId: string;
      targetClassId: string;
    }) => resultConfigApi.clone(sessionId, classId, targetSessionId, targetClassId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['result-config', variables.targetSessionId, variables.targetClassId] });
    },
  });
}

export function useDuplicateTerm(sessionId: string, classId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ termId, name }: { termId: string; name?: string }) =>
      resultConfigApi.duplicateTerm(sessionId, classId, termId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['result-config', sessionId, classId] });
    },
  });
}

export function useLockConfig(sessionId: string, classId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => resultConfigApi.lock(sessionId, classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['result-config', sessionId, classId] });
    },
  });
}

export function useUnlockConfig(sessionId: string, classId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => resultConfigApi.unlock(sessionId, classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['result-config', sessionId, classId] });
    },
  });
}

export function useResetConfig(sessionId: string, classId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => resultConfigApi.reset(sessionId, classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['result-config', sessionId, classId] });
    },
  });
}

export function useImportConfig(sessionId: string, classId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sourceSessionId }: { sourceSessionId: string }) =>
      resultConfigApi.importFromSession(sessionId, classId, sourceSessionId),
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
