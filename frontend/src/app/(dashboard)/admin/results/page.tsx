'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessions } from '@/hooks/use-sessions';
import { useClasses, useSections } from '@/hooks/use-classes';
import api from '@/lib/api/client';
import { enrollmentsApi } from '@/lib/api/enrollments';
import { reportCardApi } from '@/lib/api/report-card';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { Loader2, FileText, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { ResultPublication } from '@/types/publication';
import type { Enrollment } from '@/types';

interface ComputedResult {
  student_id: string;
  student_name: string;
  roll_no: string;
  percentage: number | null;
  grade: string;
  promotion_status: string;
}

const statusConfig: Record<string, { label: string; variant: 'secondary' | 'warning' | 'success' | 'danger' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  under_review: { label: 'Under Review', variant: 'warning' },
  published: { label: 'Published', variant: 'success' },
  unpublished: { label: 'Unpublished', variant: 'danger' },
};

export default function ResultsPage() {
  const queryClient = useQueryClient();
  const { data: sessions = [] } = useSessions();
  const { data: classes = [] } = useClasses();

  const [sessionId, setSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');

  const { data: sections = [] } = useSections(classId);

  const { data: enrollmentsData, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['enrollments', classId, sectionId, sessionId],
    queryFn: () =>
      enrollmentsApi.getAll({
        class_field: classId,
        section: sectionId,
        session: sessionId,
        status: 'active',
      }),
    enabled: !!classId && !!sectionId && !!sessionId,
  });

  const enrollments: Enrollment[] = enrollmentsData?.results ?? [];

  const { data: publications = [], isLoading: pubLoading } = useQuery<ResultPublication[]>({
    queryKey: ['result-publications', classId, sectionId, sessionId],
    queryFn: () =>
      api.get<ResultPublication[]>('/results/result-publications/', {
        class_id: classId,
        section_id: sectionId,
        session_id: sessionId,
      }),
    enabled: !!classId && !!sectionId && !!sessionId,
  });

  const currentPublication = publications.length > 0 ? publications[0] : null;

  const { data: computedResults, isLoading: resultsLoading, refetch: refetchResults } = useQuery<ComputedResult[]>({
    queryKey: ['computed-results', classId, sectionId, sessionId],
    queryFn: async () => {
      const data = await reportCardApi.getClassReportCards(classId, sectionId, sessionId);
      return data.map((rc: any) => ({
        student_id: rc.student?.id ?? rc.student_id ?? '',
        student_name: rc.student?.name ?? rc.student_name ?? '',
        roll_no: rc.student?.roll_no ?? rc.roll_no ?? '',
        percentage: rc.summary?.overall_percentage ?? null,
        grade: rc.summary?.overall_grade ?? '',
        promotion_status: rc.summary?.promotion_status ?? '',
      }));
    },
    enabled: false,
  });

  const createPublication = useMutation({
    mutationFn: () =>
      api.post<ResultPublication>('/results/result-publications/', {
        class_id: classId,
        section_id: sectionId,
        session_id: sessionId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['result-publications', classId, sectionId, sessionId] });
      toast.success('Publication created');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create publication'),
  });

  const publishMutation = useMutation({
    mutationFn: (pubId: string) =>
      api.post(`/results/result-publications/${pubId}/publish/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['result-publications', classId, sectionId, sessionId] });
      toast.success('Results published');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to publish'),
  });

  const unpublishMutation = useMutation({
    mutationFn: (pubId: string) =>
      api.post(`/results/result-publications/${pubId}/unpublish/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['result-publications', classId, sectionId, sessionId] });
      toast.success('Results unpublished');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to unpublish'),
  });

  const handlePreviewResults = () => {
    refetchResults();
  };

  const handleDownloadAllPdfs = () => {
    if (!classId || !sectionId || !sessionId) return;
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/reporting/report-cards/class/pdf/?class_id=${classId}&section_id=${sectionId}&session_id=${sessionId}`;
    window.open(url, '_blank');
  };

  const handlePreviewPdf = (studentId: string) => {
    const enrollment = enrollments.find((e) => e.student_id === studentId);
    if (enrollment) {
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/reporting/report-cards/student/${enrollment.id}/pdf/`;
      window.open(url, '_blank');
    }
  };

  const statusBadge = currentPublication
    ? statusConfig[currentPublication.status] ?? statusConfig.draft
    : null;

  const loading = enrollmentsLoading || pubLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Results"
        description="Generate and publish examination results"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePreviewResults}
              disabled={!classId || !sectionId || !sessionId}
              isLoading={resultsLoading}
            >
              <Eye className="h-4 w-4" /> Preview Results
            </Button>
            {currentPublication?.status === 'published' && (
              <Button variant="outline" onClick={handleDownloadAllPdfs}>
                <Download className="h-4 w-4" /> Download All PDFs
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap">
            <Select
              placeholder="Select Session"
              options={sessions.map((s) => ({ value: s.id, label: s.name }))}
              value={sessionId}
              onChange={(e) => { setSessionId(e.target.value); setClassId(''); setSectionId(''); }}
            />
            <Select
              placeholder="Select Class"
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
              value={classId}
              onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}
            />
            <Select
              placeholder="Select Section"
              options={sections.map((s) => ({ value: s.id, label: s.name }))}
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {currentPublication && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Publication Status:</span>
              <Badge variant={statusBadge?.variant}>{statusBadge?.label}</Badge>
            </div>
            <div className="flex items-center gap-2">
              {currentPublication.status === 'draft' && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => publishMutation.mutate(currentPublication.id)}
                  isLoading={publishMutation.isPending}
                >
                  Publish
                </Button>
              )}
              {currentPublication.status === 'published' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => unpublishMutation.mutate(currentPublication.id)}
                  isLoading={unpublishMutation.isPending}
                >
                  Unpublish
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!currentPublication && classId && sectionId && sessionId && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">No publication exists for this class and section.</span>
            <Button
              size="sm"
              onClick={() => createPublication.mutate()}
              isLoading={createPublication.isPending}
            >
              <FileText className="h-4 w-4" /> Create Publication
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Loading />
      ) : !classId || !sectionId || !sessionId ? (
        <EmptyState
          icon={FileText}
          title="Select filters"
          description="Select a session, class, and section to view results."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Promotion Status</TableHead>
                  <TableHead className="w-36">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!computedResults || computedResults.length === 0) && !resultsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                      Click "Preview Results" to load computed results.
                    </TableCell>
                  </TableRow>
                ) : resultsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-amber-600" />
                    </TableCell>
                  </TableRow>
                ) : (
                  computedResults?.map((result) => (
                    <TableRow key={result.student_id}>
                      <TableCell className="font-medium">{result.student_name}</TableCell>
                      <TableCell>{result.roll_no}</TableCell>
                      <TableCell>
                        {result.percentage !== null ? `${result.percentage.toFixed(2)}%` : '-'}
                      </TableCell>
                      <TableCell>{result.grade || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={result.promotion_status === 'promoted' ? 'success' : result.promotion_status === 'retained' ? 'warning' : 'secondary'}>
                          {result.promotion_status || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handlePreviewPdf(result.student_id)}
                            title="Preview PDF"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handlePreviewPdf(result.student_id)}
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
