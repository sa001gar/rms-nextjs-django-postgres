'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { templatesApi } from '@/lib/api/templates';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import { Plus, Trash2, Star, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { ReportCardTemplate } from '@/types/template';

export default function ReportTemplatesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReportCardTemplate | null>(null);
  const [defaultTarget, setDefaultTarget] = useState<ReportCardTemplate | null>(null);
  const [newName, setNewName] = useState('');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['report-templates'],
    queryFn: templatesApi.getAll,
  });

  const createTemplate = useMutation({
    mutationFn: (data: Partial<ReportCardTemplate>) => templatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      toast.success('Template created');
      setModalOpen(false);
      setNewName('');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create template'),
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      toast.success('Template deleted');
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete template'),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => templatesApi.update(id, { is_default: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      toast.success('Default template updated');
      setDefaultTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to set default template'),
  });

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.error('Template name is required');
      return;
    }
    createTemplate.mutate({ name: newName.trim() });
  };

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Card Templates"
        description="Manage report card layout templates"
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Add Template
          </Button>
        }
      />

      {templates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            No report card templates yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {template.is_default && (
                      <Badge variant="success">
                        <Star className="h-3 w-3 mr-1" /> Default
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                <div className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{template.sections?.length ?? 0}</span> section{(template.sections?.length ?? 0) !== 1 ? 's' : ''}
                </div>

                {template.assignments && template.assignments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {template.assignments.map((a) => (
                      <Badge key={a.id} variant="secondary" className="text-xs">
                        {a.class_id ? `Class ${a.class_id}` : 'All Classes'}
                        {a.session_id ? ` · ${a.session_id}` : ''}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-auto pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/report-templates/${template.id}/builder/`)}
                  >
                    <Eye className="h-4 w-4" /> Edit
                  </Button>
                  {!template.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDefaultTarget(template)}
                    >
                      <Star className="h-4 w-4" /> Set Default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="ml-auto text-red-500"
                    onClick={() => setDeleteTarget(template)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setNewName(''); }} title="Add Template" size="sm">
        <div className="p-6 space-y-4">
          <Input
            label="Template Name"
            placeholder="e.g. Standard Report Card"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setModalOpen(false); setNewName(''); }}>Cancel</Button>
            <Button onClick={handleCreate} isLoading={createTemplate.isPending}>Create</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteTemplate.mutate(deleteTarget.id)}
        title="Delete Template"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
      />

      <ConfirmDialog
        isOpen={!!defaultTarget}
        onClose={() => setDefaultTarget(null)}
        onConfirm={() => defaultTarget && setDefaultMutation.mutate(defaultTarget.id)}
        title="Set as Default"
        message={`Set "${defaultTarget?.name}" as the default report card template?`}
        confirmLabel="Set Default"
        confirmVariant="default"
      />
    </div>
  );
}
