'use client';

import { useState, useRef } from 'react';
import { useReportCard } from '@/hooks/use-report-card';
import { useSessions, useActiveSession } from '@/hooks/use-sessions';
import { useStudent } from '@/stores/auth-store';
import { reportsApi } from '@/lib/api/reports';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectOption } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BoneyardCard } from '@/components/ui/boneyard';
import { Download, Printer, Loader2 } from 'lucide-react';

export default function StudentReportCardPage() {
  const student = useStudent();
  const { data: sessions, isLoading: sessionsLoading } = useSessions();
  const { data: activeSession } = useActiveSession();
  const [selectedSession, setSelectedSession] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const sessionId = selectedSession || activeSession?.id || '';
  const { data: reportCard, isLoading, error } = useReportCard(student?.id || '', sessionId);

  const sessionOptions: SelectOption[] = (sessions || []).map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!student?.id || !sessionId) return;
    setIsDownloading(true);
    try {
      const blob = await reportsApi.downloadPdf(student.id, sessionId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-card-${student.student_id || student.name}-${sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading || sessionsLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Report Card" description="Loading report card..." />
        <BoneyardCard lines={10} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Report Card" description="View your academic report card" />
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-red-500">
              Failed to load report card. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subjects = reportCard?.results || [];
  const summary = reportCard?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Card"
        description="View your academic report card"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button onClick={handleDownloadPdf} disabled={isDownloading || !sessionId}>
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download PDF
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-4">
        <Select
          label="Session"
          options={sessionOptions}
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
          placeholder="Select session"
        />
      </div>

      {!reportCard && !isLoading && (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">
              No report card available for the selected session.
            </p>
          </CardContent>
        </Card>
      )}

      {reportCard && (
        <div ref={printRef} className="space-y-6">
          <Card>
            <CardContent className="p-8">
              <div className="text-center border-b-2 border-gray-300 pb-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900">SCHOOL NAME</h2>
                <p className="text-sm text-gray-500 mt-1">School Address, City</p>
                <p className="text-lg font-semibold text-gray-700 mt-2">Academic Report Card</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 text-sm">
                <div>
                  <span className="font-medium text-gray-500">Student Name:</span>
                  <p className="font-semibold text-gray-900">{reportCard.student.name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Student ID:</span>
                  <p className="font-semibold text-gray-900">{reportCard.student.id}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Class:</span>
                  <p className="font-semibold text-gray-900">{reportCard.student.class}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Section:</span>
                  <p className="font-semibold text-gray-900">{reportCard.student.section}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Roll No:</span>
                  <p className="font-semibold text-gray-900">{reportCard.student.roll_no}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Session:</span>
                  <p className="font-semibold text-gray-900">{reportCard.session.name}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Subject Results</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-center">Marks Obtained</TableHead>
                      <TableHead className="text-center">Max Marks</TableHead>
                      <TableHead className="text-center">Percentage</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjects.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{result.subject_name}</TableCell>
                        <TableCell className="text-center">{result.marks_obtained}</TableCell>
                        <TableCell className="text-center">{result.full_marks}</TableCell>
                        <TableCell className="text-center">
                          {((result.marks_obtained / result.full_marks) * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={getGradeVariant(result.grade)}>{result.grade}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {summary && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-500">Total Marks</span>
                      <p className="text-lg font-bold text-gray-900">{summary.total_marks}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Max Marks</span>
                      <p className="text-lg font-bold text-gray-900">{summary.total_full_marks}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Overall Percentage</span>
                      <p className="text-lg font-bold text-gray-900">{summary.percentage.toFixed(1)}%</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Overall Grade</span>
                      <p className="text-lg font-bold text-gray-900">
                        <Badge variant={getGradeVariant(summary.overall_grade)}>
                          {summary.overall_grade}
                        </Badge>
                      </p>
                    </div>
                    {summary.rank && (
                      <div>
                        <span className="font-medium text-gray-500">Rank</span>
                        <p className="text-lg font-bold text-gray-900">{summary.rank}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-base font-semibold text-gray-900 mb-2">Teacher Remarks</h3>
                <p className="text-sm text-gray-600 italic">
                  {reportCard.summary?.overall_grade === 'A+'
                    ? 'Excellent performance! Keep up the great work.'
                    : reportCard.summary?.overall_grade === 'A'
                    ? 'Very good performance. Continue striving for excellence.'
                    : reportCard.summary?.overall_grade === 'B'
                    ? 'Good performance. There is room for improvement.'
                    : 'Needs improvement. Please work harder and seek help when needed.'}
                </p>
                <div className="mt-6 flex justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-500">Class Teacher Signature</p>
                    <div className="mt-6 border-t border-gray-300 w-40" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-500">Principal Signature</p>
                    <div className="mt-6 border-t border-gray-300 w-40" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function getGradeVariant(grade: string): 'success' | 'info' | 'warning' | 'danger' {
  const g = grade.toUpperCase();
  if (g === 'A+' || g === 'A') return 'success';
  if (g === 'B+' || g === 'B') return 'info';
  if (g === 'C') return 'warning';
  return 'danger';
}
