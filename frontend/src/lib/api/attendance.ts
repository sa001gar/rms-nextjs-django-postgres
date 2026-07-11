import api from './client';

export interface TermAttendance {
  id: string;
  enrollment: string;
  student_name: string;
  roll_no: string;
  term: string;
  term_name: string;
  present_days: number;
  total_days: number;
  created_at: string;
  updated_at: string;
}

export const attendanceApi = {
  getAll: async (params?: {
    session_id?: string;
    class_id?: string;
    section_id?: string;
    term_id?: string;
  }): Promise<TermAttendance[]> => {
    const response = await api.get<{ results?: TermAttendance[] } | TermAttendance[]>('/attendance/term-attendance/', params);
    return Array.isArray(response) ? response : (response.results || []);
  },
  bulkUpsert: async (entries: Array<{ enrollment_id: string; term_id: string; present_days: number; total_days: number }>): Promise<TermAttendance[]> => {
    return api.post<TermAttendance[]>('/attendance/term-attendance/bulk-upsert/', { entries });
  },
};
