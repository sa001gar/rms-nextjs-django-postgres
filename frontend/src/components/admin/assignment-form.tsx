'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { useSessions } from '@/hooks/use-sessions';
import { useClasses, useSections } from '@/hooks/use-classes';
import { useSubjects } from '@/hooks/use-subjects';
import { useTeachers } from '@/hooks/use-teachers';
import api from '@/lib/api/client';
import { Plus, Trash2, UserPlus, Users } from 'lucide-react';

const assignmentSchema = z.object({
  teacher: z.string().min(1, 'Teacher is required'),
  class_ref: z.string().min(1, 'Class is required'),
  section: z.string().min(1, 'Section is required'),
  subject: z.string().min(1, 'Subject is required'),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

interface TeacherAssignment {
  id: string;
  teacher: string;
  teacher_name: string;
  class_ref: string;
  class_name: string;
  section: string;
  section_name: string;
  subject: string;
  subject_name: string;
  session: string;
  is_active: boolean;
}

export function AssignmentForm() {
  const queryClient = useQueryClient();
  const { data: sessions = [] } = useSessions();
  const { data: classes = [] } = useClasses();
  const { data: subjects = [] } = useSubjects();
  const { data: teachers = [] } = useTeachers();

  const activeSession = sessions.find((s: any) => s.is_active);
  const [selectedSession, setSelectedSession] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeacherAssignment | null>(null);
  const [selectedClass, setSelectedClass] = useState('');

  const sessionId = selectedSession || activeSession?.id || '';

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['teacher-assignments', sessionId],
    queryFn: () => api.get('/academics/teacher-assignments/', { session_id: sessionId }),
    enabled: !!sessionId,
  });

  const assignmentList: TeacherAssignment[] = Array.isArray(assignments) ? assignments : (assignments as any)?.results || [];

  const createMutation = useMutation({
    mutationFn: (data: AssignmentFormData) =>
      api.post('/academics/teacher-assignments/', {
        teacher_id: data.teacher,
        class_id: data.class_ref,
        section_id: data.section,
        subject_id: data.subject,
        session_id: sessionId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
      toast.success('Assignment created');
      setShowCreateModal(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create assignment'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/academics/teacher-assignments/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
      toast.success('Assignment removed');
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to remove assignment'),
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      teacher: '',
      class_ref: '',
      section: '',
      subject: '',
    }
  });

  const watchClass = watch('class_ref');
  const { data: sections = [] } = useSections(watchClass);

  const onSubmit = (data: AssignmentFormData) => {
    createMutation.mutate(data);
  };

  const handleCreate = () => {
    reset({
      teacher: '',
      class_ref: '',
      section: '',
      subject: '',
    });
    setShowCreateModal(true);
  };

  if (!activeSession) {
    return (
      <div className="space-y-6">
        <PageHeader title="Teacher Assignments" description="Assign teachers to classes and subjects" />
        <EmptyState title="No active session" description="Please activate a session first" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teacher Assignments"
        description="Assign teachers to classes and subjects"
        actions={<Button onClick={handleCreate}><UserPlus className="h-4 w-4 mr-2" />Assign Teacher</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Session"
          value={selectedSession || activeSession?.id || ''}
          onChange={(e) => setSelectedSession(e.target.value)}
          options={sessions.map((s: any) => ({ value: s.id, label: s.name }))}
        />
      </div>

      {isLoading ? (
        <Loading message="Loading assignments..." />
      ) : assignmentList.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No assignments yet"
          description="Assign teachers to classes and subjects for this session"
          action={{ label: 'Assign Teacher', onClick: handleCreate }}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Assigned Teachers ({assignmentList.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignmentList.map((a: TeacherAssignment) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.teacher_name || a.teacher}</TableCell>
                    <TableCell>{a.class_name || a.class_ref}</TableCell>
                    <TableCell>{a.section_name || a.section}</TableCell>
                    <TableCell>
                      <Badge variant="info">{a.subject_name || a.subject}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteTarget(a)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Assign Teacher" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <Select
            label="Teacher"
            placeholder="Select teacher"
            options={teachers.map((t: any) => ({ value: t.id, label: t.name || t.user_email }))}
            error={errors.teacher?.message}
            {...register('teacher')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Class"
              placeholder="Select class"
              options={classes.map((c: any) => ({ value: c.id, label: c.name }))}
              error={errors.class_ref?.message}
              {...register('class_ref')}
            />
            <Select
              label="Section"
              placeholder={!watchClass ? "Select a class" : sections.length === 0 ? "No sections" : "Select section"}
              options={sections.map((s: any) => ({ value: s.id, label: s.name }))}
              error={errors.section?.message}
              {...register('section')}
              disabled={!watchClass || sections.length === 0}
            />
          </div>
          <Select
            label="Subject"
            placeholder="Select subject"
            options={subjects.map((s: any) => ({ value: s.id, label: `${s.code} - ${s.name}` }))}
            error={errors.subject?.message}
            {...register('subject')}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Assign Teacher
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Remove Assignment"
        message={`Remove ${deleteTarget?.teacher_name || 'this teacher'} from ${deleteTarget?.class_name || ''} ${deleteTarget?.section_name || ''} ${deleteTarget?.subject_name || ''}?`}
        confirmLabel="Remove"
        confirmVariant="destructive"
      />
    </div>
  );
}
