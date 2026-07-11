'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSessions } from '@/hooks/use-sessions';
import { termsApi, examsApi } from '@/lib/api/exams';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { DynamicDataTable } from '@/components/dynamic/data-table';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { ColumnConfig } from '@/components/dynamic/data-table';
import type { Term, Exam } from '@/types/exam';

export default function ExamsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  const termForm = useForm<{ name: string; display_order: number }>({
    defaultValues: { name: '', display_order: 0 },
  });

  const examForm = useForm<{ name: string; display_order: number }>({
    defaultValues: { name: '', display_order: 0 },
  });

  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  const { data: terms = [], isLoading: termsLoading } = useQuery({
    queryKey: ['terms', selectedSessionId],
    queryFn: () => termsApi.getAll(selectedSessionId),
    enabled: !!selectedSessionId,
  });

  const { data: allExams = [], isLoading: examsLoading } = useQuery({
    queryKey: ['exams', selectedSessionId],
    queryFn: () => examsApi.getAll(selectedSessionId),
    enabled: !!selectedSessionId,
  });

  const filteredExams = allExams.filter((e) => e.term === selectedTermId);

  const createTerm = useMutation({
    mutationFn: (data: { name: string; display_order: number }) =>
      termsApi.create({ ...data, session: selectedSessionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms', selectedSessionId] });
      toast.success('Term created');
      setTermModalOpen(false);
      termForm.reset();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create term'),
  });

  const updateTerm = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Term> }) => termsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms', selectedSessionId] });
      toast.success('Term updated');
      setTermModalOpen(false);
      setEditingTerm(null);
      termForm.reset();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update term'),
  });

  const deleteTerm = useMutation({
    mutationFn: (id: string) => termsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms', selectedSessionId] });
      if (selectedTermId) setSelectedTermId('');
      toast.success('Term deleted');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete term'),
  });

  const createExam = useMutation({
    mutationFn: (data: { name: string; display_order: number }) =>
      examsApi.create({ ...data, term: selectedTermId, session: selectedSessionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', selectedSessionId] });
      toast.success('Exam created');
      setExamModalOpen(false);
      examForm.reset();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create exam'),
  });

  const updateExam = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Exam> }) => examsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', selectedSessionId] });
      toast.success('Exam updated');
      setExamModalOpen(false);
      setEditingExam(null);
      examForm.reset();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update exam'),
  });

  const deleteExam = useMutation({
    mutationFn: (id: string) => examsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', selectedSessionId] });
      toast.success('Exam deleted');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete exam'),
  });

  const handleTermSubmit = termForm.handleSubmit((data) => {
    if (editingTerm) {
      updateTerm.mutate({ id: editingTerm.id, data });
    } else {
      createTerm.mutate(data);
    }
  });

  const handleExamSubmit = examForm.handleSubmit((data) => {
    if (editingExam) {
      updateExam.mutate({ id: editingExam.id, data });
    } else {
      createExam.mutate(data);
    }
  });

  const openTermModal = (term?: Term) => {
    setEditingTerm(term ?? null);
    termForm.reset({ name: term?.name ?? '', display_order: term?.display_order ?? 0 });
    setTermModalOpen(true);
  };

  const openExamModal = (exam?: Exam) => {
    setEditingExam(exam ?? null);
    examForm.reset({ name: exam?.name ?? '', display_order: exam?.display_order ?? 0 });
    setExamModalOpen(true);
  };

  const termColumns: ColumnConfig<Term>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'display_order', header: 'Order', sortable: true, width: '80px' },
  ];

  const examColumns: ColumnConfig<Exam>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'display_order', header: 'Order', sortable: true, width: '80px' },
    {
      key: 'components',
      header: 'Components',
      width: '100px',
      render: (row) => <Badge variant="secondary">{row.components?.length ?? 0}</Badge>,
    },
  ];

  if (sessionsLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exams"
        description="Manage terms and exams"
      />

      <div className="max-w-xs">
        <Select
          label="Session"
          placeholder="Select a session"
          options={sessions.map((s) => ({ value: s.id, label: s.name }))}
          value={selectedSessionId}
          onChange={(e) => {
            setSelectedSessionId(e.target.value);
            setSelectedTermId('');
          }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <DynamicDataTable
              columns={termColumns}
              data={terms}
              isLoading={termsLoading}
              emptyMessage="No terms found for this session."
              onRowClick={(term) => setSelectedTermId(term.id === selectedTermId ? '' : term.id)}
              onAdd={() => openTermModal()}
              onEdit={(term) => openTermModal(term)}
              onDelete={(term) => deleteTerm.mutate(term.id)}
              addLabel="Add Term"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exams</CardTitle>
          </CardHeader>
          <CardContent>
            <DynamicDataTable
              columns={examColumns}
              data={filteredExams}
              isLoading={examsLoading}
              emptyMessage={selectedTermId ? 'No exams for this term.' : 'Select a term to view exams.'}
              onRowClick={(exam) => router.push(`/admin/exams/${exam.id}`)}
              onAdd={() => openExamModal()}
              onEdit={(exam) => openExamModal(exam)}
              onDelete={(exam) => deleteExam.mutate(exam.id)}
              addLabel="Add Exam"
            />
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={termModalOpen}
        onClose={() => { setTermModalOpen(false); setEditingTerm(null); }}
        title={editingTerm ? 'Edit Term' : 'Add Term'}
        size="md"
      >
        <form onSubmit={handleTermSubmit} className="p-6 space-y-4">
          <Input
            label="Name"
            placeholder="e.g. Term 1"
            error={termForm.formState.errors.name?.message}
            {...termForm.register('name', { required: 'Name is required' })}
          />
          <Input
            label="Display Order"
            type="number"
            error={termForm.formState.errors.display_order?.message}
            {...termForm.register('display_order', { valueAsNumber: true })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { setTermModalOpen(false); setEditingTerm(null); }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createTerm.isPending || updateTerm.isPending}>
              {editingTerm ? 'Update Term' : 'Create Term'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={examModalOpen}
        onClose={() => { setExamModalOpen(false); setEditingExam(null); }}
        title={editingExam ? 'Edit Exam' : 'Add Exam'}
        size="md"
      >
        <form onSubmit={handleExamSubmit} className="p-6 space-y-4">
          <Input
            label="Name"
            placeholder="e.g. Midterm"
            error={examForm.formState.errors.name?.message}
            {...examForm.register('name', { required: 'Name is required' })}
          />
          <Input
            label="Display Order"
            type="number"
            error={examForm.formState.errors.display_order?.message}
            {...examForm.register('display_order', { valueAsNumber: true })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { setExamModalOpen(false); setEditingExam(null); }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createExam.isPending || updateExam.isPending}>
              {editingExam ? 'Update Exam' : 'Create Exam'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
