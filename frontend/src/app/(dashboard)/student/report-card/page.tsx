'use client';

import { useState, useRef } from 'react';
import { useSessions, useActiveSession } from '@/hooks/use-sessions';
import { useStudent } from '@/stores/auth-store';
import { useReportCard } from '@/hooks/use-report-card';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectOption } from '@/components/ui/select';
import { BoneyardCard } from '@/components/ui/boneyard';
import { DynamicReportCard } from '@/components/report-card';
import { Download, Printer, Loader2 } from 'lucide-react';

export default function StudentReportCardPage() {
  const student = useStudent();
  const { data: sessions, isLoading: sessionsLoading } = useSessions();
  const { data: activeSession } = useActiveSession();
  const [selectedSession, setSelectedSession] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const sessionId = selectedSession || activeSession?.id || '';
  const {
    data: reportCard,
    isLoading,
    error,
  } = useReportCard(student?.id || '', sessionId);

  const sessionOptions: SelectOption[] = (sessions || []).map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!student?.id) return;
    setIsDownloading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/reporting/report-cards/by-user/${student.id}/pdf/?session_id=${sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to download PDF');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-card-${reportCard?.student.name || student.id}.pdf`;
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
        <PageHeader
          title="Report Card"
          description="View your academic report card"
        />
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
            <Button
              onClick={handleDownloadPdf}
              disabled={isDownloading || !student?.id}
            >
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
        <div ref={printRef}>
          <Card>
            <CardContent className="p-8">
              <DynamicReportCard data={reportCard} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
