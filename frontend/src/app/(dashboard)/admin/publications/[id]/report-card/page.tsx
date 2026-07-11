'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { DynamicReportCard } from '@/components/report-card';
import { useState } from 'react';
import { Select } from '@/components/ui/select';
import type { ReportCardData } from '@/types/report-card';

function buildMockReportCard(name: string, rollNo: string, regNo: string): ReportCardData {
  return {
    school: { name: 'Demo School' },
    student: {
      id: rollNo, name, roll_no: rollNo, registration_number: regNo,
      father_name: 'Father Name', mother_name: 'Mother Name',
      class_name: 'Class V', section_name: 'A', date_of_birth: null,
    },
    session: { id: '1', name: '2024-2025' },
    template_id: null,
    attendance: [],
    attendance_overall: null,
    subjects: [
      {
        subject_id: 'sub-1', subject_name: 'English', subject_code: 'ENG',
        category_code: null, category_name: null,
        exam_groups: [{
          exam_id: 'exam-1', exam_name: 'Half Yearly', display_order: 1,
          components: [{ component_id: 'c1', name: 'Written', code: 'W', obtained: 72, full: 80, is_absent: false, is_grade_only: false, weightage_pct: 100 }],
          total_obtained: 72, total_full: 80, percentage: 90, grade: 'A+', grade_point: 9.0,
        }],
        total_obtained: 72, total_full: 80, overall_percentage: 90, overall_grade: 'A+', overall_grade_point: 9.0, is_scholastic: true,
      },
      {
        subject_id: 'sub-2', subject_name: 'Mathematics', subject_code: 'MATH',
        category_code: null, category_name: null,
        exam_groups: [{
          exam_id: 'exam-1', exam_name: 'Half Yearly', display_order: 1,
          components: [{ component_id: 'c2', name: 'Written', code: 'W', obtained: 68, full: 80, is_absent: false, is_grade_only: false, weightage_pct: 100 }],
          total_obtained: 68, total_full: 80, percentage: 85, grade: 'A', grade_point: 8.0,
        }],
        total_obtained: 68, total_full: 80, overall_percentage: 85, overall_grade: 'A', overall_grade_point: 8.0, is_scholastic: true,
      },
    ],
    co_scholastic: [],
    discipline: null,
    summary: {
      total_marks_obtained: 140, total_marks_full: 160, overall_percentage: 87.5,
      overall_grade: 'A', overall_grade_point: 8.0, promotion_status: 'promoted',
      rank_value: 3, rank_total: 30,
    },
    remarks: [],
    signatures: [
      { role: 'principal', label: 'Principal', name: 'Dr. Smith' },
      { role: 'teacher', label: 'Class Teacher', name: 'Mrs. Johnson' },
    ],
    grading_scale: [
      { grade: 'A+', min_percentage: 90, max_percentage: 100, grade_point: 10 },
      { grade: 'A', min_percentage: 75, max_percentage: 89, grade_point: 9 },
      { grade: 'B+', min_percentage: 60, max_percentage: 74, grade_point: 8 },
      { grade: 'B', min_percentage: 50, max_percentage: 59, grade_point: 7 },
      { grade: 'C', min_percentage: 33, max_percentage: 49, grade_point: 6 },
    ],
  };
}

export default function ReportCardsPage() {
  const [selectedStudent, setSelectedStudent] = useState<string>('all');

  const mockStudents = [
    { id: '1', name: 'Aliva Chakraborty', rollNo: '1', regNo: 'B/21/280' },
    { id: '2', name: 'John Doe', rollNo: '2', regNo: 'B/21/281' },
  ];

  const currentStudent = selectedStudent === 'all' ? mockStudents[0] : mockStudents.find(s => s.id === selectedStudent);

  const handlePrint = () => { window.print(); };

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="Report Cards"
          description="View and print student report cards"
          actions={
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          }
        />
        
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="w-64">
              <Select
                label="Select Student"
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                options={[
                  { label: 'All Students (Print All)', value: 'all' },
                  ...mockStudents.map(s => ({ label: `${s.rollNo} - ${s.name}`, value: s.id }))
                ]}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="print-container">
        {selectedStudent === 'all' ? (
          <div className="space-y-12">
            {mockStudents.map((s, idx) => (
              <div key={s.id} className={idx > 0 ? 'page-break-before' : ''}>
                <DynamicReportCard data={buildMockReportCard(s.name, s.rollNo, s.regNo)} />
              </div>
            ))}
          </div>
        ) : (
          <DynamicReportCard data={buildMockReportCard(currentStudent?.name || '', currentStudent?.rollNo || '', currentStudent?.regNo || '')} />
        )}
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .page-break-before {
            page-break-before: always;
          }
        }
      `}</style>
    </div>
  );
}
