export interface ReportCardTemplate {
  id: string;
  name: string;
  is_default: boolean;
  layout_config: Record<string, any>;
  sections: ReportCardSection[];
  assignments: TemplateAssignment[];
}

export interface ReportCardSection {
  id: string;
  template: string;
  section_type: SectionType;
  display_order: number;
  title: string;
  config: Record<string, any>;
  subject_groups: SectionSubjectGroup[];
}

export type SectionType =
  | 'school_header'
  | 'student_details'
  | 'scholastic_table'
  | 'co_scholastic'
  | 'discipline'
  | 'attendance'
  | 'remarks'
  | 'promotion_status'
  | 'signatures'
  | 'grading_scale'
  | 'summary_card';

export interface SectionSubjectGroup {
  id: string;
  section: string;
  subject_category: string | null;
  include_scholastic: boolean;
  display_order: number;
}

export interface TemplateAssignment {
  id: string;
  template: string;
  class_id: string | null;
  session_id: string | null;
}

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  school_header: 'School Header',
  student_details: 'Student Details',
  scholastic_table: 'Scholastic Subjects Table',
  co_scholastic: 'Co-Scholastic Areas',
  discipline: 'Discipline Record',
  attendance: 'Attendance Summary',
  remarks: 'Remarks',
  promotion_status: 'Promotion Status',
  signatures: 'Signature Block',
  grading_scale: 'Grading Scale',
  summary_card: 'Result Summary Card',
};
