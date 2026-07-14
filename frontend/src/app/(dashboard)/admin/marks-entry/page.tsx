'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSessions } from '@/hooks/use-sessions';
import { useClasses, useSections } from '@/hooks/use-classes';
import { useMarksGrid, useUpdateMarkCell } from '@/hooks/use-marks-grid';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { toast } from 'sonner';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { GridEntry } from '@/lib/api/marks-grid';

export default function MarksEntryPage() {
  const { data: sessions = [] } = useSessions();
  const { data: classes = [] } = useClasses();

  const [sessionId, setSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');

  const { data: sections = [] } = useSections(classId);
  const { data: gridData, isLoading, refetch } = useMarksGrid(sessionId, classId, sectionId);
  const updateCell = useUpdateMarkCell(sessionId, classId);

  // Local entries state for optimistic updates
  const [entries, setEntries] = useState<Record<string, GridEntry>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [focusCell, setFocusCell] = useState<{ row: number; col: number } | null>(null);
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Flatten grid data into lookup
  useEffect(() => {
    if (!gridData) return;
    const map: Record<string, GridEntry> = {};
    gridData.entries.forEach((e: any) => {
      map[`${e.enrollment_id}:${e.subject_id}:${e.component_id}`] = e;
    });
    setEntries(map);
  }, [gridData]);

  // Build column groups: subject → components
  const columnGroups = useMemo(() => {
    if (!gridData) return [];
    return gridData.subjects.map((subj: any) => {
      const components = gridData.components.filter((comp: any) => {
        const key = `${comp.id}:${subj.id}`;
        const configVal = gridData.config_lookup[key];
        return configVal !== undefined && configVal !== null;
      });
      return { subject: subj, components };
    }).filter((g: any) => g.components.length > 0);
  }, [gridData]);

  const allFiltersSelected = !!(sessionId && classId);

  const handleCellChange = useCallback(
    (enrollmentId: string, subjectId: string, componentId: string, value: string) => {
      const key = `${enrollmentId}:${subjectId}:${componentId}`;
      const existing = entries[key];

      const marksValue = value === '' ? null : Number(value);
      const isAbsent = value.toUpperCase() === 'ABS';

      const updatedEntry: GridEntry = {
        enrollment_id: enrollmentId,
        subject_id: subjectId,
        component_id: componentId,
        marks_value: isAbsent ? null : marksValue,
        grade_value: existing?.grade_value || null,
        descriptive_value: existing?.descriptive_value || null,
        is_absent: isAbsent,
        remarks: existing?.remarks || '',
      };

      setEntries((prev) => ({ ...prev, [key]: updatedEntry }));
      setSaveStatus('saving');

      // Debounced auto-save
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        updateCell.mutate(updatedEntry, {
          onSuccess: () => setSaveStatus('saved'),
          onError: () => setSaveStatus('error'),
        });
      }, 500);
    },
    [entries, updateCell]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
      const totalRows = gridData?.students.length || 0;
      const totalCols = columnGroups.reduce((acc, g) => acc + g.components.length, 0);

      let nextRow = rowIdx;
      let nextCol = colIdx;

      switch (e.key) {
        case 'ArrowDown':
          nextRow = Math.min(rowIdx + 1, totalRows - 1);
          e.preventDefault();
          break;
        case 'ArrowUp':
          nextRow = Math.max(rowIdx - 1, 0);
          e.preventDefault();
          break;
        case 'Tab':
          if (e.shiftKey) {
            nextCol = Math.max(colIdx - 1, 0);
          } else {
            nextCol = Math.min(colIdx + 1, totalCols - 1);
          }
          e.preventDefault();
          break;
        case 'Enter':
          nextRow = Math.min(rowIdx + 1, totalRows - 1);
          e.preventDefault();
          break;
        default:
          return;
      }

      setFocusCell({ row: nextRow, col: nextCol });
      // Focus the next cell
      const student = gridData?.students[nextRow];
      if (!student) return;
      let colCursor = 0;
      for (const group of columnGroups) {
        for (const comp of group.components) {
          if (colCursor === nextCol) {
            const cellKey = `${student.enrollment_id}:${group.subject.id}:${comp.id}`;
            setTimeout(() => cellRefs.current[cellKey]?.focus(), 50);
            return;
          }
          colCursor++;
        }
      }
    },
    [gridData, columnGroups]
  );

  if (!allFiltersSelected) {
    return (
      <div className="space-y-6">
        <PageHeader title="Marks Entry" description="Enter marks using the spreadsheet grid" />
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="w-56">
                <Select
                  label="Session"
                  placeholder="Select session"
                  options={sessions.map((s: any) => ({ value: s.id, label: s.name }))}
                  value={sessionId}
                  onChange={(e) => { setSessionId(e.target.value); setClassId(''); setSectionId(''); }}
                />
              </div>
              <div className="w-56">
                <Select
                  label="Class"
                  placeholder="Select class"
                  options={classes.map((c: any) => ({ value: c.id, label: c.name }))}
                  value={classId}
                  onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}
                  disabled={!sessionId}
                />
              </div>
              <div className="w-56">
                <Select
                  label="Section (optional)"
                  placeholder="All sections"
                  options={sections.map((s: any) => ({ value: s.id, label: s.name }))}
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  disabled={!classId}
                />
              </div>
            </div>
            <p className="mt-6 text-sm text-gray-400">Select session and class to load the marks grid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) return <Loading message="Loading marks grid..." />;
  if (!gridData) return <div className="text-gray-500">No data found.</div>;

  const totalCells = columnGroups.reduce((acc, g) => acc + g.components.length, 0) * gridData.students.length;
  const filledCells = Object.keys(entries).filter(
    (k) => entries[k].marks_value !== null || entries[k].grade_value || entries[k].is_absent
  ).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Marks Entry"
        description="Spreadsheet-style marks entry with auto-save"
        actions={
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <span className="flex items-center text-sm text-amber-600"><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Saving...</span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center text-sm text-green-600"><CheckCircle className="h-3.5 w-3.5 mr-1" /> All changes saved</span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center text-sm text-red-600"><AlertCircle className="h-3.5 w-3.5 mr-1" /> Save error</span>
            )}
          </div>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex gap-4 items-end">
            <div className="w-48">
              <Select
                label="Session"
                options={sessions.map((s: any) => ({ value: s.id, label: s.name }))}
                value={sessionId}
                onChange={(e) => { setSessionId(e.target.value); setClassId(''); setSectionId(''); }}
              />
            </div>
            <div className="w-48">
              <Select
                label="Class"
                options={classes.map((c: any) => ({ value: c.id, label: c.name }))}
                value={classId}
                onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}
                disabled={!sessionId}
              />
            </div>
            <div className="w-48">
              <Select
                label="Section"
                options={[
                  { value: '', label: 'All Sections' },
                  ...sections.map((s: any) => ({ value: s.id, label: s.name })),
                ]}
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Spreadsheet Grid */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 text-gray-500 font-medium border border-gray-200 bg-gray-50 sticky left-0 z-20 min-w-[40px]">
                  #
                </th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium border border-gray-200 bg-gray-50 sticky left-[40px] z-20 min-w-[80px]">
                  Roll No
                </th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium border border-gray-200 bg-gray-50 sticky left-[120px] z-20 min-w-[140px]">
                  Name
                </th>
                {columnGroups.map((group) => (
                  <th
                    key={group.subject.id}
                    colSpan={group.components.length}
                    className="text-center py-2 px-2 text-gray-500 font-medium border border-gray-200 bg-gray-50 min-w-[60px]"
                  >
                    <div className="text-xs text-gray-400">{group.subject.code}</div>
                    <div className="font-semibold text-gray-700">{group.subject.name}</div>
                  </th>
                ))}
              </tr>
              <tr>
                <th className="border border-gray-200 bg-gray-50 sticky left-0 z-10" colSpan={3}></th>
                {columnGroups.map((group) =>
                  group.components.map((comp: any) => {
                    const key = `${comp.id}:${group.subject.id}`;
                    const fm = gridData.config_lookup[key];
                    return (
                      <th
                        key={comp.id + group.subject.id}
                        className="text-center py-1 px-1 text-[10px] text-gray-400 font-normal border border-gray-200 bg-gray-50"
                        title={`${comp.exam_name} — ${comp.value_type}`}
                      >
                        {comp.name}
                        {fm ? <span className="text-gray-300 ml-0.5">({fm})</span> : null}
                      </th>
                    );
                  })
                )}
              </tr>
            </thead>
            <tbody>
              {gridData.students.map((student: any, rowIdx: number) => {
                let colCursor = 0;
                return (
                  <tr key={student.enrollment_id} className="hover:bg-gray-50">
                    <td className="py-1.5 px-3 text-gray-400 border border-gray-200 sticky left-0 z-10 bg-white">
                      {rowIdx + 1}
                    </td>
                    <td className="py-1.5 px-3 font-medium border border-gray-200 sticky left-[40px] z-10 bg-white">
                      {student.roll_no}
                    </td>
                    <td className="py-1.5 px-3 border border-gray-200 sticky left-[120px] z-10 bg-white truncate max-w-[140px]">
                      {student.name}
                    </td>
                    {columnGroups.map((group) =>
                      group.components.map((comp: any) => {
                        const key = `${student.enrollment_id}:${group.subject.id}:${comp.id}`;
                        const entry = entries[key];
                        const cellKey = `${student.enrollment_id}:${group.subject.id}:${comp.id}`;
                        const isFocused =
                          focusCell?.row === rowIdx && focusCell?.col === colCursor;
                        const currentCol = colCursor;
                        colCursor++;

                        return (
                          <td
                            key={cellKey}
                            className={cn(
                              "py-0.5 px-1 border border-gray-200 text-center",
                              entry?.is_absent && "bg-red-50"
                            )}
                          >
                            {comp.value_type === 'grade' ? (
                              <select
                                className="w-full text-center border-0 bg-transparent text-sm focus:outline-none cursor-pointer"
                                value={entry?.grade_value || ''}
                                onChange={(e) =>
                                  handleCellChange(
                                    student.enrollment_id,
                                    group.subject.id,
                                    comp.id,
                                    e.target.value
                                  )
                                }
                              >
                                <option value="">-</option>
                                <option value="A1">A1</option>
                                <option value="A2">A2</option>
                                <option value="B1">B1</option>
                                <option value="B2">B2</option>
                                <option value="C1">C1</option>
                                <option value="C2">C2</option>
                                <option value="D">D</option>
                                <option value="E">E</option>
                              </select>
                            ) : comp.value_type === 'descriptive' ? (
                              <input
                                type="text"
                                className="w-20 text-center border-0 bg-transparent text-sm focus:outline-none"
                                value={entry?.descriptive_value || ''}
                                onChange={(e) =>
                                  handleCellChange(
                                    student.enrollment_id,
                                    group.subject.id,
                                    comp.id,
                                    e.target.value
                                  )
                                }
                              />
                            ) : (
                              <input
                                ref={(el) => { cellRefs.current[cellKey] = el; }}
                                type="text"
                                className={cn(
                                  "w-14 text-center border rounded px-1 py-0.5 text-sm transition-colors",
                                  isFocused
                                    ? "border-amber-400 ring-1 ring-amber-400"
                                    : "border-transparent hover:border-gray-300 focus:border-amber-400 focus:ring-1 focus:ring-amber-400",
                                  entry?.is_absent && "text-red-500 font-medium"
                                )}
                                value={
                                  entry?.is_absent
                                    ? 'ABS'
                                    : entry?.marks_value !== null && entry?.marks_value !== undefined
                                    ? String(entry.marks_value)
                                    : ''
                                }
                                placeholder="-"
                                onFocus={() => setFocusCell({ row: rowIdx, col: currentCol })}
                                onChange={(e) =>
                                  handleCellChange(
                                    student.enrollment_id,
                                    group.subject.id,
                                    comp.id,
                                    e.target.value
                                  )
                                }
                                onKeyDown={(e) => handleKeyDown(e, rowIdx, currentCol)}
                              />
                            )}
                          </td>
                        );
                      })
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Status Bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <span><strong>{gridData.students.length}</strong> students</span>
            <span><strong>{columnGroups.length}</strong> subjects</span>
            <span><strong>{columnGroups.reduce((acc, g) => acc + g.components.length, 0)}</strong> components</span>
            <span><strong>{totalCells}</strong> cells</span>
            <span><strong className={filledCells === totalCells ? 'text-green-600' : 'text-amber-600'}>{filledCells}</strong> filled</span>
            <span><strong className="text-gray-400">{totalCells - filledCells}</strong> empty</span>
            <span>Tip: Press Enter to go down, Tab to go right, type "ABS" for absent</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
