import api from './client';

export interface GridStudent {
  id: string;
  enrollment_id: string;
  student_id: string;
  name: string;
  roll_no: string;
  section_id: string;
}

export interface GridSubject {
  id: string;
  name: string;
  code: string;
}

export interface GridComponent {
  id: string;
  name: string;
  exam_name: string;
  term_name: string | null;
  value_type: 'numeric' | 'grade' | 'descriptive';
  default_full_marks: number | null;
  display_order: number;
}

export interface GridEntry {
  enrollment_id: string;
  subject_id: string;
  component_id: string;
  marks_value: number | null;
  grade_value: string | null;
  descriptive_value: string | null;
  is_absent: boolean;
  remarks: string;
}

export interface MarksGridData {
  students: GridStudent[];
  subjects: GridSubject[];
  components: GridComponent[];
  config_lookup: Record<string, number>;
  entries: GridEntry[];
}

export interface CellUpdate {
  enrollment_id: string;
  subject_id: string;
  component_id: string;
  marks_value?: number | null;
  grade_value?: string | null;
  descriptive_value?: string | null;
  is_absent?: boolean;
}

export const marksGridApi = {
  getGrid: (sessionId: string, classId: string, sectionId?: string): Promise<MarksGridData> => {
    const params: Record<string, string> = {};
    if (sectionId) params.section_id = sectionId;
    return api.get(`/results/marks-entry/${sessionId}/${classId}/`, params);
  },

  bulkSave: (sessionId: string, classId: string, entries: CellUpdate[]): Promise<{ saved: number; errors: any[] }> =>
    api.post(`/results/marks-entry/${sessionId}/${classId}/`, { entries }),

  updateCell: (sessionId: string, classId: string, data: CellUpdate): Promise<{ success: boolean }> =>
    api.patch(`/results/marks-entry/${sessionId}/${classId}/cell/`, data),
};
