'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSessions } from '@/hooks/use-sessions';
import { useClasses, useSections } from '@/hooks/use-classes';
import { PageHeader } from '@/components/layout/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import api from '@/lib/api/client';
import { Users, Eye } from 'lucide-react';

interface Enrollment {
  id: string;
  student: string;
  student_name: string;
  student_id: string;
  roll_no: string;
  class_field: string;
  class_name: string;
  section: string;
  section_name: string;
  status: string;
}

interface SubjectResult {
  id: string;
  subject_name: string;
  subject_code: string;
  total_obtained: number;
  total_full: number;
  percentage: number;
  grade: string;
}

export default function TeacherStudentsPage() {
  const { data: sessions = [] } = useSessions();
  const { data: classes = [] } = useClasses();
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Enrollment | null>(null);
  const [studentResults, setStudentResults] = useState<SubjectResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  const activeSession = sessions.find((s: any) => s.is_active);
  if (!selectedSession && activeSession) {
    setSelectedSession(activeSession.id);
  }

  const { data: enrollmentsData, isLoading } = useQuery({
    queryKey: ['enrollments', selectedSession, selectedClass, selectedSection],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedSession) params.append('session_id', selectedSession);
      if (selectedClass) params.append('class_field_id', selectedClass);
      if (selectedSection) params.append('section_id', selectedSection);
      return api.get(`/enrollments/enrollments/?${params.toString()}`);
    },
    enabled: !!selectedSession,
  });

  const enrollments: Enrollment[] = (enrollmentsData as any)?.results || enrollmentsData || [];

  const { data: sections = [] } = useSections(selectedClass);

  const handleViewStudent = async (enrollment: Enrollment) => {
    setSelectedStudent(enrollment);
    setLoadingResults(true);
    try {
      const results = await api.get(`/results/subject-results/by-enrollment/${enrollment.id}/`);
      setStudentResults((results as any)?.results || results || []);
    } catch {
      setStudentResults([]);
    } finally {
      setLoadingResults(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="success">Active</Badge>;
      case 'promoted': return <Badge variant="info">Promoted</Badge>;
      case 'retained': return <Badge variant="warning">Retained</Badge>;
      case 'transferred': return <Badge variant="danger">Transferred</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const totalObtained = studentResults.reduce((sum, r) => sum + (r.total_obtained || 0), 0);
  const totalFull = studentResults.reduce((sum, r) => sum + (r.total_full || 0), 0);
  const overallPercentage = totalFull > 0 ? Math.round((totalObtained / totalFull) * 100 * 100) / 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="My Students" description="View students in your assigned classes" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Session"
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
          options={sessions.map((s: any) => ({ value: s.id, label: s.name }))}
        />
        <Select
          label="Class"
          value={selectedClass}
          onChange={(e) => { setSelectedClass(e.target.value); setSelectedSection(''); }}
          options={classes.map((c: any) => ({ value: c.id, label: c.name }))}
        />
        <Select
          label="Section"
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          options={sections.map((s: any) => ({ value: s.id, label: s.name }))}
        />
      </div>

      {isLoading ? (
        <Loading message="Loading students..." />
      ) : enrollments.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students found"
          description="Select a class and section to view students"
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll No</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((e: Enrollment) => (
                <TableRow key={e.id}>
                  <TableCell>{e.roll_no || '-'}</TableCell>
                  <TableCell className="font-medium">{e.student_name || '-'}</TableCell>
                  <TableCell>{e.student_id || '-'}</TableCell>
                  <TableCell>{e.class_name || '-'}</TableCell>
                  <TableCell>{e.section_name || '-'}</TableCell>
                  <TableCell>{getStatusBadge(e.status)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleViewStudent(e)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Modal
        isOpen={!!selectedStudent}
        onClose={() => { setSelectedStudent(null); setStudentResults([]); }}
        title={`Student Profile - ${selectedStudent?.student_name || ''}`}
        size="lg"
      >
        {selectedStudent && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Student Name</p>
                <p className="font-medium">{selectedStudent.student_name}</p>
              </div>
              <div>
                <p className="text-gray-500">Student ID</p>
                <p className="font-medium">{selectedStudent.student_id}</p>
              </div>
              <div>
                <p className="text-gray-500">Roll No</p>
                <p className="font-medium">{selectedStudent.roll_no || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                {getStatusBadge(selectedStudent.status)}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Academic Performance</h3>
              {loadingResults ? (
                <Loading message="Loading results..." />
              ) : studentResults.length === 0 ? (
                <p className="text-gray-500 text-sm">No results available</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Marks</TableHead>
                        <TableHead>Max</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentResults.map((r: SubjectResult) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.subject_name}</TableCell>
                          <TableCell>{r.total_obtained}</TableCell>
                          <TableCell>{r.total_full}</TableCell>
                          <TableCell>{r.percentage}%</TableCell>
                          <TableCell>
                            <Badge variant={r.percentage >= 60 ? 'success' : r.percentage >= 33 ? 'warning' : 'danger'}>
                              {r.grade}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-3 flex gap-4 text-sm">
                    <span>Total: <strong>{totalObtained}/{totalFull}</strong></span>
                    <span>Percentage: <strong>{overallPercentage}%</strong></span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
