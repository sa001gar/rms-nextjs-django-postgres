'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { ReportCardData, ExamGroupData } from '@/types/report-card';

interface Props {
  data: ReportCardData;
}

export function DynamicReportCard({ data }: Props) {
  const { student, summary, subjects, co_scholastic, grading_scale, remarks } =
    data;

  return (
    <div className="mx-auto w-full max-w-[210mm] bg-white p-8 text-black border-2 border-gray-800 print:border-0">
      {/* Header */}
      <SchoolHeader data={data} />

      {/* Student Details */}
      <StudentDetails student={student} />

      {/* Scholastic Areas */}
      <ScholasticTable subjects={subjects} />

      {/* Grand Total Row */}
      <GrandTotalRow subjects={subjects} />

      {/* Overall Percentage Row */}
      <OverallPercentageRow subjects={subjects} />

      {/* Co-Scholastic Areas */}
      {co_scholastic.length > 0 && (
        <CoScholasticSection items={co_scholastic} />
      )}

      {/* Summary */}
      <SummaryCards summary={summary} />

      {/* Remarks */}
      {remarks.length > 0 && <RemarksSection remarks={remarks} />}

      {/* Grading Scale */}
      <GradingScale scale={grading_scale} />

      {/* Signatures */}
      <Signatures signatures={data.signatures} />
    </div>
  );
}

function SchoolHeader({ data }: { data: ReportCardData }) {
  return (
    <div className="text-center mb-6">
      {data.school.name && (
        <h1 className="text-2xl font-bold uppercase mb-1">
          {data.school.name}
        </h1>
      )}
      <p className="text-sm font-semibold mt-2">REPORT CARD</p>
      <p className="text-sm font-semibold">
        ACADEMIC SESSION {data.session.name}
      </p>
    </div>
  );
}

function StudentDetails({
  student,
}: {
  student: Props['data']['student'];
}) {
  const fields = [
    { label: "Student's Name", value: student.name },
    { label: "Father's Name", value: student.father_name },
    { label: "Mother's Name", value: student.mother_name },
    { label: 'Class', value: student.class_name },
    { label: 'Section', value: student.section_name },
    { label: 'Roll No.', value: student.roll_no },
    { label: 'Registration No.', value: student.registration_number },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm border border-black p-4">
      {fields.map((f) => (
        <div className="flex" key={f.label}>
          <span className="font-semibold w-40">{f.label}</span>
          <span>: {f.value || '-'}</span>
        </div>
      ))}
    </div>
  );
}

function ScholasticTable({
  subjects,
}: {
  subjects: Props['data']['subjects'];
}) {
  const scholastic = subjects.filter((s) => s.is_scholastic);
  if (scholastic.length === 0) return null;

  const examNames = collectExamNames(scholastic);

  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold mb-2">SCHOLASTIC AREAS</h3>
      <Table className="w-full text-sm border-collapse border border-black text-center">
        <TableHeader>
          <TableRow className="bg-gray-100">
            <TableHead
              className="border border-black p-1 text-left"
              rowSpan={2}
            >
              Subject
            </TableHead>
            {examNames.map((name) => (
              <TableHead
                key={name}
                className="border border-black p-1"
                colSpan={4}
              >
                {name}
              </TableHead>
            ))}
            <TableHead className="border border-black p-1" rowSpan={2}>
              Final<br />Result
            </TableHead>
          </TableRow>
          <TableRow className="bg-gray-50">
            {examNames.map((name) => (
              <React.Fragment key={name}>
                <TableHead className="border border-black p-1 w-12">
                  Marks<br />Obtained
                </TableHead>
                <TableHead className="border border-black p-1 w-12">
                  Max<br />Marks
                </TableHead>
                <TableHead className="border border-black p-1 w-12">
                  %
                </TableHead>
                <TableHead className="border border-black p-1 w-10">
                  Grade
                </TableHead>
              </React.Fragment>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {scholastic.map((subject) => (
            <SubjectRow
              key={subject.subject_id}
              subject={subject}
              examNames={examNames}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SubjectRow({
  subject,
  examNames,
}: {
  subject: Props['data']['subjects'][0];
  examNames: string[];
}) {
  const examMap = new Map<string, ExamGroupData>();
  for (const g of subject.exam_groups) {
    examMap.set(g.exam_name, g);
  }

  return (
    <TableRow>
      <TableCell className="border border-black p-1 text-left font-medium">
        {subject.subject_name}
      </TableCell>
      {examNames.map((name) => {
        const group = examMap.get(name);
        return (
          <React.Fragment key={name}>
            <TableCell className="border border-black p-1">
              {group ? group.total_obtained : '-'}
            </TableCell>
            <TableCell className="border border-black p-1">
              {group ? group.total_full : '-'}
            </TableCell>
            <TableCell className="border border-black p-1">
              {group?.percentage != null ? group.percentage.toFixed(1) : '-'}
            </TableCell>
            <TableCell className="border border-black p-1">
              {group?.grade ? (
                <GradeBadge grade={group.grade} />
              ) : (
                '-'
              )}
            </TableCell>
          </React.Fragment>
        );
      })}
      <TableCell className="border border-black p-1 font-semibold">
        <GradeBadge grade={subject.overall_grade} />
      </TableCell>
    </TableRow>
  );
}

function GrandTotalRow({
  subjects,
}: {
  subjects: Props['data']['subjects'];
}) {
  const scholastic = subjects.filter((s) => s.is_scholastic);
  const examNames = collectExamNames(scholastic);

  return (
    <TableRow className="font-bold bg-gray-100">
      <TableCell className="border border-black p-1 text-left">
        Grand Total
      </TableCell>
      {examNames.map((name) => {
        const totalObtained = scholastic.reduce(
          (acc, s) =>
            acc +
            (s.exam_groups.find((g) => g.exam_name === name)
              ?.total_obtained ?? 0),
          0
        );
        const totalFull = scholastic.reduce(
          (acc, s) =>
            acc +
            (s.exam_groups.find((g) => g.exam_name === name)?.total_full ??
              0),
          0
        );
        return (
          <React.Fragment key={name}>
            <TableCell className="border border-black p-1" colSpan={2}>
              {totalObtained} / {totalFull}
            </TableCell>
            <TableCell className="border border-black p-1"></TableCell>
            <TableCell className="border border-black p-1"></TableCell>
          </React.Fragment>
        );
      })}
      <TableCell className="border border-black p-1">
        {scholastic.reduce((acc, s) => acc + s.total_obtained, 0)} /{' '}
        {scholastic.reduce((acc, s) => acc + s.total_full, 0)}
      </TableCell>
    </TableRow>
  );
}

function OverallPercentageRow({
  subjects,
}: {
  subjects: Props['data']['subjects'];
}) {
  const scholastic = subjects.filter((s) => s.is_scholastic);
  const examNames = collectExamNames(scholastic);

  const overallObtained = scholastic.reduce(
    (acc, s) => acc + s.total_obtained,
    0
  );
  const overallFull = scholastic.reduce((acc, s) => acc + s.total_full, 0);
  const overallPct =
    overallFull > 0
      ? ((overallObtained / overallFull) * 100).toFixed(1)
      : '-';

  return (
    <TableRow className="font-bold">
      <TableCell className="border border-black p-1 text-left">
        Percentage
      </TableCell>
      {examNames.map((name) => {
        const totalObtained = scholastic.reduce(
          (acc, s) =>
            acc +
            (s.exam_groups.find((g) => g.exam_name === name)
              ?.total_obtained ?? 0),
          0
        );
        const totalFull = scholastic.reduce(
          (acc, s) =>
            acc +
            (s.exam_groups.find((g) => g.exam_name === name)?.total_full ??
              0),
          0
        );
        const pct =
          totalFull > 0
            ? ((totalObtained / totalFull) * 100).toFixed(1)
            : '-';
        return (
          <React.Fragment key={name}>
            <TableCell className="border border-black p-1" colSpan={4}>
              {pct}%
            </TableCell>
          </React.Fragment>
        );
      })}
      <TableCell className="border border-black p-1">{overallPct}%</TableCell>
    </TableRow>
  );
}

function CoScholasticSection({
  items,
}: {
  items: Props['data']['co_scholastic'];
}) {
  if (items.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold mb-2">CO-SCHOLASTIC AREAS</h3>
      <Table className="w-full text-sm border-collapse border border-black text-center">
        <TableHeader>
          <TableRow className="bg-gray-100">
            <TableHead className="border border-black p-1 text-left">
              Area
            </TableHead>
            <TableHead className="border border-black p-1 w-20">
              Grade
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, i) => (
            <TableRow key={i}>
              <TableCell className="border border-black p-1 text-left">
                {item.subject_name}
              </TableCell>
              <TableCell className="border border-black p-1">
                <GradeBadge grade={item.grade} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SummaryCards({
  summary,
}: {
  summary: Props['data']['summary'];
}) {
  if (!summary) return null;

  return (
    <div className="mb-6 p-4 bg-gray-50 border border-black text-sm">
      <h3 className="font-bold mb-3">SUMMARY</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <span className="text-gray-600">Total Marks</span>
          <p className="text-lg font-bold">
            {summary.total_marks_obtained} / {summary.total_marks_full}
          </p>
        </div>
        <div>
          <span className="text-gray-600">Overall Percentage</span>
          <p className="text-lg font-bold">
            {summary.overall_percentage?.toFixed(1) ?? '-'}%
          </p>
        </div>
        <div>
          <span className="text-gray-600">Overall Grade</span>
          <p className="text-lg font-bold">
            <GradeBadge grade={summary.overall_grade} />
          </p>
        </div>
        {summary.promotion_status && (
          <div>
            <span className="text-gray-600">Promotion Status</span>
            <p className="text-lg font-bold">
              <Badge
                variant={
                  summary.promotion_status === 'promoted'
                    ? 'success'
                    : 'warning'
                }
              >
                {summary.promotion_status.toUpperCase()}
              </Badge>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function RemarksSection({
  remarks,
}: {
  remarks: Props['data']['remarks'];
}) {
  return (
    <div className="mb-6 text-sm">
      <h3 className="font-bold mb-1">REMARKS</h3>
      {remarks.map((r, i) => (
        <div key={i} className="mb-2">
          <span className="font-semibold capitalize">{r.remark_type}: </span>
          <span className="italic">{r.content}</span>
        </div>
      ))}
    </div>
  );
}

function GradingScale({
  scale,
}: {
  scale: Props['data']['grading_scale'];
}) {
  if (!scale || scale.length === 0) return null;

  return (
    <div className="mb-6 text-sm">
      <h3 className="font-bold mb-2">GRADING SCALE (Scholastic)</h3>
      <Table className="w-full border-collapse border border-black text-center text-xs">
        <TableHeader>
          <TableRow className="bg-gray-100">
            <TableHead className="border border-black p-1">
              Marks Range
            </TableHead>
            <TableHead className="border border-black p-1">Grade</TableHead>
            <TableHead className="border border-black p-1">
              Grade Point
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scale.map((entry, i) => (
            <TableRow key={i}>
              <TableCell className="border border-black p-1">
                {entry.min_percentage} - {entry.max_percentage}%
              </TableCell>
              <TableCell className="border border-black p-1 font-semibold">
                <GradeBadge grade={entry.grade} />
              </TableCell>
              <TableCell className="border border-black p-1">
                {entry.grade_point}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Signatures({
  signatures,
}: {
  signatures: Props['data']['signatures'];
}) {
  return (
    <div className="flex justify-between mt-16 pt-8 border-t border-gray-300 text-sm font-semibold">
      {signatures.map((sig, i) => (
        <div key={i} className="text-center w-32">
          <div className="border-t border-black pt-1">{sig.label}</div>
        </div>
      ))}
    </div>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  if (!grade || grade === 'N/A') return <span className="text-gray-400">-</span>;
  const variant = getGradeVariant(grade);
  return <Badge variant={variant}>{grade}</Badge>;
}

function getGradeVariant(
  grade: string
): 'success' | 'info' | 'warning' | 'danger' {
  const g = grade.toUpperCase();
  if (g === 'AA' || g === 'A+' || g === 'A') return 'success';
  if (g === 'B+' || g === 'B') return 'info';
  if (g === 'C+' || g === 'C') return 'warning';
  return 'danger';
}

function collectExamNames(subjects: Props['data']['subjects']): string[] {
  const names = new Set<string>();
  for (const s of subjects) {
    for (const g of s.exam_groups) {
      names.add(g.exam_name);
    }
  }
  return Array.from(names).sort();
}
