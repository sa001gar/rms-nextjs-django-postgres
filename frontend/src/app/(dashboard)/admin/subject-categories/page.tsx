'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subjectCategoriesApi } from '@/lib/api/subject-categories';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { Plus, Pencil, Trash2, Layers } from 'lucide-react';
import { toast } from 'sonner';
import type { SubjectCategory } from '@/types';

export default function SubjectCategoriesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SubjectCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubjectCategory | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formIsScholastic, setFormIsScholastic] = useState(true);
  const [formDisplayOrder, setFormDisplayOrder] = useState(0);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['subject-categories'],
    queryFn: subjectCategoriesApi.getAll,
    staleTime: 10 * 60 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['subject-categories'] });

  const createMutation = useMutation({
    mutationFn: (data: Partial<SubjectCategory>) => subjectCategoriesApi.create(data),
    onSuccess: () => { invalidate(); toast.success('Subject category created'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SubjectCategory> }) => subjectCategoriesApi.update(id, data),
    onSuccess: () => { invalidate(); toast.success('Subject category updated'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => subjectCategoriesApi.delete(id),
    onSuccess: () => { invalidate(); toast.success('Subject category deleted'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditingItem(null);
    setFormName('');
    setFormCode('');
    setFormIsScholastic(true);
    setFormDisplayOrder(0);
    setIsModalOpen(true);
  };

  const openEdit = (item: SubjectCategory) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCode(item.code);
    setFormIsScholastic(item.is_scholastic);
    setFormDisplayOrder(item.display_order);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    const data = { name: formName, code: formCode, is_scholastic: formIsScholastic, display_order: formDisplayOrder };
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subject Categories"
        description="Manage subject categories (scholastic, co-scholastic, etc.)"
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> New Category</Button>}
      />
      {categories.length === 0 ? (
        <EmptyState icon={Layers} title="No subject categories" description="Create your first subject category" action={{ label: 'New Category', onClick: openCreate }} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Scholastic</TableHead>
                  <TableHead>Display Order</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.code}</TableCell>
                    <TableCell>
                      <Badge variant={c.is_scholastic ? 'success' : 'secondary'}>
                        {c.is_scholastic ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>{c.display_order}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(c)} className="text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? 'Edit Subject Category' : 'New Subject Category'} size="md">
        <div className="p-6 space-y-4">
          <Input label="Name" placeholder="e.g. Scholastic" value={formName} onChange={(e) => setFormName(e.target.value)} />
          <Input label="Code" placeholder="e.g. SCH" value={formCode} onChange={(e) => setFormCode(e.target.value)} />
          <Select
            label="Scholastic"
            options={[
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' },
            ]}
            value={formIsScholastic ? 'true' : 'false'}
            onChange={(e) => setFormIsScholastic(e.target.value === 'true')}
          />
          <Input label="Display Order" type="number" value={formDisplayOrder} onChange={(e) => setFormDisplayOrder(Number(e.target.value))} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} isLoading={createMutation.isPending || updateMutation.isPending}>
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Subject Category"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
