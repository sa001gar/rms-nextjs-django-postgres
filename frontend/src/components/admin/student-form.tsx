'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { studentCreateSchema, type StudentCreateFormData } from '@/lib/validators/student';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { useSections } from '@/hooks/use-classes';

interface StudentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StudentCreateFormData) => Promise<void>;
  isLoading?: boolean;
  classes: Array<{ id: string; name: string }>;
  sessions: Array<{ id: string; name: string }>;
}

export function StudentForm({ isOpen, onClose, onSubmit, isLoading, classes, sessions }: StudentFormProps) {
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<StudentCreateFormData>({
    resolver: zodResolver(studentCreateSchema),
  });

  const selectedClassId = watch('class_id');
  const { data: sections = [] } = useSections(selectedClassId || '');

  const handleFormSubmit = async (data: StudentCreateFormData) => {
    await onSubmit(data);
    reset();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Student" size="lg">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
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
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Create Student</Button>
        </div>
      </form>
    </Modal>
  );
}
