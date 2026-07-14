'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessions } from '@/hooks/use-sessions';
import { useClasses, useSections } from '@/hooks/use-classes';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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
import api from '@/lib/api/client';
import { toast } from 'sonner';
import { Loader2, FileText, Eye, Download, TrendingUp } from 'lucide-react';

interface Publication {
  id: string;
  session: string;
  class_field: string;
  section: string;
  status: 'draft' | 'under_review' | 'published' | 'unpublished';
  published_by: string | null;
  published_at: string | null;
  remarks: string;
}

interface ComputedResult {
  student_id: string;
  student_name: string;
  roll_no: string;
  percentage: number | null;
  grade: string;
  promotion_status: string;
  subjects?: { name: string; percentage: number; grade: string }[];
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
  const [activeTab, setActiveTab] = useState<'results' | 'promotion'>('results');

  const { data: sections = [] } = useSections(classId);

  // Fetch publication for this class+section
  const { data: publications = [], isLoading: pubLoading } = useQuery<Publication[]>({
    queryKey: ['publications', classId, sectionId, sessionId],
    queryFn: () =>
      api.get<Publication[]>('/results/publications/', {
        class_id: classId,
        section_id: sectionId,
        session_id: sessionId,
      }),
    enabled: !!classId && !!sectionId && !!sessionId,
  });

  const currentPublication = publications.length > 0 ? publications[0] : null;

  // Computed results (triggered by "Preview")
  const [computedResults, setComputedResults] = useState<ComputedResult[] | null>(null);
  const [computing, setComputing] = useState(false);

  const handleCompute = async () => {
    if (!classId || !sectionId || !sessionId) return;
    setComputing(true);
    try {
      const reportCardApi = (await import('@/lib/api/report-card')).reportCardApi;
      const data = await reportCardApi.getClassReportCards(classId, sectionId, sessionId);
      const results: ComputedResult[] = data.map((rc: any) => ({
        student_id: rc.student?.id ?? rc.student_id ?? '',
        student_name: rc.student?.name ?? rc.student_name ?? '',
        roll_no: rc.student?.roll_no ?? rc.roll_no ?? '',
        percentage: rc.summary?.overall_percentage ?? null,
        grade: rc.summary?.overall_grade ?? '',
        promotion_status: rc.summary?.promotion_status ?? '',
        subjects: rc.subjects?.map((s: any) => ({
          name: s.subject_name,
          percentage: s.overall_percentage,
          grade: s.overall_grade,
        })) ?? [],
      }));
      setComputedResults(results);
      toast.success('Results computed');
    } catch (err: any) {
      toast.error(err.message || 'Computation failed');
    } finally {
      setComputing(false);
    }
  };

  // Publication actions
  const createPub = useMutation({
    mutationFn: () =>
      api.post('/results/publications/', {
        class_id: classId,
        section_id: sectionId,
        session_id: sessionId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publications', classId, sectionId, sessionId] });
      toast.success('Publication created');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create publication'),
  });

  const pubAction = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.post(`/results/publications/${id}/${action}/`),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['publications', classId, sectionId, sessionId] });
      toast.success(`Results ${vars.action === 'publish' ? 'published' : vars.action === 'unpublish' ? 'unpublished' : 'submitted'}`);
    },
    onError: (err: any) => toast.error(err.message || 'Action failed'),
  });

  const statusBadge = currentPublication
    ? statusConfig[currentPublication.status] ?? statusConfig.draft
    : null;

  const canCompute = classId && sectionId && sessionId;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Results"
        description="Compute, preview, publish results and manage promotions"
        actions={
          <div className="flex gap-2">
            {canCompute && (
              <Button variant="outline" onClick={handleCompute} isLoading={computing}>
                <Eye className="h-4 w-4 mr-1" /> Preview Results
              </Button>
            )}
          </div>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Select
              placeholder="Select Session"
              options={sessions.map((s: any) => ({ value: s.id, label: s.name }))}
              value={sessionId}
              onChange={(e) => { setSessionId(e.target.value); setClassId(''); setSectionId(''); setComputedResults(null); }}
            />
            <Select
              placeholder="Select Class"
              options={classes.map((c: any) => ({ value: c.id, label: c.name }))}
              value={classId}
              onChange={(e) => { setClassId(e.target.value); setSectionId(''); setComputedResults(null); }}
              disabled={!sessionId}
            />
            <Select
              placeholder="Select Section"
              options={sections.map((s: any) => ({ value: s.id, label: s.name }))}
              value={sectionId}
              onChange={(e) => { setSectionId(e.target.value); setComputedResults(null); }}
              disabled={!classId}
            />
          </div>
        </CardContent>
      </Card>

      {!canCompute ? (
        <EmptyState icon={FileText} title="Select filters" description="Select session, class, and section to view results." />
      ) : (
        <>
          {/* Publication Status Bar */}
          {currentPublication ? (
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge variant={statusBadge?.variant}>{statusBadge?.label}</Badge>
                  {currentPublication.published_at && (
                    <span className="text-xs text-gray-400">
                      Published {new Date(currentPublication.published_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {currentPublication.status === 'draft' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => pubAction.mutate({ id: currentPublication.id, action: 'submit' })}>
                        Submit for Review
                      </Button>
                      <Button size="sm" variant="success" onClick={() => pubAction.mutate({ id: currentPublication.id, action: 'publish' })}>
                        Publish
                      </Button>
                    </>
                  )}
                  {currentPublication.status === 'under_review' && (
                    <Button size="sm" variant="success" onClick={() => pubAction.mutate({ id: currentPublication.id, action: 'publish' })}>
                      Publish
                    </Button>
                  )}
                  {currentPublication.status === 'published' && (
                    <Button size="sm" variant="destructive" onClick={() => pubAction.mutate({ id: currentPublication.id, action: 'unpublish' })}>
                      Unpublish
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">No publication yet.</span>
                <Button size="sm" onClick={() => createPub.mutate()} isLoading={createPub.isPending}>
                  <FileText className="h-4 w-4 mr-1" /> Create Publication
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Tab bar */}
          <div className="flex border-b border-gray-200">
            <button
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'results'
                  ? "border-amber-500 text-amber-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
              onClick={() => setActiveTab('results')}
            >
              Results
            </button>
            <button
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'promotion'
                  ? "border-amber-500 text-amber-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
              onClick={() => setActiveTab('promotion')}
            >
              <TrendingUp className="h-3.5 w-3.5 inline mr-1" /> Promotion
            </button>
          </div>

          {/* Results Tab */}
          {activeTab === 'results' && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Roll No</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Promotion</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!computedResults ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                          Click "Preview Results" to compute.
                        </TableCell>
                      </TableRow>
                    ) : computedResults.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                          No results found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      computedResults.map((result) => (
                        <TableRow key={result.student_id}>
                          <TableCell className="font-medium">{result.student_name}</TableCell>
                          <TableCell>{result.roll_no}</TableCell>
                          <TableCell>
                            {result.percentage !== null ? `${result.percentage.toFixed(2)}%` : '-'}
                          </TableCell>
                          <TableCell>{result.grade || '-'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                result.promotion_status === 'promoted'
                                  ? 'success'
                                  : result.promotion_status === 'retained'
                                  ? 'warning'
                                  : 'secondary'
                              }
                            >
                              {result.promotion_status || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
                                const enrollment = result.student_id;
                                window.open(`${base}/reporting/report-cards/student/${enrollment}/pdf/`, '_blank');
                              }}
                              title="View Report Card"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Promotion Tab */}
          {activeTab === 'promotion' && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Promotion Preview</h3>
                {computedResults ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {computedResults.map((r) => (
                        <TableRow key={r.student_id}>
                          <TableCell>{r.student_name}</TableCell>
                          <TableCell>{r.percentage?.toFixed(2)}%</TableCell>
                          <TableCell>{r.grade}</TableCell>
                          <TableCell>
                            <Badge variant={r.promotion_status === 'promoted' ? 'success' : 'warning'}>
                              {r.promotion_status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-400">Compute results first to preview promotion status.</p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

import { cn } from '@/lib/utils';
