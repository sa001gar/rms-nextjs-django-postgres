'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessions } from '@/hooks/use-sessions';
import { gradePolicySetsApi, gradePolicyGradesApi } from '@/lib/api/grading';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { DynamicDataTable } from '@/components/dynamic/data-table';
import { Loading } from '@/components/ui/loading';
import { Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnConfig } from '@/components/dynamic/data-table';
import type { GradePolicySet, GradePolicyGrade } from '@/types/exam';

export default function GradingPage() {
  const queryClient = useQueryClient();
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [newSetSession, setNewSetSession] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<GradePolicySet | null>(null);
  const [gradeEdits, setGradeEdits] = useState<Record<string, Partial<GradePolicyGrade>>>({});
  const [newGradeRows, setNewGradeRows] = useState<Partial<GradePolicyGrade>[]>([]);

  const { data: sets = [], isLoading: setsLoading } = useQuery({
    queryKey: ['grade-policy-sets', selectedSessionId],
    queryFn: () => gradePolicySetsApi.getAll(selectedSessionId),
    enabled: !!selectedSessionId,
  });

  const selectedSet = sets.find((s) => s.id === selectedSetId) ?? null;

  const createSet = useMutation({
    mutationFn: (data: { name: string; session?: string }) =>
      gradePolicySetsApi.create({ ...data, grades: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-policy-sets', selectedSessionId] });
      toast.success('Grade policy set created');
      setAddModalOpen(false);
      setNewSetName('');
      setNewSetSession('');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create set'),
  });

  const deleteSet = useMutation({
    mutationFn: (id: string) => gradePolicySetsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-policy-sets', selectedSessionId] });
      if (selectedSetId === deleteTarget?.id) setSelectedSetId(null);
      toast.success('Grade policy set deleted');
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete set'),
  });

  const updateGrade = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GradePolicyGrade> }) =>
      gradePolicyGradesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-policy-sets', selectedSessionId] });
      toast.success('Grade updated');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update grade'),
  });

  const createGrade = useMutation({
    mutationFn: (data: Partial<GradePolicyGrade>) =>
      gradePolicyGradesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-policy-sets', selectedSessionId] });
      toast.success('Grade added');
      setNewGradeRows([]);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to add grade'),
  });

  const deleteGrade = useMutation({
    mutationFn: (id: string) => gradePolicyGradesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-policy-sets', selectedSessionId] });
      toast.success('Grade deleted');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete grade'),
  });

  const handleGradeEdit = (gradeId: string, field: keyof GradePolicyGrade, value: string | number) => {
    setGradeEdits((prev) => ({
      ...prev,
      [gradeId]: { ...prev[gradeId], [field]: value },
    }));
  };

  const handleSaveGrade = (grade: GradePolicyGrade) => {
    const edits = gradeEdits[grade.id];
    if (!edits) return;
    updateGrade.mutate({ id: grade.id, data: edits });
    setGradeEdits((prev) => {
      const next = { ...prev };
      delete next[grade.id];
      return next;
    });
  };

  const handleAddGrade = () => {
    if (!selectedSetId) return;
    const blank: Partial<GradePolicyGrade> = {
      grade_policy_set: selectedSetId,
      grade_label: '',
      min_percentage: 0,
      max_percentage: 100,
      grade_point: 0,
      display_order: (selectedSet?.grades?.length ?? 0) + newGradeRows.length + 1,
    };
    setNewGradeRows((prev) => [...prev, blank]);
  };

  const handleNewGradeChange = (index: number, field: keyof GradePolicyGrade, value: string | number) => {
    setNewGradeRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSaveNewGrade = (index: number) => {
    const row = newGradeRows[index];
    if (!row.grade_label?.trim()) {
      toast.error('Grade label is required');
      return;
    }
    createGrade.mutate(row);
  };

  const handleRemoveNewGrade = (index: number) => {
    setNewGradeRows((prev) => prev.filter((_, i) => i !== index));
  };

  const gradeValue = (grade: GradePolicyGrade, field: keyof GradePolicyGrade) => {
    if (gradeEdits[grade.id]?.[field] !== undefined) return gradeEdits[grade.id][field];
    return grade[field];
  };

  const setsColumns: ColumnConfig<GradePolicySet>[] = [
    { key: 'name', header: 'Name', sortable: true },
    {
      key: 'session',
      header: 'Session',
      render: (row) => {
        const session = sessions.find((s) => s.id === row.session);
        return session?.name ?? '-';
      },
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'secondary'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  const sessionOptions = sessions.map((s) => ({ value: s.id, label: s.name }));

  const handleAddSet = () => {
    createSet.mutate({ name: newSetName, session: newSetSession || selectedSessionId });
  };

  if (sessionsLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grade Policy Sets"
        description="Manage grade policy sets and their grade boundaries"
      />

      <div className="max-w-xs">
        <Select
          label="Session"
          placeholder="Select a session"
          options={sessionOptions}
          value={selectedSessionId}
          onChange={(e) => {
            setSelectedSessionId(e.target.value);
            setSelectedSetId(null);
          }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Policy Sets</CardTitle>
          </CardHeader>
          <CardContent>
            <DynamicDataTable
              columns={setsColumns}
              data={sets}
              isLoading={setsLoading}
              emptyMessage="No policy sets for this session."
              onRowClick={(set) => {
                setSelectedSetId(set.id === selectedSetId ? null : set.id);
                setGradeEdits({});
                setNewGradeRows([]);
              }}
              onAdd={() => {
                setNewSetName('');
                setNewSetSession('');
                setAddModalOpen(true);
              }}
              onDelete={(set) => setDeleteTarget(set)}
              addLabel="Add Set"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedSet ? `Grades - ${selectedSet.name}` : 'Grades'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedSet ? (
              <div className="py-12 text-center text-gray-500">
                Select a policy set to view and manage its grades.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b border-gray-200">
                        <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">Grade Label</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">Min %</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">Max %</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">Grade Point</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-gray-500">Order</th>
                        <th className="h-12 px-4 text-center align-middle font-medium text-gray-500 w-[120px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSet.grades?.map((grade) => (
                        <tr key={grade.id} className="border-b border-gray-200 transition-colors hover:bg-gray-50">
                          <td className="p-2">
                            <Input
                              value={String(gradeValue(grade, 'grade_label'))}
                              onChange={(e) => handleGradeEdit(grade.id, 'grade_label', e.target.value)}
                              className="h-8"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              value={Number(gradeValue(grade, 'min_percentage'))}
                              onChange={(e) => handleGradeEdit(grade.id, 'min_percentage', Number(e.target.value))}
                              className="h-8 w-20"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              value={Number(gradeValue(grade, 'max_percentage'))}
                              onChange={(e) => handleGradeEdit(grade.id, 'max_percentage', Number(e.target.value))}
                              className="h-8 w-20"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min={0}
                              max={4}
                              step={0.1}
                              value={Number(gradeValue(grade, 'grade_point'))}
                              onChange={(e) => handleGradeEdit(grade.id, 'grade_point', Number(e.target.value))}
                              className="h-8 w-20"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step={1}
                              value={Number(gradeValue(grade, 'display_order'))}
                              onChange={(e) => handleGradeEdit(grade.id, 'display_order', Number(e.target.value))}
                              className="h-8 w-16"
                            />
                          </td>
                          <td className="p-2">
                            <div className="flex items-center justify-center gap-1">
                              {gradeEdits[grade.id] && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleSaveGrade(grade)}
                                  isLoading={updateGrade.isPending}
                                >
                                  <Save className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => deleteGrade.mutate(grade.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {newGradeRows.map((row, index) => (
                        <tr key={`new-${index}`} className="border-b border-gray-200 bg-amber-50">
                          <td className="p-2">
                            <Input
                              value={row.grade_label ?? ''}
                              onChange={(e) => handleNewGradeChange(index, 'grade_label', e.target.value)}
                              className="h-8"
                              placeholder="A+"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              value={row.min_percentage ?? 0}
                              onChange={(e) => handleNewGradeChange(index, 'min_percentage', Number(e.target.value))}
                              className="h-8 w-20"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              value={row.max_percentage ?? 100}
                              onChange={(e) => handleNewGradeChange(index, 'max_percentage', Number(e.target.value))}
                              className="h-8 w-20"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min={0}
                              max={4}
                              step={0.1}
                              value={row.grade_point ?? 0}
                              onChange={(e) => handleNewGradeChange(index, 'grade_point', Number(e.target.value))}
                              className="h-8 w-20"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              step={1}
                              value={row.display_order ?? 0}
                              onChange={(e) => handleNewGradeChange(index, 'display_order', Number(e.target.value))}
                              className="h-8 w-16"
                            />
                          </td>
                          <td className="p-2">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleSaveNewGrade(index)}
                                isLoading={createGrade.isPending}
                              >
                                <Save className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleRemoveNewGrade(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button onClick={handleAddGrade} variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                  Add Grade
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Grade Policy Set"
        size="md"
      >
        <div className="p-6 space-y-4">
          <Input
            label="Name"
            placeholder="e.g. Primary Grades"
            value={newSetName}
            onChange={(e) => setNewSetName(e.target.value)}
          />
          <Select
            label="Session"
            placeholder="Select session"
            options={sessionOptions}
            value={newSetSession || selectedSessionId}
            onChange={(e) => setNewSetSession(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSet} isLoading={createSet.isPending} disabled={!newSetName.trim()}>
              Create Set
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteSet.mutate(deleteTarget.id)}
        title="Delete Grade Policy Set"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will also remove all its grade entries.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
