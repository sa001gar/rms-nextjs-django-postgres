import { z } from 'zod';

export const studentCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  registration_number: z.string().min(1, 'Registration number is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  roll_no: z.string().min(1, 'Roll number is required'),
  class_id: z.string().min(1, 'Class is required'),
  section_id: z.string().min(1, 'Section is required'),
  session_id: z.string().min(1, 'Session is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  father_name: z.string().optional(),
  mother_name: z.string().optional(),
});

export const enrollmentCreateSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  session_id: z.string().min(1, 'Session is required'),
  class_id: z.string().min(1, 'Class is required'),
  section_id: z.string().min(1, 'Section is required'),
  roll_no: z.string().min(1, 'Roll number is required'),
});

export type StudentCreateFormData = z.infer<typeof studentCreateSchema>;
export type EnrollmentCreateFormData = z.infer<typeof enrollmentCreateSchema>;
