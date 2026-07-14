'use client';

import { useState } from 'react';
import { useSessions } from '@/hooks/use-sessions';
import { useClasses, useSections } from '@/hooks/use-classes';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabList, Tab, TabPanel, TabPanels } from '@/components/ui/tabs';
import { Download, BarChart3, FileText } from 'lucide-react';

const reportTabs = [
  { id: 'exports', label: 'Exports' },
  { id: 'analytics', label: 'Analytics' },
];

export default function ReportsPage() {
  const { data: sessions = [] } = useSessions();
  const { data: classes = [] } = useClasses();

  const [sessionId, setSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');

  const { data: sections = [] } = useSections(classId);

  const handleExportExcel = () => {
    if (!classId || !sectionId || !sessionId) return;
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    window.open(`${base}/reporting/export/excel/class/?class_id=${classId}&section_id=${sectionId}&session_id=${sessionId}`, '_blank');
  };

  const handleExportPdf = () => {
    if (!classId || !sectionId || !sessionId) return;
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    window.open(`${base}/reporting/export/pdf/class/?class_id=${classId}&section_id=${sectionId}&session_id=${sessionId}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" description="Export marksheets, report cards, and view analytics" />

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="w-56">
              <Select label="Session" placeholder="Select session"
                options={sessions.map((s: any) => ({ value: s.id, label: s.name }))}
                value={sessionId}
                onChange={(e) => { setSessionId(e.target.value); setClassId(''); setSectionId(''); }}
              />
            </div>
            <div className="w-56">
              <Select label="Class" placeholder="Select class"
                options={classes.map((c: any) => ({ value: c.id, label: c.name }))}
                value={classId}
                onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}
                disabled={!sessionId}
              />
            </div>
            <div className="w-56">
              <Select label="Section" placeholder="Select section"
                options={sections.map((s: any) => ({ value: s.id, label: s.name }))}
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                disabled={!classId}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs tabs={reportTabs} defaultValue="exports">
        <TabList>
          <Tab id="exports"><Download className="h-4 w-4 mr-1" /> Exports</Tab>
          <Tab id="analytics"><BarChart3 className="h-4 w-4 mr-1" /> Analytics</Tab>
        </TabList>
        <TabPanels>
          <TabPanel id="exports">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100"><FileText className="h-6 w-6 text-green-600" /></div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Excel Marksheet</h3>
                      <p className="text-sm text-gray-500">Download class marksheet as Excel file</p>
                    </div>
                    <Button variant="outline" onClick={handleExportExcel} disabled={!classId || !sectionId}>
                      <Download className="h-4 w-4 mr-1" /> Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100"><FileText className="h-6 w-6 text-red-600" /></div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Report Cards (PDF)</h3>
                      <p className="text-sm text-gray-500">Download all report cards as PDFs</p>
                    </div>
                    <Button variant="outline" onClick={handleExportPdf} disabled={!classId || !sectionId}>
                      <Download className="h-4 w-4 mr-1" /> Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabPanel>
          <TabPanel id="analytics">
            <Card>
              <CardContent className="p-6 text-center text-gray-400">
                <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                <p>Analytics dashboard — pass/fail ratios, grade distribution, and class performance trends.</p>
              </CardContent>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
