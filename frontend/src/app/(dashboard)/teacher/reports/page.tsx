'use client';

import { useState, useMemo, useEffect, Fragment } from 'react';
import { FileText, Download, FileSpreadsheet, Eye, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, type SelectOption } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Tabs, TabList, Tab, TabPanel, TabPanels } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { useSessions, useActiveSession } from '@/hooks/use-sessions';
import { useClasses, useSections } from '@/hooks/use-classes';
import { useClassReportCards } from '@/hooks/use-report-card';
import { reportsApi } from '@/lib/api/reports';
import type { ReportCardData } from '@/types/report-card';

function gradeVariant(grade: string): 'success' | 'info' | 'warning' | 'danger' {
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return 'success';
  if (g.startsWith('B')) return 'info';
  if (g.startsWith('C')) return 'warning';
  return 'danger';
}

interface SubjectColumn {
  name: string;
  fullMarks: number;
}

export default function TeacherReportsPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [generated, setGenerated] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<ReportCardData | null>(null);
  const [pdfDownloading, setPdfDownloading] = useState<string | null>(null);

  const { data: sessions, isLoading: sessionsLoading } = useSessions();
  const { data: activeSession } = useActiveSession();
  const { data: classes, isLoading: classesLoading } = useClasses();
  const { data: sections, isLoading: sectionsLoading } = useSections(selectedClassId);

  const effectiveSessionId = generated ? selectedSessionId : '';

  const { data: reportCards, isLoading: reportCardsLoading } = useClassReportCards(
    effectiveSessionId,
    selectedClassId,
    selectedSectionId
  );

  const isLoading = reportCardsLoading;

  useEffect(() => {
    if (activeSession && !selectedSessionId) {
      setSelectedSessionId(activeSession.id);
    }
  }, [activeSession, selectedSessionId]);

  const sessionOptions: SelectOption[] = useMemo(() => {
    if (!sessions) return [];
    return sessions.map((s) => ({
      value: s.id,
      label: `${s.name}${s.is_active ? ' (Active)' : ''}`,
    }));
  }, [sessions]);

  const classOptions: SelectOption[] = useMemo(() => {
    if (!classes) return [];
    return classes.map((c) => ({ value: c.id, label: c.name }));
  }, [classes]);

  const sectionOptions: SelectOption[] = useMemo(() => {
    if (!sections) return [];
    return sections.map((s) => ({ value: s.id, label: s.name }));
  }, [sections]);

  const sortedReportCards = useMemo(() => {
    if (!reportCards) return [];
    return [...reportCards].sort((a, b) => {
      const rollA = parseInt(a.student.roll_no, 10);
      const rollB = parseInt(b.student.roll_no, 10);
      if (!isNaN(rollA) && !isNaN(rollB)) return rollA - rollB;
      return a.student.roll_no.localeCompare(b.student.roll_no);
    });
  }, [reportCards]);

  const { subjectColumns, marksheetData } = useMemo(() => {
    if (!reportCards) {
      return { subjectColumns: [], marksheetData: [] };
    }

    const subjectMap = new Map<string, SubjectColumn>();
    reportCards.forEach((rc) => {
      rc.subjects.forEach((s) => {
        if (!subjectMap.has(s.subject_name)) {
          subjectMap.set(s.subject_name, { name: s.subject_name, fullMarks: s.total_full });
        }
      });
    });
    const subjectCols = Array.from(subjectMap.values());

    const sorted = [...reportCards].sort((a, b) => {
      const rollA = parseInt(a.student.roll_no, 10);
      const rollB = parseInt(b.student.roll_no, 10);
      if (!isNaN(rollA) && !isNaN(rollB)) return rollA - rollB;
      return a.student.roll_no.localeCompare(b.student.roll_no);
    });

    const merged = sorted.map((rc) => ({ reportCard: rc }));

    return { subjectColumns: subjectCols, marksheetData: merged };
  }, [reportCards]);

  const canGenerate = selectedSessionId && selectedClassId && selectedSectionId;

  const handleGenerate = () => {
    if (!canGenerate) return;
    setGenerated(true);
  };

  const handleDownloadPdf = async (studentId: string) => {
    try {
      setPdfDownloading(studentId);
      const blob = await reportsApi.downloadPdf(studentId, selectedSessionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-card-${studentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert('Failed to download PDF. Please try again.');
    } finally {
      setPdfDownloading(null);
    }
  };

  const handleDownloadAllPdfs = async () => {
    if (!sortedReportCards.length) return;
    for (const rc of sortedReportCards) {
      await handleDownloadPdf(rc.student.id);
    }
  };

  const handleExportExcel = () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const url = `${baseUrl}/reporting/export/excel/class/?class_id=${selectedClassId}&section_id=${selectedSectionId}&session_id=${selectedSessionId}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate and view student report cards and marksheets"
      />

      <Card>
        <CardHeader>
          <CardTitle>Select Criteria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Session"
              placeholder="Select session"
              options={sessionOptions}
              value={selectedSessionId}
              onChange={(e) => {
                setSelectedSessionId(e.target.value);
                setGenerated(false);
              }}
              disabled={sessionsLoading}
            />
            <Select
              label="Class"
              placeholder="Select class"
              options={classOptions}
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedSectionId('');
                setGenerated(false);
              }}
              disabled={classesLoading}
            />
            <Select
              label="Section"
              placeholder="Select section"
              options={sectionOptions}
              value={selectedSectionId}
              onChange={(e) => {
                setSelectedSectionId(e.target.value);
                setGenerated(false);
              }}
              disabled={!selectedClassId || sectionsLoading}
            />
            <div className="flex items-end">
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate || isLoading}
                isLoading={reportCardsLoading}
                className="w-full"
              >
                <FileText className="h-4 w-4" />
                Generate Reports
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {generated && !isLoading && sortedReportCards.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No report data found for the selected criteria.</p>
            <p className="text-gray-400 text-sm mt-1">Try selecting a different session, class, or section.</p>
          </CardContent>
        </Card>
      )}

      {generated && isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
              <p className="text-gray-500">Loading report data...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {generated && !isLoading && sortedReportCards.length > 0 && (
        <Tabs tabs={[{ id: 'report-cards', label: 'Report Cards' }, { id: 'marksheet', label: 'Marksheet' }]} defaultValue="report-cards">
          <TabList>
            <Tab id="report-cards" />
            <Tab id="marksheet" />
          </TabList>

          <TabPanels>
            <TabPanel id="report-cards">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Report Cards</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleDownloadAllPdfs}>
                    <Download className="h-4 w-4" />
                    Download All PDFs
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                          <TableHead className="font-semibold text-gray-900">Roll No</TableHead>
                          <TableHead className="font-semibold text-gray-900">Name</TableHead>
                          <TableHead className="text-center font-semibold text-gray-900">Total Marks</TableHead>
                          <TableHead className="text-center font-semibold text-gray-900">Percentage</TableHead>
                          <TableHead className="text-center font-semibold text-gray-900">Grade</TableHead>
                          <TableHead className="text-center font-semibold text-gray-900">Rank</TableHead>
                          <TableHead className="text-center font-semibold text-gray-900">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedReportCards.map((rc, index) => {
                          return (
                            <TableRow
                              key={rc.student.id}
                              className={`cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                              onClick={() => setSelectedStudent(rc)}
                            >
                              <TableCell className="font-medium">{rc.student.roll_no}</TableCell>
                              <TableCell className="font-medium whitespace-nowrap">{rc.student.name}</TableCell>
                              <TableCell className="text-center">
                                {rc.summary.total_marks_obtained} / {rc.summary.total_marks_full}
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                {rc.summary.overall_percentage?.toFixed(1) ?? '0.0'}%
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={gradeVariant(rc.summary.overall_grade)}>
                                  {rc.summary.overall_grade}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center font-bold text-amber-700">
                                {rc.summary.rank_value != null ? `#${rc.summary.rank_value}` : '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStudent(rc);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabPanel>

            <TabPanel id="marksheet">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Marksheet</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleExportExcel}>
                    <FileSpreadsheet className="h-4 w-4" />
                    Export to Excel
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                          <TableHead className="sticky left-0 z-10 bg-gray-50 font-semibold text-gray-900">
                            Roll No
                          </TableHead>
                          <TableHead className="sticky left-20 z-10 bg-gray-50 font-semibold text-gray-900">
                            Student Name
                          </TableHead>
                          {subjectColumns.map((subject) => (
                            <TableHead
                              key={subject.name}
                              colSpan={3}
                              className="text-center border-x border-gray-200 bg-gray-50 font-semibold text-gray-900"
                            >
                              {subject.name}
                            </TableHead>
                          ))}
                          <TableHead className="text-center border-l border-gray-200 bg-amber-50 font-semibold text-gray-900">
                            Total
                          </TableHead>
                          <TableHead className="text-center bg-amber-50 font-semibold text-gray-900">
                            Max
                          </TableHead>
                          <TableHead className="text-center bg-amber-50 font-semibold text-gray-900">
                            %
                          </TableHead>
                          <TableHead className="text-center bg-amber-50 font-semibold text-gray-900">
                            Grade
                          </TableHead>
                          <TableHead className="text-center bg-amber-50 font-semibold text-gray-900">
                            Rank
                          </TableHead>
                        </TableRow>
                        <TableRow className="bg-gray-100 hover:bg-gray-100">
                          <TableHead className="sticky left-0 z-10 bg-gray-100" />
                          <TableHead className="sticky left-20 z-10 bg-gray-100" />
                          {subjectColumns.map((subject) => (
                            <Fragment key={`sub-header-${subject.name}`}>
                              <TableHead className="text-center text-xs border-x border-gray-200 bg-gray-100">
                                Total
                              </TableHead>
                              <TableHead className="text-center text-xs border-r border-gray-200 bg-gray-100">
                                Max
                              </TableHead>
                              <TableHead className="text-center text-xs border-r border-gray-200 bg-gray-100">
                                Grade
                              </TableHead>
                            </Fragment>
                          ))}
                          <TableHead className="border-l border-gray-200 bg-amber-100" />
                          <TableHead className="bg-amber-100" />
                          <TableHead className="bg-amber-100" />
                          <TableHead className="bg-amber-100" />
                          <TableHead className="bg-amber-100" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {marksheetData.map(({ reportCard }, index) => (
                          <TableRow
                            key={reportCard.student.id}
                            className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                          >
                            <TableCell className="sticky left-0 z-10 bg-inherit font-medium">
                              {reportCard.student.roll_no}
                            </TableCell>
                            <TableCell className="sticky left-20 z-10 bg-inherit font-medium whitespace-nowrap">
                              {reportCard.student.name}
                            </TableCell>
                            {subjectColumns.map((subject) => {
                              const sr = reportCard.subjects.find(
                                (s) => s.subject_name === subject.name
                              );
                              return (
                                <Fragment key={`${reportCard.student.id}-${subject.name}`}>
                                  <TableCell className="text-center border-x border-gray-200">
                                    {sr ? sr.total_obtained : '-'}
                                  </TableCell>
                                  <TableCell className="text-center border-r border-gray-200 text-gray-500">
                                    {sr ? sr.total_full : '-'}
                                  </TableCell>
                                  <TableCell className="text-center border-r border-gray-200">
                                    {sr ? (
                                      <Badge variant={gradeVariant(sr.overall_grade)} className="text-xs">
                                        {sr.overall_grade}
                                      </Badge>
                                    ) : (
                                      '-'
                                    )}
                                  </TableCell>
                                </Fragment>
                              );
                            })}
                            <TableCell className="text-center font-semibold border-l border-gray-200 bg-amber-50/50">
                              {reportCard.summary.total_marks_obtained}
                            </TableCell>
                            <TableCell className="text-center text-gray-500 bg-amber-50/50">
                              {reportCard.summary.total_marks_full}
                            </TableCell>
                            <TableCell className="text-center font-medium bg-amber-50/50">
                              {reportCard.summary.overall_percentage?.toFixed(1) ?? '0.0'}%
                            </TableCell>
                            <TableCell className="text-center bg-amber-50/50">
                              <Badge variant={gradeVariant(reportCard.summary.overall_grade)}>
                                {reportCard.summary.overall_grade}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-bold text-amber-700 bg-amber-50/50">
                              {reportCard.summary.rank_value != null ? `#${reportCard.summary.rank_value}` : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}

      <Modal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        title="Student Report Card"
        description={`${selectedStudent?.student.name} — Roll No: ${selectedStudent?.student.roll_no}`}
        size="lg"
      >
        {selectedStudent && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name</span>
                <p className="font-medium text-gray-900">{selectedStudent.student.name}</p>
              </div>
              <div>
                <span className="text-gray-500">Roll No</span>
                <p className="font-medium text-gray-900">{selectedStudent.student.roll_no}</p>
              </div>
              <div>
                <span className="text-gray-500">Class</span>
                <p className="font-medium text-gray-900">{selectedStudent.student.class_name}</p>
              </div>
              <div>
                <span className="text-gray-500">Section</span>
                <p className="font-medium text-gray-900">{selectedStudent.student.section_name}</p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Marks</TableHead>
                  <TableHead className="text-right">Full</TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedStudent.subjects.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{s.subject_name}</TableCell>
                    <TableCell className="text-right">{s.total_obtained}</TableCell>
                    <TableCell className="text-right">{s.total_full}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={gradeVariant(s.overall_grade)}>{s.overall_grade}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Total Marks</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {selectedStudent.summary.total_marks_obtained}{' '}
                  <span className="text-sm font-normal text-gray-400">
                    / {selectedStudent.summary.total_marks_full}
                  </span>
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Percentage</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {selectedStudent.summary.overall_percentage?.toFixed(1) ?? '0.0'}%
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Grade</p>
                <div className="mt-1">
                  <Badge variant={gradeVariant(selectedStudent.summary.overall_grade)} className="text-base px-3 py-1">
                    {selectedStudent.summary.overall_grade}
                  </Badge>
                </div>
              </div>
              {selectedStudent.summary.rank_value != null && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Rank</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    #{selectedStudent.summary.rank_value}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => handleDownloadPdf(selectedStudent.student.id)}
                isLoading={pdfDownloading === selectedStudent.student.id}
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
