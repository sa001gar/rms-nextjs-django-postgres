'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { examsApi, examComponentsApi } from '@/lib/api/exams';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Modal } from '@/components/ui/modal';
import { DynamicDataTable } from '@/components/dynamic/data-table';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import { ArrowLeft, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { ColumnConfig } from '@/components/dynamic/data-table';
import type { ExamComponent } from '@/types/exam';

const valueTypeConfig: Record<string, { label: string; variant: 'info' | 'success' | 'secondary' }> = {
  numeric: { label: 'Numeric', variant: 'info' },
  grade: { label: 'Grade', variant: 'success' },
  descriptive: { label: 'Descriptive', variant: 'secondary' },
};

const valueTypeOptions = [
  { value: 'numeric', label: 'Numeric' },
  { value: 'grade', label: 'Grade' },
  { value: 'descriptive', label: 'Descriptive' },
];

export default function ExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const examId = params.examId as string;

  const [compModalOpen, setCompModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<ExamComponent | null>(null);

  const compForm = useForm<{
    name: string;
    code: string;
    value_type: string;
    full_marks: number | null;
    display_order: number;
    is_optional: boolean;
    parent: string;
  }>({
    defaultValues: {
      name: '',
      code: '',
      value_type: 'numeric',
      full_marks: null,
      display_order: 0,
      is_optional: false,
      parent: '',
    },
  });

  const { data: exam, isLoading: examLoading } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => examsApi.get(examId),
    enabled: !!examId,
  });

  const { data: components = [], isLoading: componentsLoading } = useQuery({
    queryKey: ['exam-components', examId],
    queryFn: () => examComponentsApi.getAll(examId),
    enabled: !!examId,
  });

  const createComp = useMutation({
    mutationFn: (data: Partial<ExamComponent>) => examComponentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-components', examId] });
      queryClient.invalidateQueries({ queryKey: ['exam', examId] });
      toast.success('Component created');
      setCompModalOpen(false);
      compForm.reset();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create component'),
  });

  const updateComp = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExamComponent> }) => examComponentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-components', examId] });
      queryClient.invalidateQueries({ queryKey: ['exam', examId] });
      toast.success('Component updated');
      setCompModalOpen(false);
      setEditingComp(null);
      compForm.reset();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update component'),
  });

  const deleteComp = useMutation({
    mutationFn: (id: string) => examComponentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-components', examId] });
      queryClient.invalidateQueries({ queryKey: ['exam', examId] });
      toast.success('Component deleted');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete component'),
  });

  const handleCompSubmit = compForm.handleSubmit((data) => {
    const payload: Partial<ExamComponent> = {
      exam: examId,
      name: data.name,
      code: data.code,
      value_type: data.value_type as 'numeric' | 'grade' | 'descriptive',
      full_marks: data.full_marks,
      display_order: data.display_order,
      is_optional: data.is_optional,
      parent: data.parent || null,
    };
    if (editingComp) {
      updateComp.mutate({ id: editingComp.id, data: payload });
    } else {
      createComp.mutate(payload);
    }
  });

  const openCompModal = (comp?: ExamComponent) => {
    setEditingComp(comp ?? null);
    compForm.reset({
      name: comp?.name ?? '',
      code: comp?.code ?? '',
      value_type: comp?.value_type ?? 'numeric',
      full_marks: comp?.full_marks ?? null,
      display_order: comp?.display_order ?? 0,
      is_optional: comp?.is_optional ?? false,
      parent: comp?.parent ?? '',
    });
    setCompModalOpen(true);
  };

  const parentOptions = components
    .filter((c) => (editingComp ? c.id !== editingComp.id : true))
    .map((c) => ({ value: c.id, label: c.name }));

  const columns: ColumnConfig<ExamComponent>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'code', header: 'Code', sortable: true },
    {
      key: 'value_type',
      header: 'Value Type',
      width: '120px',
      render: (row) => {
        const cfg = valueTypeConfig[row.value_type] ?? { label: row.value_type, variant: 'secondary' as const };
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'full_marks',
      header: 'Full Marks',
      width: '100px',
      render: (row) => <span>{row.full_marks ?? '-'}</span>,
    },
    {
      key: 'display_order',
      header: 'Order',
      sortable: true,
      width: '80px',
    },
    {
      key: 'is_optional',
      header: 'Optional',
      width: '80px',
      render: (row) => (row.is_optional ? <Badge variant="warning">Yes</Badge> : <Badge variant="secondary">No</Badge>),
    },
    {
      key: 'parent',
      header: 'Parent',
      render: (row) => {
        const parent = components.find((c) => c.id === row.parent);
        return <span>{parent?.name ?? '-'}</span>;
      },
    },
  ];

  if (examLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={exam?.name ?? 'Exam Detail'}
        description="Manage exam components"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/exams')}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        }
      />

      <DynamicDataTable
        columns={columns}
        data={components}
        isLoading={componentsLoading}
        emptyMessage="No components defined for this exam."
        onAdd={() => openCompModal()}
        onEdit={(comp) => openCompModal(comp)}
        onDelete={(comp) => deleteComp.mutate(comp.id)}
        addLabel="Add Component"
      />

      <Modal
        isOpen={compModalOpen}
        onClose={() => { setCompModalOpen(false); setEditingComp(null); }}
        title={editingComp ? 'Edit Component' : 'Add Component'}
        size="lg"
      >
        <form onSubmit={handleCompSubmit} className="p-6 space-y-4">
          <Input
            label="Name"
            placeholder="e.g. Written Exam"
            error={compForm.formState.errors.name?.message}
            {...compForm.register('name', { required: 'Name is required' })}
          />
          <Input
            label="Code"
            placeholder="e.g. WRITTEN"
            error={compForm.formState.errors.code?.message}
            {...compForm.register('code', { required: 'Code is required' })}
          />
          <Select
            label="Value Type"
            options={valueTypeOptions}
            value={compForm.watch('value_type')}
            onChange={(e) => compForm.setValue('value_type', e.target.value)}
          />
          <Input
            label="Full Marks"
            type="number"
            placeholder="Optional"
            {...compForm.register('full_marks', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
          />
          <Input
            label="Display Order"
            type="number"
            {...compForm.register('display_order', { valueAsNumber: true })}
          />
          <Checkbox
            label="Optional"
            checked={compForm.watch('is_optional')}
            onChange={(checked) => compForm.setValue('is_optional', checked)}
          />
          <Select
            label="Parent Component"
            placeholder="None (top-level)"
            options={parentOptions}
            value={compForm.watch('parent')}
            onChange={(e) => compForm.setValue('parent', e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { setCompModalOpen(false); setEditingComp(null); }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createComp.isPending || updateComp.isPending}>
              {editingComp ? 'Update Component' : 'Create Component'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
