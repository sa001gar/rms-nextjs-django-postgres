'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSessions } from '@/hooks/use-sessions';
import { useClasses, useSections } from '@/hooks/use-classes';
import { useMarksGrid, useBulkSaveMarks } from '@/hooks/use-marks-grid';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { toast } from 'sonner';
import { Loader2, CheckCircle, AlertCircle, Save, FileSpreadsheet } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import type { GridEntry } from '@/lib/api/marks-grid';

export default function MarksEntryPage() {
  const { data: sessions = [] } = useSessions();
  const { data: classes = [] } = useClasses();

  const [sessionId, setSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');

  const { data: sections = [] } = useSections(classId);
  const { data: gridData, isLoading, refetch } = useMarksGrid(sessionId, classId, sectionId);
  const bulkSave = useBulkSaveMarks(sessionId, classId);

  // Local entries state for optimistic updates
  const [entries, setEntries] = useState<Record<string, GridEntry>>({});
  const [dirtyEntries, setDirtyEntries] = useState<Record<string, GridEntry>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved' | 'error'>('idle');
  const [focusCell, setFocusCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [modalEntries, setModalEntries] = useState<Record<string, GridEntry>>({});
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Flatten grid data into lookup
  useEffect(() => {
    if (!gridData) return;
    const map: Record<string, GridEntry> = {};
    gridData.entries.forEach((e: any) => {
      map[`${e.enrollment_id}:${e.subject_id}:${e.component_id}`] = e;
    });
    setEntries(map);

    if (gridData?.subjects?.length > 0) {
      setSelectedSubjectId((prev) => {
        const exists = gridData.subjects.some((s: any) => s.id === prev);
        if (exists || prev === 'all') return prev;
        return gridData.subjects[0].id;
      });
    }
  }, [gridData]);

  // Build column groups: subject → components
  const columnGroups = useMemo(() => {
    if (!gridData) return [];
    return gridData.subjects
      .filter((subj: any) => selectedSubjectId === 'all' || String(subj.id) === String(selectedSubjectId))
      .map((subj: any) => {
      const components = gridData.components.filter((comp: any) => {
        const key = `${comp.id}:${subj.id}`;
        const configVal = gridData.config_lookup[key];
        return configVal !== undefined && configVal !== null;
      });
      return { subject: subj, components };
    }).filter((g: any) => g.components.length > 0);
  }, [gridData, selectedSubjectId]);

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
      setDirtyEntries((prev) => ({ ...prev, [key]: updatedEntry }));
      setSaveStatus('unsaved');
    },
    [entries]
  );

  const handleSave = () => {
    const entriesToSave = Object.values(dirtyEntries);
    if (entriesToSave.length === 0) return;

    setSaveStatus('saving');
    bulkSave.mutate(entriesToSave, {
      onSuccess: () => {
        setSaveStatus('saved');
        setDirtyEntries({});
        toast.success('Marks saved successfully');
      },
      onError: () => {
        setSaveStatus('error');
        toast.error('Failed to save marks');
      },
    });
  };

  const handleOpenModal = (student: any) => {
    setEditingStudent(student);
    const copy: Record<string, GridEntry> = {};
    columnGroups.forEach((group) => {
      group.components.forEach((comp: any) => {
        const key = `${student.enrollment_id}:${group.subject.id}:${comp.id}`;
        const existing = entries[key];
        copy[key] = existing ? { ...existing } : {
          enrollment_id: student.enrollment_id,
          subject_id: group.subject.id,
          component_id: comp.id,
          marks_value: null,
          grade_value: null,
          descriptive_value: null,
          is_absent: false,
          remarks: '',
        };
      });
    });
    setModalEntries(copy);
  };

  const handleModalCellChange = (key: string, field: keyof GridEntry, value: any) => {
    setModalEntries((prev) => {
      const existing = prev[key];
      const updated = { ...existing, [field]: value };
      if (field === 'is_absent' && value === true) {
        updated.marks_value = null;
        updated.grade_value = null;
        updated.descriptive_value = null;
      }
      return { ...prev, [key]: updated };
    });
  };

  const handleApplyModal = () => {
    setEntries((prev) => ({ ...prev, ...modalEntries }));
    setDirtyEntries((prev) => ({ ...prev, ...modalEntries }));
    setSaveStatus('unsaved');
    setEditingStudent(null);
    toast.success(`Updated marks for ${editingStudent.name} locally. Click Save Changes to commit.`);
  };

  const handleBulkFillZero = useCallback(() => {
    if (!gridData) return;
    const newUpdates: Record<string, GridEntry> = {};
    let filledCount = 0;

    gridData.students.forEach((student: any) => {
      columnGroups.forEach((group: any) => {
        group.components.forEach((comp: any) => {
          const key = `${student.enrollment_id}:${group.subject.id}:${comp.id}`;
          const entry = entries[key];
          const hasValue = entry && (entry.marks_value !== null && entry.marks_value !== undefined || entry.grade_value || entry.is_absent);
          if (!hasValue) {
            newUpdates[key] = {
              enrollment_id: student.enrollment_id,
              subject_id: group.subject.id,
              component_id: comp.id,
              marks_value: comp.value_type === 'numeric' ? 0 : null,
              grade_value: comp.value_type === 'grade' ? 'D' : null,
              descriptive_value: comp.value_type === 'descriptive' ? 'Satisfactory' : null,
              is_absent: false,
              remarks: 'Bulk filled defaults',
            };
            filledCount++;
          }
        });
      });
    });

    if (filledCount > 0) {
      setEntries((prev) => ({ ...prev, ...newUpdates }));
      setDirtyEntries((prev) => ({ ...prev, ...newUpdates }));
      setSaveStatus('unsaved');
      toast.success(`Filled ${filledCount} empty cells with default values.`);
    } else {
      toast.info('No empty cells found to fill.');
    }
  }, [gridData, columnGroups, entries]);

  const handleBulkRevert = useCallback(() => {
    if (!gridData) return;
    const map: Record<string, GridEntry> = {};
    gridData.entries.forEach((e: any) => {
      map[`${e.enrollment_id}:${e.subject_id}:${e.component_id}`] = e;
    });
    setEntries(map);
    setDirtyEntries({});
    setSaveStatus('idle');
    toast.success('Reverted all unsaved changes');
  }, [gridData]);

  const isCellDirty = useCallback((enrollmentId: string, subjectId: string, componentId: string) => {
    const key = `${enrollmentId}:${subjectId}:${componentId}`;
    return !!dirtyEntries[key];
  }, [dirtyEntries]);

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
  let filledCells = 0;
  gridData.students.forEach((student: any) => {
    columnGroups.forEach((group: any) => {
      group.components.forEach((comp: any) => {
        const key = `${student.enrollment_id}:${group.subject.id}:${comp.id}`;
        const entry = entries[key];
        if (entry && (entry.marks_value !== null && entry.marks_value !== undefined || entry.grade_value || entry.is_absent)) {
          filledCells++;
        }
      });
    });
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Marks Entry"
        description="Spreadsheet-style marks entry. Don't forget to save your changes."
        actions={
          <div className="flex items-center gap-3">
            {saveStatus === 'unsaved' && (
              <span className="flex items-center text-sm text-amber-600 font-medium"><AlertCircle className="h-4 w-4 mr-1.5" /> Unsaved changes</span>
            )}
            {saveStatus === 'saving' && (
              <span className="flex items-center text-sm text-blue-600 font-medium"><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Saving...</span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center text-sm text-green-600 font-medium"><CheckCircle className="h-4 w-4 mr-1.5" /> Saved</span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center text-sm text-red-600 font-medium"><AlertCircle className="h-4 w-4 mr-1.5" /> Save error</span>
            )}
            {saveStatus === 'unsaved' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkRevert}
                className="text-gray-600 border-gray-300 hover:bg-gray-50 shadow-sm"
              >
                Revert Changes
              </Button>
            )}
            {columnGroups.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkFillZero}
                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 shadow-sm"
                title="Bulk fill empty visible cells with default values"
              >
                Fill Empty Cells
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={saveStatus !== 'unsaved' && saveStatus !== 'error'}
              className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card className="border-indigo-50 shadow-sm bg-white/50 backdrop-blur-sm">
        <CardContent className="p-4">
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
            <div className="w-56">
              <Select
                label="Subject"
                options={[
                  { value: 'all', label: 'All Subjects' },
                  ...(gridData?.subjects.map((s: any) => ({ value: s.id, label: s.name })) || []),
                ]}
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-10">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Spreadsheet Grid */}
      <Card className="shadow-sm border-gray-200 overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left py-3 px-3 text-gray-500 font-semibold border border-gray-200 bg-gray-50 sticky left-0 z-20 min-w-[40px]">
                  #
                </th>
                <th className="text-left py-3 px-3 text-gray-500 font-semibold border border-gray-200 bg-gray-50 sticky left-[40px] z-20 min-w-[80px]">
                  Roll No
                </th>
                <th className="text-left py-3 px-3 text-gray-500 font-semibold border border-gray-200 bg-gray-50 sticky left-[120px] z-20 min-w-[140px]">
                  Name
                </th>
                {columnGroups.map((group) => (
                  <th
                    key={group.subject.id}
                    colSpan={group.components.length}
                    className="text-center py-3 px-2 text-gray-600 font-semibold border border-gray-200 bg-gray-50 min-w-[60px]"
                  >
                    <div className="text-xs text-gray-400">{group.subject.code}</div>
                    <div className="font-semibold text-gray-700">{group.subject.name}</div>
                  </th>
                ))}
                <th className="text-center py-3 px-3 text-gray-500 font-semibold border border-gray-200 bg-gray-50 min-w-[100px]">
                  Actions
                </th>
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
                        className="text-center py-1.5 px-1 text-[10px] text-gray-400 font-normal border border-gray-200 bg-gray-50"
                        title={`${comp.exam_name} — ${comp.value_type}`}
                      >
                        {comp.name}
                        {fm ? <span className="text-gray-300 ml-0.5">({fm})</span> : null}
                      </th>
                    );
                  })
                )}
                <th className="border border-gray-200 bg-gray-50"></th>
              </tr>
            </thead>
            <tbody>
              {gridData.students.map((student: any, rowIdx: number) => {
                let colCursor = 0;
                return (
                  <tr key={student.enrollment_id} className="hover:bg-gray-50/50">
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
                        const cellDirty = isCellDirty(student.enrollment_id, group.subject.id, comp.id);

                        return (
                          <td
                            key={cellKey}
                            className={cn(
                              "py-0.5 px-1 border border-gray-200 text-center relative",
                              entry?.is_absent && "bg-red-50/80",
                              cellDirty && "bg-blue-50/20"
                            )}
                          >
                            {entry?.remarks && (
                              <div
                                className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-indigo-500"
                                title={`Remarks: ${entry.remarks}`}
                              />
                            )}
                            {comp.value_type === 'grade' ? (
                              <select
                                className={cn(
                                  "w-full text-center border-0 bg-transparent text-sm focus:outline-none cursor-pointer rounded py-0.5",
                                  cellDirty && "text-blue-700 font-medium"
                                )}
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
                                className={cn(
                                  "w-20 text-center border-0 bg-transparent text-sm focus:outline-none rounded py-0.5",
                                  cellDirty && "text-blue-700 font-medium"
                                )}
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
                                    : cellDirty
                                    ? "border-blue-400 bg-blue-50/40 text-blue-700 font-medium"
                                    : "border-transparent hover:border-gray-300 focus:border-amber-400 focus:ring-1 focus:ring-amber-400",
                                  entry?.is_absent && "text-red-500 font-medium bg-red-50/50"
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
                    <td className="py-1 px-3 border border-gray-200 text-center">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleOpenModal(student)}
                        className="text-indigo-600 hover:text-indigo-900 font-semibold hover:bg-indigo-50/50 rounded px-2 py-1"
                      >
                        Edit Details
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {columnGroups.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-200 rounded-xl">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center bg-gray-50/50">
            <FileSpreadsheet className="h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-base font-semibold text-gray-900">No Assessment Components</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              No exam components are configured for this subject. Please set up the assessment structure in configurations first.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Status Bar */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-500">
            <div className="flex flex-wrap items-center gap-6">
              <span><strong>{gridData.students.length}</strong> students</span>
              <span><strong>{columnGroups.length}</strong> subjects</span>
              <span><strong>{columnGroups.reduce((acc, g) => acc + g.components.length, 0)}</strong> components</span>
              <span><strong>{totalCells}</strong> cells</span>
              <span><strong className={filledCells === totalCells ? 'text-green-600' : 'text-amber-600'}>{filledCells}</strong> filled</span>
              <span><strong className="text-gray-400">{totalCells - filledCells}</strong> empty</span>
            </div>
            <div className="text-xs text-gray-400 italic bg-white border border-gray-100 rounded px-2.5 py-1 shadow-sm">
              Tip: Press Enter to go down, Tab to go right, type \"ABS\" for absent
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Details Modal */}
      <Modal
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        title="Edit Student Marks & Remarks"
        description={editingStudent ? `For ${editingStudent.name} (Roll No: ${editingStudent.roll_no})` : ''}
        size="lg"
      >
        <div className="p-5 space-y-5 bg-white">
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {columnGroups.map((group) => (
              <div key={group.subject.id} className="border border-gray-100 rounded-xl p-4 space-y-3.5 bg-gray-50/60">
                <h3 className="font-semibold text-gray-800 border-b pb-2 text-sm flex items-center justify-between">
                  <span>{group.subject.name}</span>
                  <span className="text-xs text-gray-400 font-mono">{group.subject.code}</span>
                </h3>
                <div className="space-y-4">
                  {group.components.map((comp: any) => {
                    const key = `${editingStudent?.enrollment_id}:${group.subject.id}:${comp.id}`;
                    const entry = modalEntries[key];
                    const fmKey = `${comp.id}:${group.subject.id}`;
                    const fm = gridData.config_lookup[fmKey];

                    return (
                      <div key={comp.id} className="grid grid-cols-12 gap-3 items-center border-b border-gray-100/55 pb-3 last:border-b-0 last:pb-0">
                        <div className="col-span-4">
                          <div className="text-sm font-semibold text-gray-700">{comp.name}</div>
                          <div className="text-xs text-gray-400 capitalize">{comp.value_type} {fm ? `(Max: ${fm})` : ''}</div>
                        </div>

                        {/* Marks Input */}
                        <div className="col-span-3">
                          {comp.value_type === 'grade' ? (
                            <select
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm h-9 border p-1.5 bg-white"
                              value={entry?.grade_value || ''}
                              onChange={(e) => handleModalCellChange(key, 'grade_value', e.target.value)}
                              disabled={entry?.is_absent}
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
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm h-9 border px-2.5 bg-white"
                              value={entry?.descriptive_value || ''}
                              onChange={(e) => handleModalCellChange(key, 'descriptive_value', e.target.value)}
                              disabled={entry?.is_absent}
                            />
                          ) : (
                            <input
                              type="number"
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm h-9 border px-2.5 bg-white"
                              value={entry?.marks_value !== null && entry?.marks_value !== undefined ? entry.marks_value : ''}
                              onChange={(e) => handleModalCellChange(key, 'marks_value', e.target.value === '' ? null : Number(e.target.value))}
                              disabled={entry?.is_absent}
                              placeholder="Marks"
                              min={0}
                              max={fm || undefined}
                            />
                          )}
                        </div>

                        {/* Absent Checkbox */}
                        <div className="col-span-2 flex items-center justify-center">
                          <label className="flex items-center space-x-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-4 w-4"
                              checked={!!entry?.is_absent}
                              onChange={(e) => handleModalCellChange(key, 'is_absent', e.target.checked)}
                            />
                            <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">Absent</span>
                          </label>
                        </div>

                        {/* Remarks */}
                        <div className="col-span-3">
                          <input
                            type="text"
                            placeholder="Remarks..."
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm h-9 border px-2.5 bg-white"
                            value={entry?.remarks || ''}
                            onChange={(e) => handleModalCellChange(key, 'remarks', e.target.value)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 bg-white">
            <Button variant="outline" onClick={() => setEditingStudent(null)} className="h-10">
              Cancel
            </Button>
            <Button onClick={handleApplyModal} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm h-10 px-5">
              Apply to Grid
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
