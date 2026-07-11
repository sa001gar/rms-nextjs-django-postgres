'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessions } from '@/hooks/use-sessions';
import { promotionRulesApi } from '@/lib/api/grading';
import { classesApi } from '@/lib/api/classes';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DynamicDataTable } from '@/components/dynamic/data-table';
import { Loading } from '@/components/ui/loading';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnConfig } from '@/components/dynamic/data-table';
import type { PromotionRule } from '@/types/exam';

interface PromotionRuleForm {
  from_class: string;
  to_class: string;
  min_percentage: number;
  max_subjects_fail: number;
}

const defaultForm: PromotionRuleForm = {
  from_class: '',
  to_class: '',
  min_percentage: 40,
  max_subjects_fail: 2,
};

export default function PromotionRulesPage() {
  const queryClient = useQueryClient();
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PromotionRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromotionRule | null>(null);
  const [form, setForm] = useState<PromotionRuleForm>(defaultForm);

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: classesApi.getAll,
  });

  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['promotion-rules', selectedSessionId],
    queryFn: () => promotionRulesApi.getAll(selectedSessionId),
    enabled: !!selectedSessionId,
  });

  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  const createRule = useMutation({
    mutationFn: (data: Partial<PromotionRule>) =>
      promotionRulesApi.create({ ...data, session: selectedSessionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotion-rules', selectedSessionId] });
      toast.success('Promotion rule created');
      closeModal();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create rule'),
  });

  const updateRule = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PromotionRule> }) =>
      promotionRulesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotion-rules', selectedSessionId] });
      toast.success('Promotion rule updated');
      closeModal();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update rule'),
  });

  const deleteRule = useMutation({
    mutationFn: (id: string) => promotionRulesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotion-rules', selectedSessionId] });
      toast.success('Promotion rule deleted');
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete rule'),
  });

  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }));

  const openAddModal = () => {
    setEditingRule(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEditModal = (rule: PromotionRule) => {
    setEditingRule(rule);
    setForm({
      from_class: rule.from_class,
      to_class: rule.to_class,
      min_percentage: rule.min_percentage,
      max_subjects_fail: rule.max_subjects_fail,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRule(null);
    setForm(defaultForm);
  };

  const handleSubmit = () => {
    if (!form.from_class || !form.to_class) {
      toast.error('Please select both from and to classes');
      return;
    }
    const data: Partial<PromotionRule> = {
      from_class: form.from_class,
      to_class: form.to_class,
      min_percentage: form.min_percentage,
      max_subjects_fail: form.max_subjects_fail,
    };
    if (editingRule) {
      updateRule.mutate({ id: editingRule.id, data });
    } else {
      createRule.mutate(data);
    }
  };

  const columns: ColumnConfig<PromotionRule>[] = [
    { key: 'from_class_name', header: 'From Class', sortable: true },
    { key: 'to_class_name', header: 'To Class', sortable: true },
    { key: 'min_percentage', header: 'Min %', sortable: true },
    { key: 'max_subjects_fail', header: 'Max Subjects Fail', sortable: true },
    { key: 'session_name', header: 'Session', sortable: true },
  ];

  if (sessionsLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promotion Rules"
        description="Configure rules for student promotion between classes"
      />

      <Card>
        <CardContent className="p-4">
          <div className="max-w-xs">
            <Select
              label="Session"
              placeholder="Select a session"
              options={sessions.map((s) => ({ value: s.id, label: s.name }))}
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <DynamicDataTable
            columns={columns}
            data={rules}
            isLoading={rulesLoading}
            emptyMessage="No promotion rules for this session."
            onAdd={openAddModal}
            onEdit={openEditModal}
            onDelete={(rule) => setDeleteTarget(rule)}
            addLabel="Add Rule"
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingRule ? 'Edit Promotion Rule' : 'Add Promotion Rule'}
        size="md"
      >
        <div className="p-6 space-y-4">
          <Select
            label="From Class"
            placeholder="Select class"
            options={classOptions}
            value={form.from_class}
            onChange={(e) => setForm((prev) => ({ ...prev, from_class: e.target.value }))}
          />
          <Select
            label="To Class"
            placeholder="Select class"
            options={classOptions}
            value={form.to_class}
            onChange={(e) => setForm((prev) => ({ ...prev, to_class: e.target.value }))}
          />
          <Input
            label="Minimum Percentage"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={form.min_percentage}
            onChange={(e) => setForm((prev) => ({ ...prev, min_percentage: Number(e.target.value) }))}
          />
          <Input
            label="Max Subjects Fail"
            type="number"
            min={0}
            step={1}
            value={form.max_subjects_fail}
            onChange={(e) => setForm((prev) => ({ ...prev, max_subjects_fail: Number(e.target.value) }))}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              isLoading={createRule.isPending || updateRule.isPending}
            >
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteRule.mutate(deleteTarget.id)}
        title="Delete Promotion Rule"
        message={`Delete promotion rule from "${deleteTarget?.from_class_name}" to "${deleteTarget?.to_class_name}"?`}
        confirmLabel="Delete"
      />
    </div>
  );
}
