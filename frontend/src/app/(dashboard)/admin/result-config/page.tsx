'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSessions } from '@/hooks/use-sessions';
import { useClasses } from '@/hooks/use-classes';
import { useResultConfig, useSaveResultConfig } from '@/hooks/use-result-config';
import { useSubjectGroups } from '@/hooks/use-result-config';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { toast } from 'sonner';
import { Save, Plus, X, Check } from 'lucide-react';

export default function ResultConfigPage() {
  const { data: sessions = [] } = useSessions();
  const { data: classes = [] } = useClasses();
  const { data: groups = [] } = useSubjectGroups();

  const [sessionId, setSessionId] = useState('');
  const [classId, setClassId] = useState('');

  const { data: config, isLoading } = useResultConfig(sessionId, classId);
  const saveMutation = useSaveResultConfig(sessionId, classId);

  // Editable state for subjects
  const [editingSubjects, setEditingSubjects] = useState(false);
  const [subjectsState, setSubjectsState] = useState<any[]>([]);
  const [showAddSubject, setShowAddSubject] = useState(false);

  // Editable state for config matrix
  const [matrixState, setMatrixState] = useState<Record<string, number | null>>({});

  // Initialize editable state from fetched config
  useMemo(() => {
    if (config && !editingSubjects) {
      setSubjectsState(config.subjects.map((s: any) => ({ ...s })));
      const m: Record<string, number | null> = {};
      for (const cfg of config.configs) {
        m[`${cfg.component_id}:${cfg.subject_id}`] = cfg.full_marks;
      }
      setMatrixState(m);
    }
  }, [config, editingSubjects]);

  const allSubjects = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const mod = await import('@/lib/api/subjects');
      return mod.subjectsApi.getAll();
    },
  });

  const handleSave = useCallback(() => {
    if (!config || !sessionId || !classId) return;
    const payload: Record<string, unknown> = {
      subjects: subjectsState.map((s: any) => ({
        id: s.id,
        is_required: s.is_required,
        display_order: s.display_order,
      })),
      configs: Object.entries(matrixState)
        .filter(([_, v]) => v !== null && v !== undefined)
        .map(([key, val]) => {
          const [componentId, subjectId] = key.split(':');
          return {
            component_id: componentId,
            subject_id: subjectId,
            full_marks: val,
            is_applicable: true,
          };
        }),
    };
    saveMutation.mutate(payload as any, {
      onSuccess: () => toast.success('Configuration saved'),
      onError: (e: any) => toast.error(e.message || 'Save failed'),
    });
  }, [config, sessionId, classId, subjectsState, matrixState, saveMutation]);

  const handleMatrixChange = useCallback(
    (componentId: string, subjectId: string, value: string) => {
      const key = `${componentId}:${subjectId}`;
      setMatrixState((prev) => ({
        ...prev,
        [key]: value === '' || value === '-' ? null : Number(value),
      }));
    },
    []
  );

  const handleToggleRequired = useCallback((subjectId: string) => {
    setSubjectsState((prev) =>
      prev.map((s) =>
        s.id === subjectId ? { ...s, is_required: !s.is_required } : s
      )
    );
  }, []);

  // Build column headers from academic structure
  const columns = useMemo(() => {
    if (!config) return [];
    const cols: { id: string; name: string; termName: string; valueType: string }[] = [];
    for (const term of config.academic_structure) {
      for (const exam of term.exams) {
        for (const comp of exam.components) {
          cols.push({
            id: comp.id,
            name: comp.name,
            termName: `${term.name} / ${exam.name}`,
            valueType: comp.value_type,
          });
        }
      }
    }
    return cols;
  }, [config]);

  // Determine full_marks for a component from its definition
  const getDefaultFullMarks = useCallback(
    (componentId: string): number | null => {
      if (!config) return null;
      for (const term of config.academic_structure) {
        for (const exam of term.exams) {
          for (const comp of exam.components) {
            if (comp.id === componentId) return comp.full_marks;
          }
        }
      }
      return null;
    },
    [config]
  );

  if (!sessionId || !classId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Result Configuration" description="Configure assessment structure, subjects, and grading for a class" />
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="w-64">
                <Select
                  label="Academic Session"
                  placeholder="Select session"
                  options={sessions.map((s: any) => ({ value: s.id, label: s.name }))}
                  value={sessionId}
                  onChange={(e) => { setSessionId(e.target.value); setClassId(''); }}
                />
              </div>
              <div className="w-64">
                <Select
                  label="Class"
                  placeholder="Select class"
                  options={classes.map((c: any) => ({ value: c.id, label: c.name }))}
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  disabled={!sessionId}
                />
              </div>
            </div>
            <p className="mt-6 text-sm text-gray-400">Select a session and class to begin configuration.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) return <Loading message="Loading configuration..." />;
  if (!config) return <div className="text-gray-500">No configuration data found.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Result Configuration"
        description={`${sessions.find((s: any) => s.id === sessionId)?.name || ''} — ${classes.find((c: any) => c.id === classId)?.name || ''}`}
        actions={
          <Button onClick={handleSave} isLoading={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" /> Save Configuration
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="w-64">
              <Select
                label="Academic Session"
                options={sessions.map((s: any) => ({ value: s.id, label: s.name }))}
                value={sessionId}
                onChange={(e) => { setSessionId(e.target.value); setClassId(''); }}
              />
            </div>
            <div className="w-64">
              <Select
                label="Class"
                options={classes.map((c: any) => ({ value: c.id, label: c.name }))}
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                disabled={!sessionId}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subjects Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Subjects</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddSubject(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Subject
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 text-gray-500 font-medium w-8">#</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Subject</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Category</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Group</th>
                  <th className="text-center py-2 px-2 text-gray-500 font-medium w-20">Required</th>
                  <th className="text-center py-2 px-2 text-gray-500 font-medium w-16">Order</th>
                </tr>
              </thead>
              <tbody>
                {subjectsState.map((subj: any, idx: number) => (
                  <tr key={subj.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2 text-gray-400">{idx + 1}</td>
                    <td className="py-2 px-2 font-medium">{subj.name}</td>
                    <td className="py-2 px-2 text-gray-600">
                      {subj.category?.name || '-'}
                    </td>
                    <td className="py-2 px-2 text-gray-600">
                      {subj.group?.name || '-'}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={() => handleToggleRequired(subj.id)}
                        className={cn(
                          "inline-flex items-center justify-center w-6 h-6 rounded border transition-colors",
                          subj.is_required
                            ? "bg-amber-500 border-amber-500 text-white"
                            : "border-gray-300 text-gray-400"
                        )}
                      >
                        {subj.is_required && <Check className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                    <td className="py-2 px-2 text-center text-gray-500">{subj.display_order}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Matrix */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
            Configuration Matrix
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium border border-gray-200 bg-gray-50 sticky left-0 z-10 min-w-[120px]">
                    Subject
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.id}
                      className="text-center py-2 px-2 text-gray-500 font-medium border border-gray-200 bg-gray-50 min-w-[80px]"
                      title={col.termName}
                    >
                      <div className="text-xs">{col.termName}</div>
                      <div className="text-sm font-semibold text-gray-700">{col.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subjectsState
                  .filter((s: any) => s.is_required)
                  .map((subj: any) => (
                    <tr key={subj.id} className="hover:bg-gray-50">
                      <td className="py-1.5 px-2 font-medium border border-gray-200 sticky left-0 z-10 bg-white">
                        {subj.name}
                      </td>
                      {columns.map((col) => {
                        const key = `${col.id}:${subj.id}`;
                        const val = matrixState[key];
                        return (
                          <td key={key} className="py-1.5 px-2 border border-gray-200 text-center">
                            {col.valueType === 'grade' ? (
                              <span className="text-xs text-amber-600 font-medium">Grade</span>
                            ) : (
                              <input
                                type="number"
                                className="w-16 text-center border border-gray-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                                value={val ?? ''}
                                placeholder="-"
                                onChange={(e) => handleMatrixChange(col.id, subj.id, e.target.value)}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Grade Scale Section */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
            Grade Scale
          </h3>
          {config.grade_scale ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Grade</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Min %</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Max %</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Grade Point</th>
                  </tr>
                </thead>
                <tbody>
                  {config.grade_scale.rules.map((rule: any) => (
                    <tr key={rule.id || rule.label} className="border-b border-gray-100">
                      <td className="py-2 px-2 font-medium">{rule.label}</td>
                      <td className="py-2 px-2">{rule.min_percentage}%</td>
                      <td className="py-2 px-2">{rule.max_percentage}%</td>
                      <td className="py-2 px-2">{rule.grade_point}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No grade scale configured.</p>
          )}
        </CardContent>
      </Card>

      {/* Promotion Rules Section */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
            Promotion Rules
          </h3>
          {config.promotion_rule ? (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500">Promote to Class</label>
                <p className="font-medium">{config.promotion_rule.to_class_name}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Min Percentage</label>
                <p className="font-medium">{config.promotion_rule.min_percentage}%</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">Max Subjects Fail</label>
                <p className="font-medium">{config.promotion_rule.max_subjects_fail}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No promotion rules configured.</p>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} isLoading={saveMutation.isPending} size="lg">
          <Save className="h-4 w-4 mr-2" /> Save Configuration
        </Button>
      </div>

      {/* Add Subject Modal — simplified inline version */}
      {showAddSubject && allSubjects.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAddSubject(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-[480px] max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Add Subjects</h3>
              <button onClick={() => setShowAddSubject(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="space-y-2">
              {allSubjects.data
                .filter((s: any) => !subjectsState.find((ss: any) => ss.id === s.id))
                .map((subject: any) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer border border-gray-100"
                    onClick={() => {
                      setSubjectsState((prev) => [
                        ...prev,
                        {
                          id: subject.id,
                          name: subject.name,
                          code: subject.code,
                          category: subject.subject_category,
                          is_required: true,
                          display_order: prev.length + 1,
                        },
                      ]);
                      setShowAddSubject(false);
                    }}
                  >
                    <div>
                      <p className="font-medium text-sm">{subject.name}</p>
                      <p className="text-xs text-gray-400">{subject.code}</p>
                    </div>
                    <Button variant="ghost" size="icon-sm"><Plus className="h-4 w-4" /></Button>
                  </div>
                ))}
              {allSubjects.data.filter(
                (s: any) => !subjectsState.find((ss: any) => ss.id === s.id)
              ).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">All subjects already assigned.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
