export interface AdminDashboardData {
  total_students: number;
  total_teachers: number;
  total_classes: number;
  total_sections: number;
  total_sessions: number;
  active_session: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
  } | null;
  enrollment_stats?: {
    total: number;
    promoted: number;
    retained: number;
    transferred: number;
  };
  class_distribution?: Array<{
    class_field__name: string;
    student_count: number;
  }>;
  recent_activity?: Array<{
    action: string;
    entity_type: string;
    created_at: string;
    user: string | null;
  }>;
}

export interface TeacherDashboardData {
  assigned_subjects: Array<{
    id: string;
    class_id: string | null;
    class_name: string;
    section_id: string | null;
    section_name: string;
    subject_id: string | null;
    subject_name: string;
    session_id: string | null;
    session_name: string;
  }>;
  total_assigned_subjects: number;
  class_teacher_of: Array<{
    id: string;
    class_name: string;
    section_name: string;
  }>;
  marks_entered: number;
  teachers_sessions: Array<{ id: string; name: string }>;
  teachers_classes: Array<{ id: string; name: string }>;
  teachers_sections: Array<{ id: string; name: string }>;
  teachers_subjects: Array<{ id: string; name: string }>;
}

export interface StudentDashboardData {
  current_class?: string;
  current_section?: string;
  roll_no?: string;
  percentage?: number | null;
  grade?: string | null;
  rank?: number | null;
  total_students?: number | null;
  subject_performance?: Array<{
    subject: string;
    marks_obtained: number;
    max_marks: number;
    percentage: number;
    grade: string;
  }>;
}
