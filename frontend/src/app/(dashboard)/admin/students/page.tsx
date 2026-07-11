'use client';

import { useState, useEffect } from 'react';
import { useStudents, useCreateStudent, useDeleteStudent } from '@/hooks/use-students';
import { useClasses, useSections } from '@/hooks/use-classes';
import { useSessions } from '@/hooks/use-sessions';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { Users, Plus, Trash2, Settings } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { studentCreateSchema, type StudentCreateFormData } from '@/lib/validators/student';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import api from '@/lib/api/client';

export default function StudentsPage() {
  const [filters, setFilters] = useState<{ class_id?: string; section_id?: string; session_id?: string }>({});
  const { data: studentsData, isLoading } = useStudents(filters);
  const { data: classes = [] } = useClasses();
  const { data: sessions = [] } = useSessions();
  const createStudent = useCreateStudent();
  const deleteStudent = useDeleteStudent();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pattern, setPattern] = useState('');
  const [isSavingPattern, setIsSavingPattern] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<StudentCreateFormData>({
    resolver: zodResolver(studentCreateSchema),
  });

  const selectedClassId = watch('class_id');
  const { data: sections = [] } = useSections(selectedClassId);

  useEffect(() => {
    if (settingsOpen) {
      api.get<{ pattern: string }>('/enrollments/students/get-id-pattern/')
        .then((res) => setPattern(res.pattern))
        .catch(() => toast.error('Failed to fetch pattern'));
    }
  }, [settingsOpen]);

  const handleSavePattern = async () => {
    setIsSavingPattern(true);
    try {
      await api.post('/enrollments/students/set-id-pattern/', { pattern });
      toast.success('ID pattern updated');
      setSettingsOpen(false);
    } catch {
      toast.error('Failed to save pattern');
    } finally {
      setIsSavingPattern(false);
    }
  };

  const onSubmit = async (data: StudentCreateFormData) => {
    try {
      await createStudent.mutateAsync(data);
      toast.success('Student created');
      setIsModalOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this student?')) return;
    try {
      await deleteStudent.mutateAsync(id);
      toast.success('Student deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const students = studentsData?.results || [];

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Manage student records"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setSettingsOpen(true)} variant="outline">
              <Settings className="h-4 w-4 mr-2" /> ID Pattern
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Student
            </Button>
          </div>
        }
      />
      <div className="flex gap-4">
        <Select
          placeholder="All Classes"
          options={classes.map((c) => ({ value: c.id, label: c.name }))}
          value={filters.class_id || ''}
          onChange={(e) => setFilters((f) => ({ ...f, class_id: e.target.value || undefined }))}
        />
        <Select
          placeholder="All Sessions"
          options={sessions.map((s) => ({ value: s.id, label: s.name }))}
          value={filters.session_id || ''}
          onChange={(e) => setFilters((f) => ({ ...f, session_id: e.target.value || undefined }))}
        />
      </div>
      {students.length === 0 ? (
        <EmptyState icon={Users} title="No students" description="Add your first student" action={{ label: 'New Student', onClick: () => setIsModalOpen(true) }} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Registration No</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Roll No</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.registration_number || '-'}</TableCell>
                  <TableCell>{s.student_id}</TableCell>
                  <TableCell>{s.roll_no}</TableCell>
                  <TableCell>{s.class_info?.name || '-'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(s.id)} className="text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Student" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" error={errors.name?.message} {...register('name')} />
            <Input label="Registration Number" error={errors.registration_number?.message} {...register('registration_number')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input type="date" label="Date of Birth" error={errors.date_of_birth?.message} {...register('date_of_birth')} />
            <Input label="Roll No" error={errors.roll_no?.message} {...register('roll_no')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Session" options={sessions.map((s) => ({ value: s.id, label: s.name }))} error={errors.session_id?.message} {...register('session_id')} />
            <Select label="Class" options={classes.map((c) => ({ value: c.id, label: c.name }))} error={errors.class_id?.message} {...register('class_id')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Section" 
              options={sections.map((sec) => ({ value: sec.id, label: sec.name }))} 
              disabled={!selectedClassId}
              error={errors.section_id?.message} 
              {...register('section_id')} 
            />
            <Input label="Phone" {...register('phone')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Father's Name" {...register('father_name')} />
            <Input label="Mother's Name" {...register('mother_name')} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createStudent.isPending}>Create Student</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} title="Student ID Auto-generation Pattern" size="md">
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Input 
              label="ID Pattern" 
              placeholder="e.g. STU_{year}_{rand:6}" 
              value={pattern} 
              onChange={(e) => setPattern(e.target.value)} 
            />
            <p className="text-xs text-gray-500">
              Supported placeholders:<br />
              • <code>{`{year}`}</code>: Current calendar year (e.g. 2026)<br />
              • <code>{`{month}`}</code>: Current month (e.g. 07)<br />
              • <code>{`{seq}`}</code> or <code>{`{seq:X}`}</code>: Incremental sequence padded to X digits<br />
              • <code>{`{rand}`}</code> or <code>{`{rand:X}`}</code>: Random letters/numbers of length X
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSavePattern} isLoading={isSavingPattern}>Save Pattern</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
