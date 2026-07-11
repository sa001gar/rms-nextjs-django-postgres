'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSessions } from '@/hooks/use-sessions';
import { useClasses, useSections } from '@/hooks/use-classes';
import { useSubjectAssignments } from '@/hooks/use-subjects';
import { examComponentsApi, assessmentSchemesApi } from '@/lib/api/exams';
import { marksEntriesApi } from '@/lib/api/marks-entries';
import { enrollmentsApi } from '@/lib/api/enrollments';
import { gradePolicySetsApi } from '@/lib/api/grading';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { MarksGrid, type MarksGridRow } from '@/components/dynamic/marks-grid';
import { Loading } from '@/components/ui/loading';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { Enrollment } from '@/types';
import type { MarksEntry, ExamComponent } from '@/types/exam';

export default function MarksEntryPage() {
  const queryClient = useQueryClient();
  const { data: sessions = [] } = useSessions();
  const { data: classes = [] } = useClasses();

  const [sessionId, setSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [examComponentId, setExamComponentId] = useState('');

  const { data: sections = [] } = useSections(classId);
  const { data: classSubjects = [] } = useSubjectAssignments(classId);

  const { data: examComponents = [] } = useQuery({
    queryKey: ['exam-components'],
    queryFn: () => examComponentsApi.getAll(),
  });

  const allFiltersSelected = !!(
    sessionId &&
    classId &&
    sectionId &&
    subjectId &&
    examComponentId
  );

  const { data: enrollmentsData, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['enrollments', 'active', classId, sectionId, sessionId],
    queryFn: () =>
      enrollmentsApi.getAll({
        class_id: classId,
        section_id: sectionId,
        session_id: sessionId,
        status: 'active',
      }),
    enabled: allFiltersSelected,
  });

  const { data: schemes = [], isLoading: schemesLoading } = useQuery({
    queryKey: ['subject-assessment-schemes', classId, subjectId, sessionId],
    queryFn: () =>
      assessmentSchemesApi.getAll({
        class_id: classId,
        subject_id: subjectId,
        session_id: sessionId,
      }),
    enabled: allFiltersSelected,
  });

  const { data: existingMarks = [], isLoading: marksLoading } = useQuery({
    queryKey: ['marks-entries', classId, subjectId, examComponentId],
    queryFn: () =>
      marksEntriesApi.getByClassSubject(classId, subjectId, examComponentId),
    enabled: allFiltersSelected,
  });

  const { data: gradePolicySets = [], isLoading: gradePoliciesLoading } =
    useQuery({
      queryKey: ['grade-policy-sets', sessionId],
      queryFn: () => gradePolicySetsApi.getAll(sessionId),
      enabled: allFiltersSelected,
    });

  const dataLoading =
    enrollmentsLoading || schemesLoading || marksLoading || gradePoliciesLoading;

  const selectedComponent = useMemo(() => {
    return examComponents.find((c) => c.id === examComponentId) ?? null;
  }, [examComponents, examComponentId]);

  const activeGradePolicy = useMemo(() => {
    return (
      gradePolicySets.find((gps) => gps.is_active) || gradePolicySets[0]
    );
  }, [gradePolicySets]);

  const gradeOptions = useMemo(() => {
    if (!activeGradePolicy) return [];
    return activeGradePolicy.grades.map((g) => ({
      label: `${g.grade_label} (${g.min_percentage}-${g.max_percentage}%)`,
      value: g.grade_label,
    }));
  }, [activeGradePolicy]);

  const fullMarks = useMemo(() => {
    const scheme = schemes.find(
      (s) => s.exam_component_id === examComponentId,
    );
    if (scheme) return scheme.full_marks;
    return selectedComponent?.full_marks ?? 0;
  }, [schemes, examComponentId, selectedComponent]);

  const students = useMemo((): MarksGridRow[] => {
    const enrollments: Enrollment[] = Array.isArray(enrollmentsData)
      ? enrollmentsData
      : (enrollmentsData as { results?: Enrollment[] })?.results ?? [];
    const marksByEnrollment: Record<string, MarksEntry> = {};
    existingMarks.forEach((m) => {
      marksByEnrollment[m.enrollment] = m;
    });
    return enrollments.map((enr) => {
      const existing = marksByEnrollment[enr.id];
      return {
        enrollment_id: enr.id,
        student_name: enr.student_name,
        roll_no: enr.roll_no,
        marks_value: existing?.marks_value ?? null,
        grade_value: existing?.grade_value ?? null,
        descriptive_value: existing?.descriptive_value ?? null,
        is_absent: existing?.is_absent ?? false,
        existing_id: existing?.id,
      };
    });
  }, [enrollmentsData, existingMarks]);

  const handleSave = async (rows: MarksGridRow[]) => {
    const entries = rows.map((row) => ({
      enrollment_id: row.enrollment_id,
      subject_id: subjectId,
      exam_component_id: examComponentId,
      marks_value: row.marks_value,
      grade_value: row.grade_value,
      descriptive_value: row.descriptive_value,
      is_absent: row.is_absent,
      remarks: (row as any).remarks,
    }));
    try {
      await marksEntriesApi.bulkUpsert(entries);
      toast.success('Marks saved successfully');
      queryClient.invalidateQueries({
        queryKey: ['marks-entries', classId, subjectId, examComponentId],
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save marks',
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marks Entry"
        description="Enter marks for students by class, subject and exam component"
      />

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select
              label="Session"
              placeholder="Select session"
              options={sessions.map((s) => ({ value: s.id, label: s.name }))}
              value={sessionId}
              onChange={(e) => {
                setSessionId(e.target.value);
                setClassId('');
                setSectionId('');
                setSubjectId('');
                setExamComponentId('');
              }}
            />
            <Select
              label="Class"
              placeholder="Select class"
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSectionId('');
                setSubjectId('');
                setExamComponentId('');
              }}
              disabled={!sessionId}
            />
            <Select
              label="Section"
              placeholder="Select section"
              options={sections.map((s) => ({ value: s.id, label: s.name }))}
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value);
                setSubjectId('');
                setExamComponentId('');
              }}
              disabled={!classId}
            />
            <Select
              label="Subject"
              placeholder="Select subject"
              options={classSubjects.map((cs) => ({
                value: cs.subject?.id || (cs as any).subject_id || cs.id,
                label: cs.subject?.name || '',
              }))}
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setExamComponentId('');
              }}
              disabled={!sectionId}
            />
            <Select
              label="Exam Component"
              placeholder="Select component"
              options={examComponents.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              value={examComponentId}
              onChange={(e) => setExamComponentId(e.target.value)}
              disabled={!subjectId}
            />
          </div>
        </CardContent>
      </Card>

      {allFiltersSelected ? (
        dataLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </CardContent>
          </Card>
        ) : students.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No active enrollments found for the selected criteria
            </CardContent>
          </Card>
        ) : selectedComponent ? (
          <Card>
            <CardContent className="p-4">
              <MarksGrid
                students={students}
                examComponent={selectedComponent}
                gradeOptions={
                  selectedComponent.value_type === 'grade' ? gradeOptions : undefined
                }
                fullMarks={fullMarks}
                onSave={handleSave}
              />
            </CardContent>
          </Card>
        ) : null
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Select session, class, section, subject, and exam component to begin
            entering marks
          </CardContent>
        </Card>
      )}
    </div>
  );
}
