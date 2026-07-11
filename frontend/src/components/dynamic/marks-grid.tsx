'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2 } from 'lucide-react';
import type { ExamComponent } from '@/types/exam';

export interface MarksGridRow {
  enrollment_id: string;
  student_name: string;
  roll_no: string;
  marks_value: number | null;
  grade_value: string | null;
  descriptive_value: string | null;
  is_absent: boolean;
  existing_id?: string;
  remarks?: string;
}

interface MarksGridProps {
  students: MarksGridRow[];
  examComponent: ExamComponent;
  gradeOptions?: { label: string; value: string }[];
  fullMarks: number;
  onSave: (rows: MarksGridRow[]) => Promise<void>;
  isSaving?: boolean;
}

type CellValue = number | string | null;

export function MarksGrid({
  students,
  examComponent,
  gradeOptions = [],
  fullMarks,
  onSave,
  isSaving,
}: MarksGridProps) {
  const [rows, setRows] = useState<MarksGridRow[]>(students);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | HTMLSelectElement | null)[]>([]);

  useEffect(() => {
    setRows(students);
  }, [students]);

  const updateRow = useCallback((index: number, partial: Partial<MarksGridRow>) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...partial };
      return next;
    });
  }, []);

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && index < rows.length - 1) {
      e.preventDefault();
      setFocusIndex(index + 1);
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      setFocusIndex(index - 1);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const inputType = examComponent.value_type;
  const isNumeric = inputType === 'numeric';
  const isGrade = inputType === 'grade';
  const isDescriptive = inputType === 'descriptive';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {examComponent.name} ({isNumeric ? `Max: ${fullMarks}` : inputType})
          {' | '} {rows.filter((r) => !r.is_absent && (r.marks_value != null || r.grade_value || r.descriptive_value)).length} of {rows.length} entered
        </div>
        <Button onClick={() => onSave(rows)} disabled={isSaving} size="sm">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save All
        </Button>
      </div>

      <div className="max-h-[600px] overflow-auto border rounded-md">
        <Table>
          <TableHeader className="sticky top-0 bg-white">
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Roll No</TableHead>
              <TableHead className="w-24">Absent</TableHead>
              <TableHead>
                {isNumeric ? `Marks (/${fullMarks})` : isGrade ? 'Grade' : 'Comment'}
              </TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow
                key={row.enrollment_id}
                className={focusIndex === i ? 'bg-amber-50' : ''}
              >
                <TableCell className="text-gray-400 text-xs">{i + 1}</TableCell>
                <TableCell className="font-medium">{row.student_name}</TableCell>
                <TableCell>{row.roll_no}</TableCell>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={row.is_absent}
                    onChange={(e) => {
                      updateRow(i, {
                        is_absent: e.target.checked,
                        marks_value: e.target.checked ? null : row.marks_value,
                        grade_value: e.target.checked ? null : row.grade_value,
                        descriptive_value: e.target.checked ? null : row.descriptive_value,
                      });
                    }}
                    className="h-4 w-4"
                  />
                </TableCell>
                <TableCell>
                  {row.is_absent ? (
                    <span className="text-gray-400 text-sm">ABSENT</span>
                  ) : isNumeric ? (
                    <Input
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="number"
                      min={0}
                      max={fullMarks}
                      step={0.01}
                      value={row.marks_value ?? ''}
                      onChange={(e) => updateRow(i, {
                        marks_value: e.target.value ? Number(e.target.value) : null,
                      })}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onFocus={() => setFocusIndex(i)}
                      className="w-24"
                    />
                  ) : isGrade ? (
                    <select
                      ref={(el) => { inputRefs.current[i] = el; }}
                      value={row.grade_value ?? ''}
                      onChange={(e) => updateRow(i, { grade_value: e.target.value || null })}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onFocus={() => setFocusIndex(i)}
                      className="w-24 border rounded px-2 py-1 text-sm"
                    >
                      <option value="">—</option>
                      {gradeOptions.map((g) => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      ref={(el) => { inputRefs.current[i] = el; }}
                      value={row.descriptive_value ?? ''}
                      onChange={(e) => updateRow(i, { descriptive_value: e.target.value || null })}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onFocus={() => setFocusIndex(i)}
                      className="w-48"
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    value={row.remarks ?? ''}
                    onChange={(e) => updateRow(i, { remarks: e.target.value })}
                    className="w-32"
                    placeholder="Remarks"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
