'use client';

import { useState, useMemo, Fragment, useEffect } from 'react';
import { Download, Printer, FileText, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, type SelectOption } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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

interface SubjectColumn {
  name: string;
  fullMarks: number;
}

export function MarksheetPreview() {
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [generated, setGenerated] = useState(false);

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

  const isLoading = sessionsLoading || classesLoading || sectionsLoading || reportCardsLoading;

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

  const { subjectColumns, mergedData } = useMemo(() => {
    if (!reportCards) {
      return { subjectColumns: [], mergedData: [] };
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

    return { subjectColumns: subjectCols, mergedData: merged };
  }, [reportCards]);

  const canGenerate = selectedSessionId && selectedClassId && selectedSectionId;

  const handleGenerate = () => {
    if (!canGenerate) return;
    setGenerated(true);
  };

  const handleExportExcel = () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const url = `${baseUrl}/reporting/export/excel/class/?class_id=${selectedClassId}&section_id=${selectedSectionId}&session_id=${selectedSessionId}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marksheet"
        description="Preview and generate marksheets"
        actions={
          generated && !isLoading && mergedData.length > 0 ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          ) : undefined
        }
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
                Generate Marksheet
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {generated && !isLoading && mergedData.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No marksheet data found for the selected criteria.</p>
            <p className="text-gray-400 text-sm mt-1">Try selecting a different session, class, or section.</p>
          </CardContent>
        </Card>
      )}

      {generated && isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
              <p className="text-gray-500">Loading marksheet data...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {generated && !isLoading && mergedData.length > 0 && (
        <Card>
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
                      Total Marks
                    </TableHead>
                    <TableHead className="text-center bg-amber-50 font-semibold text-gray-900">
                      Max Marks
                    </TableHead>
                    <TableHead className="text-center bg-amber-50 font-semibold text-gray-900">
                      Percentage
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
                  {mergedData.map(({ reportCard }, index) => (
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
                                <span
                                  className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                                    sr.overall_grade === 'A+' || sr.overall_grade === 'A'
                                      ? 'bg-green-100 text-green-800'
                                      : sr.overall_grade === 'B+' || sr.overall_grade === 'B'
                                      ? 'bg-blue-100 text-blue-800'
                                      : sr.overall_grade === 'C'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {sr.overall_grade}
                                </span>
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
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                            reportCard.summary.overall_grade === 'A+' ||
                            reportCard.summary.overall_grade === 'A'
                              ? 'bg-green-100 text-green-800'
                              : reportCard.summary.overall_grade === 'B+' ||
                                reportCard.summary.overall_grade === 'B'
                              ? 'bg-blue-100 text-blue-800'
                              : reportCard.summary.overall_grade === 'C'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {reportCard.summary.overall_grade}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-bold text-amber-700 bg-amber-50/50">
                        {reportCard.summary.rank_value ?? '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
