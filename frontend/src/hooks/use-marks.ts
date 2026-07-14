import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marksApi } from '@/lib/api/marks';
import type { MarksEntry } from '@/types/marks';
import { queryKeys } from './use-sessions';

type MarksFilters = Record<string, unknown>;

export function useMarks(filters?: MarksFilters) {
  return useQuery({
    queryKey: ['marks', filters],
    queryFn: () => marksApi.getAll(filters),
    staleTime: 30 * 1000,
  });
}

export function useCreateMark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof marksApi.create>[0]) => marksApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marks'] }),
  });
}

export function useUpdateMark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof marksApi.update>[1] }) =>
      marksApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['marks'] }),
  });
}

export function useBulkUpsertMarks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entries: Parameters<typeof marksApi.bulkUpsert>[0]) =>
      marksApi.bulkUpsert(entries),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marks'] });
      queryClient.invalidateQueries({ queryKey: ['results'] });
    },
  });
}
