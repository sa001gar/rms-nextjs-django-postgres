import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classesApi } from '@/lib/api/classes';
import type { Class } from '@/types';
import { queryKeys } from './use-sessions';

export function useClasses() {
  return useQuery({
    queryKey: queryKeys.classes,
    queryFn: classesApi.getAll,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSections(classId: string) {
  return useQuery({
    queryKey: queryKeys.sections(classId),
    queryFn: () => classesApi.getSections(classId),
    enabled: !!classId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Class>) => classesApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.classes }),
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Class> }) => classesApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.classes }),
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => classesApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.classes }),
  });
}

export function useCreateSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; class_id: string }) => classesApi.createSection(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.classes }),
  });
}

export function useDeleteSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, id }: { classId: string; id: string }) => classesApi.deleteSection(classId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.classes }),
  });
}
