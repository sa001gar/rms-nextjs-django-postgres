'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSessions } from '@/hooks/use-sessions';
import { useClasses } from '@/hooks/use-classes';
import { useSubjectAssignments } from '@/hooks/use-subjects';
import { examComponentsApi, assessmentSchemesApi } from '@/lib/api/exams';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Loading } from '@/components/ui/loading';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

type CellValue = { full_marks: number; is_active: boolean };

function cellKey(subjectId: string, componentId: string) {
  return `${subjectId}_${componentId}`;
}

export default function AssessmentSchemesPage() {
  const queryClient = useQueryClient();
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions();
  const { data: classes = [], isLoading: classesLoading } = useClasses();
  const [sessionId, setSessionId] = useState('');
  const [classId, setClassId] = useState('');

  const { data: classSubjects = [], isLoading: subjectsLoading } =
    useSubjectAssignments(classId);

  const { data: examComponents = [], isLoading: componentsLoading } = useQuery({
    queryKey: ['exam-components'],
    queryFn: () => examComponentsApi.getAll(),
  });

  const { data: schemes = [], isLoading: schemesLoading } = useQuery({
    queryKey: ['subject-assessment-schemes', classId, sessionId],
    queryFn: () =>
      assessmentSchemesApi.getAll({ class_id: classId, session_id: sessionId }),
    enabled: !!classId && !!sessionId,
  });

  const isLoading =
    sessionsLoading ||
    classesLoading ||
    subjectsLoading ||
    componentsLoading ||
    schemesLoading;

  const [edits, setEdits] = useState<Record<string, CellValue>>({});

  useEffect(() => {
    setEdits({});
  }, [classId, sessionId]);

  const schemeMap = useMemo(() => {
    const map: Record<string, (typeof schemes)[number]> = {};
    schemes.forEach((s) => {
      map[cellKey(s.subject_id, s.exam_component_id)] = s;
    });
    return map;
  }, [schemes]);

  const getComponentDefault = useCallback(
    (componentId: string) => {
      const comp = examComponents.find((c) => c.id === componentId);
      return comp?.full_marks ?? 0;
    },
    [examComponents],
  );

  const getCellValue = useCallback(
    (subjectId: string, componentId: string): CellValue => {
      const key = cellKey(subjectId, componentId);
      if (edits[key] !== undefined) return edits[key];
      const scheme = schemeMap[key];
      if (scheme)
        return { full_marks: scheme.full_marks, is_active: scheme.is_active };
      return { full_marks: getComponentDefault(componentId), is_active: false };
    },
    [edits, schemeMap, getComponentDefault],
  );

  const updateCell = (
    subjectId: string,
    componentId: string,
    field: 'full_marks' | 'is_active',
    value: number | boolean,
  ) => {
    const key = cellKey(subjectId, componentId);
    setEdits((prev) => {
      const current = prev[key] ?? getCellValue(subjectId, componentId);
      return { ...prev, [key]: { ...current, [field]: value } };
    });
  };

  const handleSave = async () => {
    const mappings: {
      class_id: string;
      subject_id: string;
      session_id: string;
      exam_component_id: string;
      full_marks: number;
      is_active: boolean;
    }[] = [];

    classSubjects.forEach((cs) => {
      const subjectId = cs.subject?.id || (cs as any).subject_id;
      if (!subjectId) return;
      examComponents.forEach((comp) => {
        const val = getCellValue(subjectId, comp.id);
        mappings.push({
          class_id: classId,
          subject_id: subjectId,
          session_id: sessionId,
          exam_component_id: comp.id,
          full_marks: val.full_marks,
          is_active: val.is_active,
        });
      });
    });

    try {
      await assessmentSchemesApi.bulkSave(mappings);
      toast.success('Assessment schemes saved');
      queryClient.invalidateQueries({
        queryKey: ['subject-assessment-schemes', classId, sessionId],
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save assessment schemes',
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment Schemes"
        description="Configure subject assessment schemes by class and session"
        actions={
          <Button
            onClick={handleSave}
            disabled={!classId || !sessionId}
          >
            <Save className="h-4 w-4" />
            Save All
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Select
              label="Session"
              placeholder="Select session"
              options={sessions.map((s) => ({ value: s.id, label: s.name }))}
              value={sessionId}
              onChange={(e) => {
                setSessionId(e.target.value);
                setClassId('');
              }}
            />
            <Select
              label="Class"
              placeholder="Select class"
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              disabled={!sessionId}
            />
          </div>
        </CardContent>
      </Card>

      {classId && sessionId ? (
        isLoading ? (
          <Loading />
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Subject</TableHead>
                    {examComponents.map((comp) => (
                      <TableHead key={comp.id} className="text-center min-w-[140px]">
                        {comp.name}
                        {comp.full_marks != null && (
                          <span className="block text-xs text-gray-400 font-normal">
                            default: {comp.full_marks}
                          </span>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classSubjects.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={examComponents.length + 1}
                        className="text-center text-gray-500 py-8"
                      >
                        No subjects assigned to this class
                      </TableCell>
                    </TableRow>
                  ) : (
                    classSubjects.map((cs) => {
                      const subjectId =
                        cs.subject?.id ||
                        (cs as any).subject_id;
                      const subjectName = cs.subject?.name || '';
                      if (!subjectId) return null;
                      return (
                        <TableRow key={cs.id}>
                          <TableCell className="font-medium">
                            {subjectName}
                          </TableCell>
                          {examComponents.map((comp) => {
                            const val = getCellValue(subjectId, comp.id);
                            return (
                              <TableCell key={comp.id} className="text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={val.full_marks}
                                    onChange={(e) =>
                                      updateCell(
                                        subjectId,
                                        comp.id,
                                        'full_marks',
                                        Number(e.target.value),
                                      )
                                    }
                                    className="w-20 text-center"
                                  />
                                  <Checkbox
                                    checked={val.is_active}
                                    onChange={(checked) =>
                                      updateCell(
                                        subjectId,
                                        comp.id,
                                        'is_active',
                                        checked,
                                      )
                                    }
                                    label="Active"
                                  />
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Select a session and class to configure assessment schemes
          </CardContent>
        </Card>
      )}
    </div>
  );
}
