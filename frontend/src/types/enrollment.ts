export interface Student {
  id: string;
  student_id: string;
  registration_number?: string | null;
  roll_no: string;
  name: string;
  date_of_birth?: string | null;
  father_name?: string;
  mother_name?: string;
  guardian_name?: string;
  guardian_relation?: string;
  phone?: string;
  email?: string | null;
  profile_pic?: string | null;
  address?: string;
  class_id: string | null;
  section_id: string | null;
  session_id: string | null;
  admission_date?: string | null;
  is_active: boolean;
  created_at: string;
  class_info?: { id: string; name: string };
  section_info?: { id: string; name: string };
  session_info?: { id: string; name: string };
}

export interface Enrollment {
  id: string;
  student_id: string;
  student_name: string;
  session_id: string;
  session_name: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  roll_no: string;
  status: EnrollmentStatus;
  created_at: string;
}

export type EnrollmentStatus = 'active' | 'promoted' | 'retained' | 'transferred' | 'graduated' | 'dropped' | 'withdrawn';

export interface ClassTeacher {
  id: string;
  teacher_id: string;
  teacher_name: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  session_id: string;
  session_name: string;
  is_active: boolean;
  created_at: string;
}
