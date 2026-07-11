'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Select } from '@/components/ui/select';
import { Tabs, TabList, Tab, TabPanel, TabPanels } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { StatsCard } from '@/components/ui/stats-card';
import { Badge } from '@/components/ui/badge';
import {
  useSessions,
} from '@/hooks/use-sessions';
import { Loading } from '@/components/ui/loading';
import {
  usePassFailRatio,
  useSubjectDifficulty,
  useGradeDistribution,
  useTopPerformers,
  useBottomPerformers,
  useSessionComparison,
  useClassPerformance,
} from '@/hooks/use-analytics';
import { BarChart3, Users, TrendingUp, Award, AlertTriangle } from 'lucide-react';

const ANALYTICS_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'subjects', label: 'Subjects' },
  { id: 'performers', label: 'Performers' },
  { id: 'grades', label: 'Grades' },
  { id: 'sessions', label: 'Sessions' },
];

const GRADE_LABELS: Record<string, string> = {
  'A+': 'A+',
  'A': 'A',
  'A-': 'A-',
  'B+': 'B+',
  'B': 'B',
  'B-': 'B-',
  'C+': 'C+',
  'C': 'C',
  'C-': 'C-',
  'D': 'D',
  'F': 'F',
};

function LoadingSpinner() {
  return <Loading message="Loading analytics..." />;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center text-gray-500">
      <BarChart3 className="mx-auto mb-3 h-10 w-10 text-gray-300" />
      <p>{message}</p>
    </div>
  );
}

function OverviewTab({ sessionId }: { sessionId: string }) {
  const passFail = usePassFailRatio(sessionId);
  const classPerf = useClassPerformance(sessionId);

  if (passFail.isLoading || classPerf.isLoading) return <LoadingSpinner />;
  if (passFail.isError || classPerf.isError) return <EmptyState message="Failed to load overview data." />;
  if (!passFail.data || !classPerf.data) return <EmptyState message="No data available." />;

  const { total, passed, failed, pass_percentage } = passFail.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Students" value={total} icon={Users} />
        <StatsCard title="Passed" value={passed} icon={TrendingUp} description={`${pass_percentage.toFixed(1)}% pass rate`} />
        <StatsCard title="Failed" value={failed} icon={AlertTriangle} />
        <StatsCard title="Pass Rate" value={`${pass_percentage.toFixed(1)}%`} icon={BarChart3} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Pass/Fail Ratio</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-16 text-sm text-gray-600">Passed</span>
            <div className="flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-3 rounded-full bg-green-500 transition-all"
                style={{ width: `${pass_percentage}%` }}
              />
            </div>
            <span className="w-24 text-right text-sm font-medium text-gray-900">
              {passed} ({pass_percentage.toFixed(1)}%)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-16 text-sm text-gray-600">Failed</span>
            <div className="flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-3 rounded-full bg-red-500 transition-all"
                style={{ width: `${100 - pass_percentage}%` }}
              />
            </div>
            <span className="w-24 text-right text-sm font-medium text-gray-900">
              {failed} ({(100 - pass_percentage).toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Class Performance</h3>
        {classPerf.data.length === 0 ? (
          <EmptyState message="No class performance data." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Avg %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classPerf.data.map((cls) => (
                <TableRow key={cls.class_id}>
                  <TableCell className="font-medium">{cls.class_name}</TableCell>
                  <TableCell>{cls.student_count}</TableCell>
                  <TableCell>
                    <Badge variant={cls.avg_percentage >= 50 ? 'success' : 'danger'}>
                      {cls.avg_percentage.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function SubjectsTab({ sessionId }: { sessionId: string }) {
  const { data, isLoading, isError } = useSubjectDifficulty(sessionId);

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <EmptyState message="Failed to load subject data." />;
  if (!data || data.length === 0) return <EmptyState message="No subject data available." />;

  const sorted = [...data].sort((a, b) => a.avg_percentage - b.avg_percentage);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Subject Difficulty</h3>
      <p className="mb-4 text-sm text-gray-500">Sorted by average percentage (lowest first = hardest)</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead>
            <TableHead>Avg %</TableHead>
            <TableHead>Students</TableHead>
            <TableHead>Pass Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((s) => (
            <TableRow key={s.subject_id}>
              <TableCell className="font-medium">{s.subject}</TableCell>
              <TableCell>
                <Badge variant={s.avg_percentage >= 50 ? 'success' : 'danger'}>
                  {s.avg_percentage.toFixed(1)}%
                </Badge>
              </TableCell>
              <TableCell>{s.total_students}</TableCell>
              <TableCell>{s.pass_rate.toFixed(1)}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PerformersTab({ sessionId }: { sessionId: string }) {
  const top = useTopPerformers(sessionId);
  const bottom = useBottomPerformers(sessionId);

  if (top.isLoading || bottom.isLoading) return <LoadingSpinner />;
  if (top.isError || bottom.isError) return <EmptyState message="Failed to load performer data." />;

  const topData = top.data ?? [];
  const bottomData = bottom.data ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Top 10 Performers</h3>
        </div>
        {topData.length === 0 ? (
          <EmptyState message="No top performer data." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topData.map((p, i) => (
                <TableRow key={p.student_id}>
                  <TableCell className="font-medium">#{i + 1}</TableCell>
                  <TableCell>{p.student_name}</TableCell>
                  <TableCell className="text-gray-500">{p.student_id}</TableCell>
                  <TableCell>{p.class_name}</TableCell>
                  <TableCell>
                    <Badge variant="success">{p.percentage.toFixed(1)}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h3 className="text-lg font-semibold text-gray-900">Bottom 10 Performers</h3>
        </div>
        {bottomData.length === 0 ? (
          <EmptyState message="No bottom performer data." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bottomData.map((p, i) => (
                <TableRow key={p.student_id}>
                  <TableCell className="font-medium">#{i + 1}</TableCell>
                  <TableCell>{p.student_name}</TableCell>
                  <TableCell className="text-gray-500">{p.student_id}</TableCell>
                  <TableCell>{p.class_name}</TableCell>
                  <TableCell>
                    <Badge variant="danger">{p.percentage.toFixed(1)}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function GradesTab({ sessionId }: { sessionId: string }) {
  const { data, isLoading, isError } = useGradeDistribution(sessionId);

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <EmptyState message="Failed to load grade distribution." />;
  if (!data || Object.keys(data).length === 0) return <EmptyState message="No grade data available." />;

  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...entries.map(([, c]) => c));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Grade Distribution</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Grade</TableHead>
            <TableHead>Count</TableHead>
            <TableHead className="w-1/2">Percentage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(([grade, count]) => {
            const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
            return (
              <TableRow key={grade}>
                <TableCell className="font-medium">{GRADE_LABELS[grade] ?? grade}</TableCell>
                <TableCell>{count}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-2.5 rounded-full bg-amber-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm text-gray-600">{count}</span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SessionsTab({ currentSessionId }: { currentSessionId: string }) {
  const { data: sessionsData } = useSessions();
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([currentSessionId]);

  const comparison = useSessionComparison(selectedSessionIds);

  const toggleSession = (id: string) => {
    setSelectedSessionIds((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      return [...prev, id];
    });
  };

  const sessions = sessionsData ?? [];
  const data = comparison.data ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Session Comparison</h3>
        <p className="mb-4 text-sm text-gray-500">Select at least 2 sessions to compare</p>
        <div className="flex flex-wrap gap-2">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => toggleSession(s.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedSessionIds.includes(s.id)
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {comparison.isLoading ? (
          <LoadingSpinner />
        ) : comparison.isError ? (
          <EmptyState message="Failed to load comparison data." />
        ) : data.length === 0 ? (
          <EmptyState message={selectedSessionIds.length < 2 ? 'Select at least 2 sessions to compare.' : 'No comparison data available.'} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Pass Rate</TableHead>
                <TableHead>Fail Rate</TableHead>
                <TableHead>Passed</TableHead>
                <TableHead>Failed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s) => (
                <TableRow key={s.session_id}>
                  <TableCell className="font-medium">{s.session_name}</TableCell>
                  <TableCell>{s.total_students}</TableCell>
                  <TableCell>
                    <Badge variant="success">{s.pass_percentage.toFixed(1)}%</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="danger">{s.fail_percentage.toFixed(1)}%</Badge>
                  </TableCell>
                  <TableCell>{s.passed}</TableCell>
                  <TableCell>{s.failed}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { data: sessions, isLoading: sessionsLoading } = useSessions();
  const [sessionId, setSessionId] = useState('');

  const sessionOptions = (sessions ?? []).map((s) => ({
    value: s.id,
    label: s.name,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="View detailed performance analytics across sessions" />

      <div className="max-w-sm">
        <Select
          label="Session"
          placeholder="Select a session"
          options={sessionOptions}
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
        />
      </div>

      {sessionsLoading ? (
        <LoadingSpinner />
      ) : !sessionId ? (
        <EmptyState message="Select a session to view analytics." />
      ) : (
        <Tabs tabs={ANALYTICS_TABS} defaultValue="overview">
          <TabList>
            {ANALYTICS_TABS.map((tab) => (
              <Tab key={tab.id} id={tab.id} />
            ))}
          </TabList>
          <TabPanels>
            <TabPanel id="overview">
              <OverviewTab sessionId={sessionId} />
            </TabPanel>
            <TabPanel id="subjects">
              <SubjectsTab sessionId={sessionId} />
            </TabPanel>
            <TabPanel id="performers">
              <PerformersTab sessionId={sessionId} />
            </TabPanel>
            <TabPanel id="grades">
              <GradesTab sessionId={sessionId} />
            </TabPanel>
            <TabPanel id="sessions">
              <SessionsTab currentSessionId={sessionId} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}
    </div>
  );
}
