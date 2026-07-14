'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marksGridApi, type MarksGridData, type CellUpdate } from '@/lib/api/marks-grid';

export function useMarksGrid(sessionId: string, classId: string, sectionId?: string) {
  return useQuery({
    queryKey: ['marks-grid', sessionId, classId, sectionId || 'all'],
    queryFn: () => marksGridApi.getGrid(sessionId, classId, sectionId),
    enabled: !!sessionId && !!classId,
    staleTime: 30_000,
    refetchInterval: 120_000,
  });
}

export function useBulkSaveMarks(sessionId: string, classId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entries: CellUpdate[]) =>
      marksGridApi.bulkSave(sessionId, classId, entries),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marks-grid', sessionId, classId] });
    },
  });
}

export function useUpdateMarkCell(sessionId: string, classId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CellUpdate) =>
      marksGridApi.updateCell(sessionId, classId, data),
    onMutate: async (newData) => {
      const key = ['marks-grid', sessionId, classId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old: MarksGridData | undefined) => {
        if (!old) return old;
        return {
          ...old,
          entries: old.entries.map((e) =>
            e.enrollment_id === newData.enrollment_id &&
            e.subject_id === newData.subject_id &&
            e.component_id === newData.component_id
              ? { ...e, ...newData }
              : e
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _newData, context) => {
      queryClient.setQueryData(['marks-grid', sessionId, classId], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['marks-grid', sessionId, classId] });
    },
  });
}
