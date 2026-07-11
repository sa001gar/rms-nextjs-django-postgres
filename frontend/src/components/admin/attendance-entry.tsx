'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useActiveSession, useSessions } from '@/hooks/use-sessions';
import { useClasses, useSections } from '@/hooks/use-classes';
import { enrollmentsApi } from '@/lib/api/enrollments';
import { termsApi } from '@/lib/api/terms';
import { attendanceApi, type TermAttendance } from '@/lib/api/attendance';
import { Loader2, Save, Send, Hash } from 'lucide-react';
import { toast } from 'sonner';

interface EnrollmentItem {
  id: string;
  student: string;
  student_name: string;
  session: string;
  class_field: string;
  section: string;
  roll_no: string;
  status: string;
}

interface AttendanceRow {
  enrollment_id: string;
  student_name: string;
  roll_no: string;
  present_days: number;
  total_days: number;
  existing_record_id?: string;
}

export function AttendanceEntry() {
  const queryClient = useQueryClient();
  const { data: sessions } = useSessions();
  const { data: activeSession } = useActiveSession();
  const { data: classes } = useClasses();

  const [sessionId, setSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [termId, setTermId] = useState('');

  const { data: sections } = useSections(classId);
  const { data: terms } = useQuery({
    queryKey: ['terms', sessionId],
    queryFn: () => termsApi.getAll(sessionId),
    enabled: !!sessionId,
  });

  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    if (activeSession && !sessionId) {
      setSessionId(activeSession.id);
    }
  }, [activeSession, sessionId]);

  const resetSelections = () => {
    setClassId('');
    setSectionId('');
    setTermId('');
    setRows([]);
    setStudentsLoaded(false);
    setValidationErrors({});
  };

  const handleLoadStudents = async () => {
    if (!sessionId || !classId || !sectionId || !termId) return;
    setLoadingStudents(true);
    setValidationErrors({});

    try {
      const enrollmentResponse = await enrollmentsApi.getAll({
        session: sessionId,
        class_field: classId,
        section: sectionId,
        status: 'active',
      });
      const enrollments = (enrollmentResponse.results || []) as unknown as EnrollmentItem[];
      
      let existingAttendance: TermAttendance[] = [];
      try {
        existingAttendance = await attendanceApi.getAll({
          session_id: sessionId,
          class_id: classId,
          section_id: sectionId,
          term_id: termId,
        });
      } catch (err) {
        // ignore
      }

      const newRows: AttendanceRow[] = enrollments
        .sort((a, b) => (parseInt(a.roll_no) || 0) - (parseInt(b.roll_no) || 0))
        .map((e) => {
          const existing = existingAttendance.find(a => a.enrollment === e.id);
          return {
            enrollment_id: e.id,
            student_name: e.student_name,
            roll_no: e.roll_no,
            present_days: existing?.present_days ?? 0,
            total_days: existing?.total_days ?? 0,
            existing_record_id: existing?.id,
          };
        });

      setRows(newRows);
      setStudentsLoaded(true);
    } catch (err) {
      toast.error('Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const validate = (): boolean => {
    const errors: Record<number, string> = {};
    rows.forEach((row, index) => {
      if (row.present_days < 0) errors[index] = 'Cannot be negative';
      if (row.total_days < 0) errors[index] = 'Cannot be negative';
      if (row.present_days > row.total_days && row.total_days > 0) {
        errors[index] = 'Present days cannot exceed total days';
      }
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: any[]) => {
      return attendanceApi.bulkUpsert(payload);
    },
    onSuccess: () => {
      toast.success('Attendance saved successfully');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save attendance');
    },
  });

  const handleSave = async () => {
    if (!validate()) return;
    const payload = rows.map((r) => ({
      enrollment_id: r.enrollment_id,
      term_id: termId,
      present_days: r.present_days,
      total_days: r.total_days,
    }));
    if (payload.length > 0) {
      saveMutation.mutate(payload);
    }
  };

  const handleSetAllTotal = (value: number) => {
    setRows(prev => prev.map(r => ({ ...r, total_days: value })));
    setValidationErrors({});
  };

  const updateRow = (index: number, field: 'present_days' | 'total_days', value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (isNaN(numValue) && value !== '') return;
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: numValue } : r));
    if (validationErrors[index]) {
      const next = { ...validationErrors };
      delete next[index];
      setValidationErrors(next);
    }
  };

  const canLoad = sessionId && classId && sectionId && termId;

  return (
    <div className="space-y-6">
      <PageHeader title="Term Attendance Entry" description="Record attendance data for the term report cards." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 1: Select Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Select
              label="Session"
              options={(sessions || []).map(s => ({ value: s.id, label: s.name }))}
              value={sessionId}
              onChange={(e) => { setSessionId(e.target.value); resetSelections(); }}
              placeholder="Select session"
            />
            <Select
              label="Class"
              options={(classes || []).map(c => ({ value: c.id, label: c.name }))}
              value={classId}
              onChange={(e) => { setClassId(e.target.value); setSectionId(''); setRows([]); setStudentsLoaded(false); }}
              placeholder="Select class"
            />
            <Select
              label="Section"
              options={(sections || []).map(s => ({ value: s.id, label: s.name }))}
              value={sectionId}
              onChange={(e) => { setSectionId(e.target.value); setRows([]); setStudentsLoaded(false); }}
              placeholder="Select section"
              disabled={!classId}
            />
            <Select
              label="Term"
              options={(terms || []).map(t => ({ value: t.id, label: t.name }))}
              value={termId}
              onChange={(e) => { setTermId(e.target.value); setRows([]); setStudentsLoaded(false); }}
              placeholder="Select term"
            />
            <div className="flex items-end">
              <Button onClick={handleLoadStudents} disabled={!canLoad || loadingStudents} isLoading={loadingStudents} className="w-full">
                Load Students
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {studentsLoaded && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Step 2: Enter Attendance ({rows.length} students)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Bulk Actions:</span>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">Set total days for all to:</label>
                <input
                  type="number"
                  min={0}
                  className="h-8 w-20 rounded-md border border-gray-300 px-2 text-sm"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSetAllTotal(parseInt((e.target as HTMLInputElement).value, 10) || 0); }}
                  onBlur={(e) => handleSetAllTotal(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>

            {rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No active students found.</p>
            ) : (
              <div className="max-h-[60vh] overflow-auto rounded-lg border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Roll No</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="w-32">Present Days</TableHead>
                      <TableHead className="w-32">Total Days</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, index) => (
                      <TableRow key={row.enrollment_id} className={validationErrors[index] ? 'bg-red-50' : undefined}>
                        <TableCell className="font-medium">{row.roll_no || '-'}</TableCell>
                        <TableCell>{row.student_name}</TableCell>
                        <TableCell>
                          <input
                            type="number"
                            min={0}
                            value={row.present_days || ''}
                            onChange={(e) => updateRow(index, 'present_days', e.target.value)}
                            className={`h-9 w-full rounded-md border px-2 text-sm ${
                              validationErrors[index] ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-amber-500'
                            } focus:outline-none focus:ring-2`}
                          />
                          {validationErrors[index] && <p className="mt-1 text-xs text-red-600">{validationErrors[index]}</p>}
                        </TableCell>
                        <TableCell>
                          <input
                            type="number"
                            min={0}
                            value={row.total_days || ''}
                            onChange={(e) => updateRow(index, 'total_days', e.target.value)}
                            className="h-9 w-full rounded-md border border-gray-300 px-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {rows.length > 0 && (
              <div className="mt-4 flex justify-end">
                <Button onClick={handleSave} disabled={saveMutation.isPending} isLoading={saveMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" /> Save Attendance
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
