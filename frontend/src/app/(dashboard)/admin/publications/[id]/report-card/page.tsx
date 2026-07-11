'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { ReportCard } from '@/components/report-card';
import api from '@/lib/api/client';
import { useState } from 'react';
import { Select } from '@/components/ui/select';

export default function ReportCardsPage() {
  const params = useParams();
  const publicationId = params.id as string;
  const [selectedStudent, setSelectedStudent] = useState<string>('all');

  // We would normally have a specific API for report cards
  // that aggregates all student data (marks, attendance, subjects).
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['report-cards', publicationId],
    queryFn: async () => {
      // Mocked endpoint call, in reality we'd need a backend endpoint that aggregates 
      // all data for the report card based on publication.class_id and section_id
      const data = await api.get<any>(`/results/publications/${publicationId}/report-cards/`);
      return data;
    },
    // We disable this query until backend supports it, we'll just mock for now
    enabled: false, 
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return <Loading />;
  }

  // MOCK DATA FOR DEMO PURPOSES
  // In a real implementation, the backend would aggregate marks entries, attendances, etc.
  const mockStudents = [
    { id: '1', name: 'Aliva Chakraborty', rollNo: '1', regNo: 'B/21/280' },
    { id: '2', name: 'John Doe', rollNo: '2', regNo: 'B/21/281' },
  ];

  const currentStudent = selectedStudent === 'all' ? mockStudents[0] : mockStudents.find(s => s.id === selectedStudent);

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="Report Cards"
          description="View and print student report cards"
          actions={
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          }
        />
        
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="w-64">
              <Select
                label="Select Student"
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                options={[
                  { label: 'All Students (Print All)', value: 'all' },
                  ...mockStudents.map(s => ({ label: `${s.rollNo} - ${s.name}`, value: s.id }))
                ]}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="print-container">
        {selectedStudent === 'all' ? (
          <div className="space-y-12">
            {mockStudents.map((s, idx) => (
              <div key={s.id} className={idx > 0 ? 'page-break-before' : ''}>
                <ReportCard studentName={s.name} rollNo={s.rollNo} regNo={s.regNo} />
              </div>
            ))}
          </div>
        ) : (
          <ReportCard studentName={currentStudent?.name || ''} rollNo={currentStudent?.rollNo || ''} regNo={currentStudent?.regNo || ''} />
        )}
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .page-break-before {
            page-break-before: always;
          }
        }
      `}</style>
    </div>
  );
}
