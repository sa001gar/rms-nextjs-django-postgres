'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api/client';
import type { GradePolicy } from '@/types/academic';

const gradeSchema = z.object({
  grade_label: z.string().min(1, 'Grade label is required'),
  min_percentage: z.coerce
    .number()
    .min(0, 'Min must be at least 0')
    .max(100, 'Max cannot exceed 100'),
  max_percentage: z.coerce
    .number()
    .min(0, 'Min must be at least 0')
    .max(100, 'Max cannot exceed 100'),
  grade_point: z.coerce
    .number()
    .min(0, 'Min is 0')
    .max(4, 'Max is 4'),
  display_order: z.coerce
    .number()
    .int('Must be a whole number'),
}).refine((data) => data.min_percentage < data.max_percentage, {
  message: 'Min percentage must be less than max percentage',
  path: ['max_percentage'],
});

type GradeFormData = z.infer<typeof gradeSchema>;

export function GradingConfig() {
  const [policies, setPolicies] = useState<GradePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GradePolicy | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GradeFormData>({
    resolver: zodResolver(gradeSchema) as any,
    defaultValues: {
      grade_label: '',
      min_percentage: 0,
      max_percentage: 100,
      grade_point: 0,
      display_order: 0,
    },
  });

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<GradePolicy[]>('/academics/grade-policies/');
      setPolicies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load grade policies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const openAddModal = () => {
    setEditingId(null);
    reset({ grade_label: '', min_percentage: 0, max_percentage: 100, grade_point: 0, display_order: 0 });
    setModalOpen(true);
  };

  const openEditModal = (policy: GradePolicy) => {
    setEditingId(policy.id);
    reset({
      grade_label: policy.grade_label,
      min_percentage: policy.min_percentage,
      max_percentage: policy.max_percentage,
      grade_point: policy.grade_point,
      display_order: policy.display_order,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: GradeFormData) => {
    try {
      setSubmitting(true);
      if (editingId) {
        await api.put(`/academics/grade-policies/${editingId}/`, data);
      } else {
        await api.post('/academics/grade-policies/', data);
      }
      setModalOpen(false);
      await fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save grade policy');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/academics/grade-policies/${deleteTarget.id}/`);
      setDeleteTarget(null);
      await fetchPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete grade policy');
    }
  };

  const sortedPolicies = [...policies].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grade Policy"
        description="Configure grading rules and boundaries"
        actions={
          <Button onClick={openAddModal}>
            <Plus className="h-4 w-4" />
            Add Grade
          </Button>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <Button variant="ghost" size="sm" className="ml-2" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Grade Boundaries</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            </div>
          ) : sortedPolicies.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No grade policies configured yet.</p>
              <Button variant="outline" className="mt-4" onClick={openAddModal}>
                <Plus className="h-4 w-4" />
                Add Your First Grade
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade Label</TableHead>
                  <TableHead>Min %</TableHead>
                  <TableHead>Max %</TableHead>
                  <TableHead>Grade Point</TableHead>
                  <TableHead>Display Order</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPolicies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell className="font-medium">{policy.grade_label}</TableCell>
                    <TableCell>{policy.min_percentage}%</TableCell>
                    <TableCell>{policy.max_percentage}%</TableCell>
                    <TableCell>{policy.grade_point}</TableCell>
                    <TableCell>{policy.display_order}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditModal(policy)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteTarget(policy)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Grade Policy' : 'Add Grade Policy'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <Input
            label="Grade Label"
            placeholder="e.g., A+"
            error={errors.grade_label?.message}
            {...register('grade_label')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Percentage"
              type="number"
              min={0}
              max={100}
              step={0.01}
              error={errors.min_percentage?.message}
              {...register('min_percentage')}
            />
            <Input
              label="Max Percentage"
              type="number"
              min={0}
              max={100}
              step={0.01}
              error={errors.max_percentage?.message}
              {...register('max_percentage')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Grade Point"
              type="number"
              min={0}
              max={4}
              step={0.1}
              error={errors.grade_point?.message}
              {...register('grade_point')}
            />
            <Input
              label="Display Order"
              type="number"
              step={1}
              error={errors.display_order?.message}
              {...register('display_order')}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              {editingId ? 'Update' : 'Add'} Grade
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Grade Policy"
        message={`Are you sure you want to delete grade "${deleteTarget?.grade_label}"? This action cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
