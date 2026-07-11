'use client';

import { useState } from 'react';
import { useClasses, useCreateClass, useDeleteClass, useCreateSection, useDeleteSection, useSections } from '@/hooks/use-classes';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { GraduationCap, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

export default function ClassesPage() {
  const { data: classes = [], isLoading } = useClasses();
  const createClass = useCreateClass();
  const deleteClass = useDeleteClass();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const { data: sections = [] } = useSections(selectedClassId || '');
  const createSection = useCreateSection();
  const deleteSection = useDeleteSection();

  const classForm = useForm<{ name: string; level: number }>();
  const sectionForm = useForm<{ name: string }>();

  const onCreateClass = async (data: { name: string; level: number }) => {
    try {
      await createClass.mutateAsync(data);
      toast.success('Class created');
      setIsModalOpen(false);
      classForm.reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const onCreateSection = async (data: { name: string }) => {
    if (!selectedClassId) return;
    try {
      await createSection.mutateAsync({ name: data.name, class_id: selectedClassId });
      toast.success('Section added');
      sectionForm.reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm('Delete this class and all its sections?')) return;
    try {
      await deleteClass.mutateAsync(id);
      toast.success('Class deleted');
      setSelectedClassId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Delete this section?')) return;
    try {
      await deleteSection.mutateAsync({ classId: selectedClassId || '', id });
      toast.success('Section deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        description="Manage classes and sections"
        actions={<Button onClick={() => setIsModalOpen(true)}><Plus className="h-4 w-4" /> New Class</Button>}
      />
      {classes.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No classes" description="Create your first class" action={{ label: 'New Class', onClick: () => setIsModalOpen(true) }} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <div
              key={c.id}
              className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${selectedClassId === c.id ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-200 hover:border-gray-300'}`}
              onClick={() => setSelectedClassId(selectedClassId === c.id ? null : c.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{c.name}</h3>
                  <p className="text-sm text-gray-500">Level {c.level}</p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id); }} className="text-red-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {selectedClassId && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Sections</h3>
          <div className="flex gap-2 mb-4">
            <Input placeholder="Section name" {...sectionForm.register('name')} className="flex-1" />
            <Button onClick={sectionForm.handleSubmit(onCreateSection)} isLoading={createSection.isPending}>Add</Button>
          </div>
          {sections.length === 0 ? (
            <p className="text-sm text-gray-500">No sections yet</p>
          ) : (
            <div className="space-y-2">
              {sections.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">{s.name}</span>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteSection(s.id)} className="text-red-500">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Class" size="md">
        <form onSubmit={classForm.handleSubmit(onCreateClass)} className="p-6 space-y-4">
          <Input label="Class Name" placeholder="e.g. Class 1" error={classForm.formState.errors.name?.message} {...classForm.register('name')} />
          <Input label="Level" type="number" error={classForm.formState.errors.level?.message} {...classForm.register('level', { valueAsNumber: true })} />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createClass.isPending}>Create Class</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
