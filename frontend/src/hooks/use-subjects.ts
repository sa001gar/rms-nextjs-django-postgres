import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subjectsApi } from '@/lib/api/subjects';
import type { Subject } from '@/types';
import { queryKeys } from './use-sessions';

export function useSubjects() {
  return useQuery({
    queryKey: queryKeys.subjects,
    queryFn: subjectsApi.getAll,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Subject>) => subjectsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.subjects }),
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Subject> }) => subjectsApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.subjects }),
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subjectsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.subjects }),
  });
}

export function useSubjectAssignments(classId: string) {
  return useQuery({
    queryKey: ['subject-assignments', classId],
    queryFn: () => subjectsApi.getAssignments(classId),
    enabled: !!classId,
  });
}

export function useAssignSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { class_id: string; subject_id: string; is_required?: boolean; full_marks?: number }) => subjectsApi.assignToClass(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subject-assignments'] }),
  });
}

export function useUnassignSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { class_id: string; subject_id: string }) => subjectsApi.unassignFromClass(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subject-assignments'] }),
  });
}
