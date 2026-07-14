'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Loading } from '@/components/ui/loading';
import { useActiveSession, useSessions } from '@/hooks/use-sessions';
import { useClasses, useSections } from '@/hooks/use-classes';
import { useSubjects } from '@/hooks/use-subjects';
import { useTeacherDashboard } from '@/hooks/use-dashboard';
import { enrollmentsApi } from '@/lib/api/enrollments';
import { marksApi } from '@/lib/api/marks';
import { resultConfigApi } from '@/lib/api/result-config';
import { Loader2, Save, Send, Eraser } from 'lucide-react';
import { toast } from 'sonner';
import type { ComponentData } from '@/lib/api/result-config';

interface EnrollmentItem {
  id: string;
  student: string;
  student_name: string;
  roll_no: string;
  status: string;
}

interface StudentRow {
  enrollment_id: string;
  student_name: string;
  roll_no: string;
  mark_id?: string;
  obtained_marks: number;
  is_absent: boolean;
  remarks: string;
}

export function MarksEntry() {
  const { data: sessions } = useSessions();
  const { data: activeSession } = useActiveSession();
  const { data: classes } = useClasses();
  const { data: subjects } = useSubjects();
  const { data: dashboard } = useTeacherDashboard();

  const [sessionId, setSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [componentId, setComponentId] = useState('');

  const { data: sections } = useSections(classId);

  // Fetch full result config to get exam components for the class
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['result-config-components', sessionId, classId],
    queryFn: () => resultConfigApi.get(sessionId, classId),
    enabled: !!sessionId && !!classId,
    staleTime: 60_000,
  });

  // Extract all exam components from the academic structure
  const components = useMemo(() => {
    if (!config) return [];
    const all: (ComponentData & { termName: string; examName: string })[] = [];
    for (const term of config.academic_structure) {
      for (const exam of term.exams) {
        for (const comp of exam.components) {
          all.push({ ...comp, termName: term.name, examName: exam.name });
        }
      }
    }
    return all;
  }, [config]);

  // Get the selected component's full_marks from the component definition
  const selectedComponent = useMemo(
    () => components.find((c) => c.id === componentId),
    [components, componentId]
  );

  const [studentRows, setStudentRows] = useState<StudentRow[]>([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  // Auto-select active session
  useMemo(() => {
    if (activeSession && !sessionId) {
      setSessionId(activeSession.id);
    }
  }, [activeSession, sessionId]);

  const canLoadStudents = sessionId && classId && sectionId && subjectId && componentId;

  const handleLoadStudents = async () => {
    if (!canLoadStudents) return;
    setLoadingStudents(true);

    try {
      const enrollmentResponse = await enrollmentsApi.getAll({
        session: sessionId,
        class_field: classId,
        section: sectionId,
        status: 'active',
      });
      const enrollments = (enrollmentResponse.results || []) as unknown as EnrollmentItem[];

      // Fetch existing marks for this class-section-subject-component
      let existingMarks: Array<{
        id: string;
        enrollment: string;
        obtained_marks: number;
        is_absent: boolean;
        remarks: string;
      }> = [];
      try {
        const marksResponse = await marksApi.getAll({
          subject_id: subjectId,
          // We need to filter by component. The marks-entries API supports filtering
        });
        existingMarks = (marksResponse || []).map((m: any) => ({
          id: m.id,
          enrollment: m.enrollment,
          obtained_marks: m.obtained_marks ?? 0,
          is_absent: m.is_absent ?? false,
          remarks: m.remarks || '',
        }));
      } catch {
        // No existing marks
      }

      const rows: StudentRow[] = enrollments
        .sort((a, b) => {
          const ra = parseInt(a.roll_no) || 0;
          const rb = parseInt(b.roll_no) || 0;
          return ra - rb;
        })
        .map((e) => {
          const existing = existingMarks.find((m) => m.enrollment === e.id);
          return {
            enrollment_id: e.id,
            student_name: e.student_name,
            roll_no: e.roll_no,
            mark_id: existing?.id,
            obtained_marks: existing?.obtained_marks ?? 0,
            is_absent: existing?.is_absent ?? false,
            remarks: existing?.remarks || '',
          };
        });

      setStudentRows(rows);
      setStudentsLoaded(true);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const updateMarks = useCallback((index: number, value: string) => {
    const numValue = value === '' ? 0 : Number(value);
    if (isNaN(numValue) && value !== '') return;
    setStudentRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, obtained_marks: numValue, is_absent: false } : row
      )
    );
  }, []);

  const toggleAbsent = useCallback((index: number) => {
    setStudentRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, is_absent: !row.is_absent, obtained_marks: 0 } : row
      )
    );
  }, []);

  const updateRemarks = useCallback((index: number, value: string) => {
    setStudentRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, remarks: value } : row))
    );
  }, []);

  const handleSaveDraft = async () => {
    if (!studentRows.length || !subjectId || !componentId) return;
    setSaving(true);

    const entries = studentRows
      .filter((row) => row.obtained_marks > 0 || row.is_absent || row.remarks)
      .map((row) => ({
        enrollment_id: row.enrollment_id,
        subject_id: subjectId,
        exam_component_id: componentId,
        obtained_marks: row.obtained_marks,
        is_absent: row.is_absent,
        is_grade_only: false,
        remarks: row.remarks,
      }));

    try {
      await marksApi.bulkUpsert(entries as any);
      toast.success('Marks saved as draft');
    } catch {
      toast.error('Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  const handleSetAll = (value: number) => {
    setStudentRows((prev) =>
      prev.map((row) => ({
        ...row,
        obtained_marks: Math.min(value, 100),
        is_absent: false,
      }))
    );
  };

  const handleClearAll = () => {
    setStudentRows((prev) =>
      prev.map((row) => ({ ...row, obtained_marks: 0, is_absent: false, remarks: '' }))
    );
  };

  const fullMarks = selectedComponent?.full_marks ?? 100;

  const teacherSessionIds = useMemo(
    () => new Set(dashboard?.teachers_sessions?.map((s) => s.id) ?? []),
    [dashboard]
  );
  const teacherClassIds = useMemo(
    () => new Set(dashboard?.teachers_classes?.map((c) => c.id) ?? []),
    [dashboard]
  );
  const teacherSectionIds = useMemo(
    () => new Set(dashboard?.teachers_sections?.map((s) => s.id) ?? []),
    [dashboard]
  );
  const teacherSubjectIds = useMemo(
    () => new Set(dashboard?.teachers_subjects?.map((s) => s.id) ?? []),
    [dashboard]
  );

  const sessionOptions = (sessions || [])
    .filter((s: any) => teacherSessionIds.has(s.id))
    .map((s: any) => ({ value: s.id, label: s.name }));
  const classOptions = (classes || [])
    .filter((c: any) => teacherClassIds.has(c.id))
    .map((c: any) => ({ value: c.id, label: c.name }));
  const sectionOptions = (sections || [])
    .filter((s: any) => teacherSectionIds.has(s.id))
    .map((s: any) => ({ value: s.id, label: s.name }));
  const subjectOptions = (subjects || [])
    .filter((s: any) => teacherSubjectIds.has(s.id))
    .map((s: any) => ({
      value: s.id,
      label: `${s.name} (${s.code})`,
    }));
  const componentOptions = components.map((c) => ({
    value: c.id,
    label: `${c.termName} / ${c.examName} / ${c.name}${c.value_type !== 'numeric' ? ` [${c.value_type}]` : ''}`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marks Entry"
        description="Enter marks for your assigned classes and subjects"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="Session"
              options={sessionOptions}
              value={sessionId}
              onChange={(e) => {
                setSessionId(e.target.value);
                setStudentsLoaded(false);
                setStudentRows([]);
              }}
              placeholder="Select session"
            />
            <Select
              label="Class"
              options={classOptions}
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSectionId('');
                setStudentsLoaded(false);
                setStudentRows([]);
              }}
              placeholder="Select class"
            />
            <Select
              label="Section"
              options={sectionOptions}
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value);
                setStudentsLoaded(false);
                setStudentRows([]);
              }}
              placeholder="Select section"
              disabled={!classId}
            />
            <Select
              label="Subject"
              options={subjectOptions}
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setComponentId('');
                setStudentsLoaded(false);
                setStudentRows([]);
              }}
              placeholder="Select subject"
            />
            <Select
              label="Assessment Component"
              options={componentOptions}
              value={componentId}
              onChange={(e) => {
                setComponentId(e.target.value);
                setStudentsLoaded(false);
                setStudentRows([]);
              }}
              placeholder="Select component"
              disabled={!classId || configLoading}
            />
            <div className="flex items-end">
              <Button
                onClick={handleLoadStudents}
                disabled={!canLoadStudents || loadingStudents}
                isLoading={loadingStudents}
                className="w-full"
              >
                Load Students
              </Button>
            </div>
          </div>
          {configLoading && classId && (
            <p className="mt-2 text-xs text-gray-400">Loading assessment structure...</p>
          )}
        </CardContent>
      </Card>

      {studentsLoaded && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Enter Marks ({studentRows.length} students)
                {selectedComponent && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    — {selectedComponent.termName} / {selectedComponent.examName} / {selectedComponent.name}
                    {selectedComponent.value_type === 'numeric' && (
                      <span className="ml-1 text-gray-400">(Max: {fullMarks})</span>
                    )}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Bulk Operations</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={fullMarks}
                    defaultValue={0}
                    className="h-8 w-20 rounded-md border border-gray-300 px-2 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSetAll(parseInt((e.target as HTMLInputElement).value, 10) || 0);
                      }
                    }}
                    onBlur={(e) => {
                      handleSetAll(parseInt(e.target.value, 10) || 0);
                    }}
                  />
                  <Button variant="secondary" size="sm" onClick={() => handleSetAll(0)}>
                    Set
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClearAll}>
                    <Eraser className="h-3.5 w-3.5" /> Clear All
                  </Button>
                </div>
              </div>

              {studentRows.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  No active students found for this selection.
                </p>
              ) : (
                <div className="max-h-[60vh] overflow-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-500 font-medium w-20">Roll No</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Student Name</th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium w-28">Marks</th>
                        <th className="text-center py-2 px-3 text-gray-500 font-medium w-32">Absent</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentRows.map((row, index) => (
                        <tr
                          key={row.enrollment_id}
                          className={`border-b border-gray-100 hover:bg-gray-50 ${
                            row.is_absent ? 'bg-red-50' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-medium">{row.roll_no || '-'}</td>
                          <td className="py-2 px-3">{row.student_name}</td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min={0}
                              max={fullMarks}
                              value={row.is_absent ? '' : row.obtained_marks || ''}
                              disabled={row.is_absent}
                              onChange={(e) => updateMarks(index, e.target.value)}
                              className={`h-9 w-full rounded-md border px-2 text-sm text-center focus:outline-none focus:ring-2 ${
                                row.is_absent
                                  ? 'bg-gray-100 text-gray-400 border-gray-200'
                                  : 'border-gray-300 focus:ring-amber-500'
                              }`}
                              placeholder={row.is_absent ? 'ABS' : '0'}
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={row.is_absent}
                                onChange={() => toggleAbsent(index)}
                                className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                              />
                              <span className="text-xs text-gray-500">Absent</span>
                            </label>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.remarks}
                              onChange={(e) => updateRemarks(index, e.target.value)}
                              className="h-9 w-full rounded-md border border-gray-300 px-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                              placeholder="Optional"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {studentRows.length > 0 && (
                <div className="mt-4 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={saving}
                    isLoading={saving}
                  >
                    <Save className="h-4 w-4" /> Save Marks
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
