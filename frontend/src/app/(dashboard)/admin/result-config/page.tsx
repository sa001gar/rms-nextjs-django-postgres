'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSessions } from '@/hooks/use-sessions';
import { useClasses } from '@/hooks/use-classes';
import {
  useResultConfig,
  useSaveResultConfig,
  useCloneConfig,
  useDuplicateTerm,
  useLockConfig,
  useUnlockConfig,
  useResetConfig,
  useImportConfig,
  useSubjectGroups,
} from '@/hooks/use-result-config';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { toast } from 'sonner';
import {
  Save,
  Plus,
  X,
  Check,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Copy,
  Lock,
  Unlock,
  RotateCcw,
  Upload,
  Download,
  MoreHorizontal,
  Trash2,
  Pencil,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

import type {
  ResultConfig,
  TermData,
  ExamData,
  ComponentData,
  SubjectConfig,
  GradeRule,
} from '@/lib/api/result-config';

// ─── Helpers ──────────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID();
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── Types ─────────────────────────────────────────────────────────────────

type ValueType = 'numeric' | 'grade' | 'descriptive';

interface MatrixCell {
  componentId: string;
  subjectId: string;
  fullMarks: number | null;
  weightage: number;
  isApplicable: boolean;
  valueType: ValueType;
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ResultConfigPage() {
  const { data: sessions = [] } = useSessions();
  const { data: classes = [] } = useClasses();
  const { data: groups = [] } = useSubjectGroups();

  const [sessionId, setSessionId] = useState('');
  const [classId, setClassId] = useState('');

  const { data: fetchedConfig, isLoading } = useResultConfig(sessionId, classId);
  const saveMutation = useSaveResultConfig(sessionId, classId);
  const cloneMutation = useCloneConfig();
  const duplicateTermMutation = useDuplicateTerm(sessionId, classId);
  const lockMutation = useLockConfig(sessionId, classId);
  const unlockMutation = useUnlockConfig(sessionId, classId);
  const resetMutation = useResetConfig(sessionId, classId);
  const importMutation = useImportConfig(sessionId, classId);

  const allSubjects = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const mod = await import('@/lib/api/subjects');
      return mod.subjectsApi.getAll();
    },
  });

  // ── Local editable state ──────────────────────────────────────────────
  const [localConfig, setLocalConfig] = useState<ResultConfig | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    structure: true,
    subjects: true,
    matrix: true,
    gradeScale: true,
    promotion: true,
  });

  // Initialize local state from fetched data
  useEffect(() => {
    if (fetchedConfig) {
      setLocalConfig(fetchedConfig);
      setIsDirty(false);
    }
  }, [fetchedConfig]);

  // ── Matrix state ──────────────────────────────────────────────────────
  const matrixValues = useMemo(() => {
    if (!localConfig) return {};
    const m: Record<string, number | null> = {};
    for (const cfg of localConfig.configs) {
      m[`${cfg.component_id}:${cfg.subject_id}`] = cfg.full_marks;
    }
    return m;
  }, [localConfig]);

  // ── Academic structure helpers ────────────────────────────────────────
  const toggleSection = (section: string) =>
    setExpandedSections((s) => ({ ...s, [section]: !s[section] }));

  const markDirty = () => setIsDirty(true);

  // ── Term operations ───────────────────────────────────────────────────
  const addTerm = useCallback(() => {
    if (!localConfig) return;
    const maxOrder = localConfig.academic_structure.reduce(
      (max, t) => Math.max(max, t.display_order), 0
    );
    const newTerm: TermData = {
      id: generateId(),
      name: 'New Term',
      display_order: maxOrder + 1,
      exams: [],
    };
    setLocalConfig((prev) =>
      prev ? { ...prev, academic_structure: [...prev.academic_structure, newTerm] } : prev
    );
    markDirty();
  }, [localConfig]);

  const updateTerm = useCallback((termId: string, field: string, value: any) => {
    setLocalConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        academic_structure: prev.academic_structure.map((t) =>
          t.id === termId ? { ...t, [field]: value } : t
        ),
      };
    });
    markDirty();
  }, []);

  const deleteTerm = useCallback((termId: string) => {
    setLocalConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        academic_structure: prev.academic_structure.filter((t) => t.id !== termId),
      };
    });
    markDirty();
  }, []);

  const moveTerm = useCallback((termId: string, direction: -1 | 1) => {
    setLocalConfig((prev) => {
      if (!prev) return prev;
      const terms = [...prev.academic_structure];
      const idx = terms.findIndex((t) => t.id === termId);
      if (idx === -1) return prev;
      const newIdx = clamp(idx + direction, 0, terms.length - 1);
      if (newIdx === idx) return prev;
      [terms[idx], terms[newIdx]] = [terms[newIdx], terms[idx]];
      terms.forEach((t, i) => (t.display_order = i + 1));
      return { ...prev, academic_structure: terms };
    });
    markDirty();
  }, []);

  // ── Exam operations ──────────────────────────────────────────────────
  const addExam = useCallback(
    (termId: string) => {
      setLocalConfig((prev) => {
        if (!prev) return prev;
        const structure = prev.academic_structure.map((t) => {
          if (t.id !== termId) return t;
          const maxOrder = t.exams.reduce((m, e) => Math.max(m, e.display_order), 0);
          return {
            ...t,
            exams: [
              ...t.exams,
              {
                id: generateId(),
                name: 'New Exam',
                display_order: maxOrder + 1,
                components: [],
              },
            ],
          };
        });
        return { ...prev, academic_structure: structure };
      });
      markDirty();
    },
    []
  );

  const updateExam = useCallback(
    (termId: string, examId: string, field: string, value: any) => {
      setLocalConfig((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          academic_structure: prev.academic_structure.map((t) =>
            t.id === termId
              ? {
                  ...t,
                  exams: t.exams.map((e) =>
                    e.id === examId ? { ...e, [field]: value } : e
                  ),
                }
              : t
          ),
        };
      });
      markDirty();
    },
    []
  );

  const deleteExam = useCallback(
    (termId: string, examId: string) => {
      setLocalConfig((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          academic_structure: prev.academic_structure.map((t) =>
            t.id === termId
              ? { ...t, exams: t.exams.filter((e) => e.id !== examId) }
              : t
          ),
        };
      });
      markDirty();
    },
    []
  );

  const moveExam = useCallback(
    (termId: string, examId: string, direction: -1 | 1) => {
      setLocalConfig((prev) => {
        if (!prev) return prev;
        const terms = [...prev.academic_structure];
        const termIdx = terms.findIndex((t) => t.id === termId);
        if (termIdx === -1) return prev;
        const exams = [...terms[termIdx].exams];
        const idx = exams.findIndex((e) => e.id === examId);
        if (idx === -1) return prev;
        const newIdx = clamp(idx + direction, 0, exams.length - 1);
        if (newIdx === idx) return prev;
        [exams[idx], exams[newIdx]] = [exams[newIdx], exams[idx]];
        exams.forEach((e, i) => (e.display_order = i + 1));
        terms[termIdx] = { ...terms[termIdx], exams };
        return { ...prev, academic_structure: terms };
      });
      markDirty();
    },
    []
  );

  // ── Component operations ─────────────────────────────────────────────
  const addComponent = useCallback(
    (termId: string, examId: string) => {
      setLocalConfig((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          academic_structure: prev.academic_structure.map((t) =>
            t.id === termId
              ? {
                  ...t,
                  exams: t.exams.map((e) =>
                    e.id === examId
                      ? {
                          ...e,
                          components: [
                            ...e.components,
                            {
                              id: generateId(),
                              name: 'New Component',
                              code: '',
                              value_type: 'numeric' as ValueType,
                              full_marks: 100,
                              display_order: e.components.length + 1,
                              is_optional: false,
                            },
                          ],
                        }
                      : e
                  ),
                }
              : t
          ),
        };
      });
      markDirty();
    },
    []
  );

  const updateComponent = useCallback(
    (termId: string, examId: string, compId: string, field: string, value: any) => {
      setLocalConfig((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          academic_structure: prev.academic_structure.map((t) =>
            t.id === termId
              ? {
                  ...t,
                  exams: t.exams.map((e) =>
                    e.id === examId
                      ? {
                          ...e,
                          components: e.components.map((c) =>
                            c.id === compId ? { ...c, [field]: value, code: field === 'name' && typeof value === 'string' ? value.slice(0, 30).toUpperCase().replace(/\s+/g, '_') : c.code } : c
                          ),
                        }
                      : e
                  ),
                }
              : t
          ),
        };
      });
      markDirty();
    },
    []
  );

  const deleteComponent = useCallback(
    (termId: string, examId: string, compId: string) => {
      setLocalConfig((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          academic_structure: prev.academic_structure.map((t) =>
            t.id === termId
              ? {
                  ...t,
                  exams: t.exams.map((e) =>
                    e.id === examId
                      ? {
                          ...e,
                          components: e.components.filter((c) => c.id !== compId),
                        }
                      : e
                  ),
                }
              : t
          ),
        };
      });
      markDirty();
    },
    []
  );

  const moveComponent = useCallback(
    (termId: string, examId: string, compId: string, direction: -1 | 1) => {
      setLocalConfig((prev) => {
        if (!prev) return prev;
        const terms = [...prev.academic_structure];
        const termIdx = terms.findIndex((t) => t.id === termId);
        if (termIdx === -1) return prev;
        const exams = [...terms[termIdx].exams];
        const examIdx = exams.findIndex((e) => e.id === examId);
        if (examIdx === -1) return prev;
        const components = [...exams[examIdx].components];
        const idx = components.findIndex((c) => c.id === compId);
        if (idx === -1) return prev;
        const newIdx = clamp(idx + direction, 0, components.length - 1);
        if (newIdx === idx) return prev;
        [components[idx], components[newIdx]] = [components[newIdx], components[idx]];
        components.forEach((c, i) => (c.display_order = i + 1));
        exams[examIdx] = { ...exams[examIdx], components };
        terms[termIdx] = { ...terms[termIdx], exams };
        return { ...prev, academic_structure: terms };
      });
      markDirty();
    },
    []
  );

  // ── Subject operations ───────────────────────────────────────────────
  const addSubject = useCallback(
    (subject: any) => {
      setLocalConfig((prev) => {
        if (!prev || prev.subjects.find((s) => s.id === subject.id)) return prev;
        return {
          ...prev,
          subjects: [
            ...prev.subjects,
            {
              id: subject.id,
              name: subject.name,
              code: subject.code,
              category: subject.subject_category || null,
              group: null,
              is_required: true,
              display_order: prev.subjects.length + 1,
            },
          ],
        };
      });
      markDirty();
    },
    []
  );

  const removeSubject = useCallback((subjectId: string) => {
    setLocalConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, subjects: prev.subjects.filter((s) => s.id !== subjectId) };
    });
    markDirty();
  }, []);

  const updateSubject = useCallback(
    (subjectId: string, field: string, value: any) => {
      setLocalConfig((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          subjects: prev.subjects.map((s) =>
            s.id === subjectId ? { ...s, [field]: value } : s
          ),
        };
      });
      markDirty();
    },
    []
  );

  const reorderSubject = useCallback((subjectId: string, direction: -1 | 1) => {
    setLocalConfig((prev) => {
      if (!prev) return prev;
      const subjects = [...prev.subjects];
      const idx = subjects.findIndex((s) => s.id === subjectId);
      if (idx === -1) return prev;
      const newIdx = clamp(idx + direction, 0, subjects.length - 1);
      if (newIdx === idx) return prev;
      [subjects[idx], subjects[newIdx]] = [subjects[newIdx], subjects[idx]];
      subjects.forEach((s, i) => (s.display_order = i + 1));
      return { ...prev, subjects };
    });
    markDirty();
  }, []);

  // ── Matrix cell operations ───────────────────────────────────────────
  const updateMatrixCell = useCallback(
    (componentId: string, subjectId: string, value: number | null) => {
      setLocalConfig((prev) => {
        if (!prev) return prev;
        const existingIdx = prev.configs.findIndex(
          (c) => c.component_id === componentId && c.subject_id === subjectId
        );
        const newConfigs = [...prev.configs];
        if (existingIdx >= 0) {
          newConfigs[existingIdx] = { ...newConfigs[existingIdx], full_marks: value };
        } else {
          newConfigs.push({
            id: generateId(),
            component_id: componentId,
            component_name: '',
            subject_id: subjectId,
            subject_name: '',
            full_marks: value,
            weightage_pct: 100,
            is_applicable: value !== null,
            display_order: 0,
          });
        }
        return { ...prev, configs: newConfigs };
      });
      markDirty();
    },
    []
  );

  // ── Grade scale operations ───────────────────────────────────────────
  const addGradeRule = useCallback(() => {
    setLocalConfig((prev) => {
      if (!prev) return prev;
      const scale = prev.grade_scale || {
        id: generateId(),
        name: 'Default',
        rules: [],
      };
      const maxOrder = scale.rules.reduce((m, r) => Math.max(m, r.display_order), 0);
      return {
        ...prev,
        grade_scale: {
          ...scale,
          rules: [
            ...scale.rules,
            {
              id: generateId(),
              label: 'A',
              min_percentage: 91,
              max_percentage: 100,
              grade_point: 10,
              display_order: maxOrder + 1,
            },
          ],
        },
      };
    });
    markDirty();
  }, []);

  const updateGradeRule = useCallback(
    (ruleId: string, field: string, value: any) => {
      setLocalConfig((prev) => {
        if (!prev || !prev.grade_scale) return prev;
        return {
          ...prev,
          grade_scale: {
            ...prev.grade_scale,
            rules: prev.grade_scale.rules.map((r) =>
              (r.id || r.label) === ruleId ? { ...r, [field]: value } : r
            ),
          },
        };
      });
      markDirty();
    },
    []
  );

  const deleteGradeRule = useCallback((ruleId: string) => {
    setLocalConfig((prev) => {
      if (!prev || !prev.grade_scale) return prev;
      return {
        ...prev,
        grade_scale: {
          ...prev.grade_scale,
          rules: prev.grade_scale.rules.filter(
            (r) => (r.id || r.label) !== ruleId
          ),
        },
      };
    });
    markDirty();
  }, []);

  const duplicateGradeRule = useCallback((rule: GradeRule) => {
    setLocalConfig((prev) => {
      if (!prev || !prev.grade_scale) return prev;
      return {
        ...prev,
        grade_scale: {
          ...prev.grade_scale,
          rules: [
            ...prev.grade_scale.rules,
            {
              ...rule,
              id: generateId(),
              label: `${rule.label}'`,
              display_order: prev.grade_scale.rules.length + 1,
            },
          ],
        },
      };
    });
    markDirty();
  }, []);

  // ── Promotion rules ──────────────────────────────────────────────────
  const updatePromotionRule = useCallback(
    (field: string, value: any) => {
      setLocalConfig((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          promotion_rule: {
            id: prev.promotion_rule?.id || generateId(),
            from_class_id: classId,
            to_class_id: prev.promotion_rule?.to_class_id || '',
            min_percentage: prev.promotion_rule?.min_percentage || 33,
            max_subjects_fail: prev.promotion_rule?.max_subjects_fail || 0,
            [field]: value,
          },
        };
      });
      markDirty();
    },
    [classId]
  );

  // ── Matrix columns ───────────────────────────────────────────────────
  const columns = useMemo(() => {
    if (!localConfig) return [];
    const cols: {
      id: string;
      name: string;
      termName: string;
      examName: string;
      valueType: ValueType;
      fullMarks: number | null;
    }[] = [];
    for (const term of localConfig.academic_structure) {
      for (const exam of term.exams) {
        for (const comp of exam.components) {
          cols.push({
            id: comp.id,
            name: comp.name,
            termName: term.name,
            examName: exam.name,
            valueType: comp.value_type,
            fullMarks: comp.full_marks,
          });
        }
      }
    }
    return cols;
  }, [localConfig]);

  // ── Save ─────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (!localConfig || !sessionId || !classId) return;

    setSaveStatus('saving');
    const payload = {
      academic_structure: localConfig.academic_structure,
      subjects: localConfig.subjects.map((s) => ({
        id: s.id,
        is_required: s.is_required,
        display_order: s.display_order,
        group_id: s.group?.id || null,
      })),
      configs: localConfig.configs
        .filter((c) => c.full_marks !== null && c.is_applicable)
        .map((c) => ({
          component_id: c.component_id,
          subject_id: c.subject_id,
          full_marks: c.full_marks,
          weightage_pct: c.weightage_pct,
          is_applicable: c.is_applicable,
          display_order: c.display_order,
        })),
      grade_scale: localConfig.grade_scale
        ? {
            name: localConfig.grade_scale.name,
            is_active: true,
            rules: localConfig.grade_scale.rules.map((r) => ({
              label: r.label,
              min_percentage: r.min_percentage,
              max_percentage: r.max_percentage,
              grade_point: r.grade_point,
              display_order: r.display_order,
            })),
          }
        : null,
      promotion_rule: localConfig.promotion_rule
        ? {
            to_class_id: localConfig.promotion_rule.to_class_id,
            min_percentage: localConfig.promotion_rule.min_percentage,
            max_subjects_fail: localConfig.promotion_rule.max_subjects_fail,
          }
        : null,
    };

    saveMutation.mutate(payload as any, {
      onSuccess: () => {
        setSaveStatus('saved');
        setIsDirty(false);
        toast.success('Configuration saved successfully');
        setTimeout(() => setSaveStatus('idle'), 2000);
      },
      onError: (e: any) => {
        setSaveStatus('error');
        toast.error(e.message || 'Save failed');
      },
    });
  }, [localConfig, sessionId, classId, saveMutation]);

  // ── Clone / Duplicate / Lock / Reset ─────────────────────────────────
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [targetSessionId, setTargetSessionId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [sourceSessionId, setSourceSessionId] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleClone = useCallback(() => {
    if (!targetSessionId || !targetClassId) return;
    cloneMutation.mutate(
      { sessionId, classId, targetSessionId, targetClassId },
      {
        onSuccess: () => {
          toast.success('Configuration cloned successfully');
          setShowCloneDialog(false);
        },
        onError: (e: any) => toast.error(e.message || 'Clone failed'),
      }
    );
  }, [sessionId, classId, targetSessionId, targetClassId, cloneMutation]);

  const handleImport = useCallback(() => {
    if (!sourceSessionId) return;
    importMutation.mutate(
      { sourceSessionId },
      {
        onSuccess: () => {
          toast.success('Configuration imported successfully');
          setShowImportDialog(false);
        },
        onError: (e: any) => toast.error(e.message || 'Import failed'),
      }
    );
  }, [sessionId, classId, sourceSessionId, importMutation]);

  const handleDuplicateTerm = useCallback(
    (termId: string) => {
      duplicateTermMutation.mutate(
        { termId },
        {
          onSuccess: () => toast.success('Term duplicated'),
          onError: (e: any) => toast.error(e.message || 'Duplicate failed'),
        }
      );
    },
    [duplicateTermMutation]
  );

  const handleLock = useCallback(() => {
    lockMutation.mutate(undefined, {
      onSuccess: () => toast.success('Configuration locked'),
      onError: (e: any) => toast.error(e.message || 'Lock failed'),
    });
  }, [lockMutation]);

  const handleUnlock = useCallback(() => {
    unlockMutation.mutate(undefined, {
      onSuccess: () => toast.success('Configuration unlocked'),
      onError: (e: any) => toast.error(e.message || 'Unlock failed'),
    });
  }, [unlockMutation]);

  const handleReset = useCallback(() => {
    if (!confirm('This will delete all configuration for this class. Are you sure?')) return;
    resetMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('Configuration reset');
        setIsDirty(false);
      },
      onError: (e: any) => toast.error(e.message || 'Reset failed'),
    });
  }, [resetMutation]);

  // ── Add Subject dialog state ─────────────────────────────────────────
  const [showAddSubjectDialog, setShowAddSubjectDialog] = useState(false);

  // ── Render ───────────────────────────────────────────────────────────
  const isLocked = localConfig?.is_locked || false;
  const selectedSession = sessions.find((s: any) => s.id === sessionId);
  const selectedClass = classes.find((c: any) => c.id === classId);

  if (!sessionId || !classId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Result Configuration"
          description="Configure the complete examination structure for a class"
        />
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="w-64">
                <Select
                  label="Academic Session"
                  placeholder="Select session"
                  options={sessions.map((s: any) => ({ value: s.id, label: s.name }))}
                  value={sessionId}
                  onChange={(e) => {
                    setSessionId(e.target.value);
                    setClassId('');
                  }}
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
            <p className="mt-6 text-sm text-gray-400">
              Select a session and class to begin configuring the examination structure.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) return <Loading message="Loading configuration..." />;
  if (!localConfig)
    return <div className="text-gray-500">No configuration data found.</div>;

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <PageHeader
        title="Result Configuration"
        description={
          <span className="flex items-center gap-2">
            <span className="font-medium">{selectedSession?.name}</span>
            <span className="text-gray-300">—</span>
            <span className="font-medium">{selectedClass?.name}</span>
            {isLocked && (
              <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                <Lock className="h-3 w-3" /> Locked
              </span>
            )}
            {isDirty && (
              <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                Unsaved changes
              </span>
            )}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            {/* Save status */}
            {saveStatus === 'saving' && (
              <span className="text-sm text-amber-600 flex items-center gap-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Save error
              </span>
            )}

            <Button
              onClick={handleSave}
              isLoading={saveMutation.isPending}
              disabled={isLocked}
            >
              <Save className="h-4 w-4 mr-1.5" /> Save Configuration
            </Button>

            {/* More actions dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              {showMoreMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMoreMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg border border-gray-200 shadow-lg py-1 min-w-[200px]">
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowCloneDialog(true);
                      }}
                    >
                      <Copy className="h-4 w-4 text-gray-500" /> Clone Configuration
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      onClick={() => {
                        setShowMoreMenu(false);
                        setShowImportDialog(true);
                      }}
                    >
                      <Upload className="h-4 w-4 text-gray-500" /> Import from Session
                    </button>
                    {isLocked ? (
                      <button
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                        onClick={() => {
                          setShowMoreMenu(false);
                          handleUnlock();
                        }}
                      >
                        <Unlock className="h-4 w-4 text-gray-500" /> Unlock Configuration
                      </button>
                    ) : (
                      <button
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                        onClick={() => {
                          setShowMoreMenu(false);
                          handleLock();
                        }}
                      >
                        <Lock className="h-4 w-4 text-gray-500" /> Lock Configuration
                      </button>
                    )}
                    <hr className="my-1 border-gray-100" />
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                      onClick={() => {
                        setShowMoreMenu(false);
                        handleReset();
                      }}
                    >
                      <RotateCcw className="h-4 w-4" /> Reset Configuration
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        }
      />

      {/* ── ACADEMIC STRUCTURE ───────────────────────────────────── */}
      <Card>
        <div
          className="flex items-center justify-between p-4 cursor-pointer select-none"
          onClick={() => toggleSection('structure')}
        >
          <div className="flex items-center gap-2">
            {expandedSections.structure ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Academic Structure
            </h3>
            <span className="text-xs text-gray-400">
              ({localConfig.academic_structure.length} terms)
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isLocked}
            onClick={(e) => {
              e.stopPropagation();
              addTerm();
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Term
          </Button>
        </div>

        {expandedSections.structure && (
          <CardContent className="p-4 pt-0 space-y-3">
            {localConfig.academic_structure.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">
                No terms configured. Click &ldquo;Add Term&rdquo; to begin building the academic structure.
              </p>
            )}

            {localConfig.academic_structure.map((term, ti) => (
              <div key={term.id} className="border border-gray-200 rounded-lg">
                {/* Term header */}
                <div className="flex items-center gap-2 p-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                  <GripVertical className="h-4 w-4 text-gray-300 cursor-grab" />
                  <input
                    className="text-sm font-semibold border-0 bg-transparent focus:outline-none focus:ring-0 px-1 py-0.5 rounded hover:bg-white focus:bg-white flex-1"
                    value={term.name}
                    disabled={isLocked}
                    onChange={(e) => updateTerm(term.id, 'name', e.target.value)}
                  />
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      disabled={ti === 0 || isLocked}
                      onClick={() => moveTerm(term.id, -1)}
                      title="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      disabled={ti === localConfig.academic_structure.length - 1 || isLocked}
                      onClick={() => moveTerm(term.id, 1)}
                      title="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="p-1 text-blue-500 hover:text-blue-700 disabled:opacity-30"
                      disabled={isLocked}
                      onClick={() => handleDuplicateTerm(term.id)}
                      title="Duplicate term"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="p-1 text-gray-400 hover:text-green-600 disabled:opacity-30"
                      disabled={isLocked}
                      onClick={() => addExam(term.id)}
                      title="Add exam"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30"
                      disabled={isLocked}
                      onClick={() => deleteTerm(term.id)}
                      title="Delete term"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Exams */}
                <div className="p-2 space-y-1">
                  {term.exams.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">
                      No exams. Click + to add one.
                    </p>
                  )}

                  {term.exams.map((exam, ei) => (
                    <div key={exam.id} className="border border-gray-100 rounded ml-4">
                      {/* Exam header */}
                      <div className="flex items-center gap-2 p-1.5 bg-white rounded-t">
                        <GripVertical className="h-3.5 w-3.5 text-gray-300 cursor-grab" />
                        <input
                          className="text-xs font-medium border-0 bg-transparent focus:outline-none focus:ring-0 px-1 py-0.5 rounded hover:bg-gray-50 focus:bg-gray-50 flex-1"
                          value={exam.name}
                          disabled={isLocked}
                          onChange={(e) => updateExam(term.id, exam.id, 'name', e.target.value)}
                        />
                        <div className="flex items-center gap-1">
                          <button
                            className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            disabled={ei === 0 || isLocked}
                            onClick={() => moveExam(term.id, exam.id, -1)}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            disabled={ei === term.exams.length - 1 || isLocked}
                            onClick={() => moveExam(term.id, exam.id, 1)}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          <button
                            className="p-0.5 text-gray-400 hover:text-green-600 disabled:opacity-30"
                            disabled={isLocked}
                            onClick={() => addComponent(term.id, exam.id)}
                            title="Add component"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            className="p-0.5 text-red-400 hover:text-red-600 disabled:opacity-30"
                            disabled={isLocked}
                            onClick={() => deleteExam(term.id, exam.id)}
                            title="Delete exam"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Components */}
                      <div className="p-1.5 space-y-0.5">
                        {exam.components.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-1 ml-4">
                            No components. Click + to add one.
                          </p>
                        )}

                        {exam.components.map((comp, ci) => (
                          <div
                            key={comp.id}
                            className="flex items-center gap-2 p-1 ml-6 rounded hover:bg-gray-50"
                          >
                            <GripVertical className="h-3 w-3 text-gray-300 cursor-grab" />
                            <input
                              className="text-xs border-0 bg-transparent focus:outline-none focus:ring-0 px-1 py-0.5 rounded hover:bg-white focus:bg-white w-28"
                              value={comp.name}
                              disabled={isLocked}
                              onChange={(e) =>
                                updateComponent(term.id, exam.id, comp.id, 'name', e.target.value)
                              }
                            />
                            <select
                              className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:border-amber-400"
                              value={comp.value_type}
                              disabled={isLocked}
                              onChange={(e) =>
                                updateComponent(
                                  term.id,
                                  exam.id,
                                  comp.id,
                                  'value_type',
                                  e.target.value
                                )
                              }
                            >
                              <option value="numeric">Numeric</option>
                              <option value="grade">Grade</option>
                              <option value="descriptive">Descriptive</option>
                            </select>
                            {comp.value_type === 'numeric' && (
                              <input
                                type="number"
                                className="text-xs border border-gray-200 rounded px-1 py-0.5 w-16 text-center focus:outline-none focus:border-amber-400"
                                value={comp.full_marks ?? ''}
                                disabled={isLocked}
                                placeholder="Marks"
                                onChange={(e) =>
                                  updateComponent(
                                    term.id,
                                    exam.id,
                                    comp.id,
                                    'full_marks',
                                    e.target.value ? Number(e.target.value) : null
                                  )
                                }
                              />
                            )}
                            {comp.value_type === 'numeric' && (
                              <span className="text-[10px] text-gray-400">marks</span>
                            )}
                            <div className="flex-1" />
                            <div className="flex items-center gap-1">
                              <button
                                className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                disabled={ci === 0 || isLocked}
                                onClick={() => moveComponent(term.id, exam.id, comp.id, -1)}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                disabled={ci === exam.components.length - 1 || isLocked}
                                onClick={() => moveComponent(term.id, exam.id, comp.id, 1)}
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                              <button
                                className="p-0.5 text-red-400 hover:text-red-600 disabled:opacity-30"
                                disabled={isLocked}
                                onClick={() => deleteComponent(term.id, exam.id, comp.id)}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* ── SUBJECTS ──────────────────────────────────────────────── */}
      <Card>
        <div
          className="flex items-center justify-between p-4 cursor-pointer select-none"
          onClick={() => toggleSection('subjects')}
        >
          <div className="flex items-center gap-2">
            {expandedSections.subjects ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Subjects
            </h3>
            <span className="text-xs text-gray-400">
              ({localConfig.subjects.length} subjects)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isLocked}
              onClick={(e) => {
                e.stopPropagation();
                setShowAddSubjectDialog(true);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Assign Subject
            </Button>
          </div>
        </div>

        {expandedSections.subjects && (
          <CardContent className="p-4 pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 text-gray-500 font-medium w-8">#</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Subject</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Category</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Group</th>
                    <th className="text-center py-2 px-2 text-gray-500 font-medium w-20">Required</th>
                    <th className="text-center py-2 px-2 text-gray-500 font-medium w-32">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {localConfig.subjects.map((subj, idx) => (
                    <tr key={subj.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 text-gray-400">{idx + 1}</td>
                      <td className="py-2 px-2 font-medium">{subj.name}</td>
                      <td className="py-2 px-2 text-gray-600 text-xs">
                        {subj.category?.name || '-'}
                      </td>
                      <td className="py-2 px-2">
                        <select
                          className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:border-amber-400 max-w-[120px]"
                          value={subj.group?.id || ''}
                          disabled={isLocked}
                          onChange={(e) =>
                            updateSubject(subj.id, 'group', e.target.value
                              ? groups.find((g: any) => g.id === e.target.value)
                              : null
                            )
                          }
                        >
                          <option value="">No group</option>
                          {groups.map((g: any) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          disabled={isLocked}
                          onClick={() =>
                            updateSubject(subj.id, 'is_required', !subj.is_required)
                          }
                          className={cn(
                            'inline-flex items-center justify-center w-6 h-6 rounded border transition-colors',
                            subj.is_required
                              ? 'bg-amber-500 border-amber-500 text-white'
                              : 'border-gray-300 text-gray-400'
                          )}
                        >
                          {subj.is_required && <Check className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            disabled={idx === 0 || isLocked}
                            onClick={() => reorderSubject(subj.id, -1)}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            disabled={idx === localConfig.subjects.length - 1 || isLocked}
                            onClick={() => reorderSubject(subj.id, 1)}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30"
                            disabled={isLocked}
                            onClick={() => removeSubject(subj.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {localConfig.subjects.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-gray-400">
                        No subjects assigned. Click &ldquo;Assign Subject&rdquo; to add subjects to this class.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── CONFIGURATION MATRIX ───────────────────────────────────── */}
      <Card>
        <div
          className="flex items-center justify-between p-4 cursor-pointer select-none"
          onClick={() => toggleSection('matrix')}
        >
          <div className="flex items-center gap-2">
            {expandedSections.matrix ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Configuration Matrix
            </h3>
            <span className="text-xs text-gray-400">
              ({columns.length} columns × {localConfig.subjects.length} subjects)
            </span>
          </div>
        </div>

        {expandedSections.matrix && (
          <CardContent className="p-0 overflow-x-auto">
            {columns.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No assessment components configured. Add terms, exams, and components in the Academic Structure section above.
              </p>
            ) : localConfig.subjects.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No subjects assigned. Add subjects in the Subjects section above.
              </p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  {/* Term + Exam row */}
                  <tr>
                    <th
                      className="text-left py-2 px-2 text-gray-500 font-medium border border-gray-200 bg-gray-50 sticky left-0 z-20 min-w-[140px]"
                      rowSpan={2}
                    >
                      Subject
                    </th>
                    {localConfig.academic_structure.map((term) => {
                      const totalCols = term.exams.reduce(
                        (acc, e) => acc + e.components.length, 0
                      );
                      return (
                        <th
                          key={term.id}
                          colSpan={totalCols || 1}
                          className="text-center py-1.5 px-2 text-xs font-semibold text-gray-600 border border-gray-200 bg-gray-100 uppercase"
                        >
                          {term.name}
                        </th>
                      );
                    })}
                  </tr>
                  <tr>
                    {localConfig.academic_structure.map((term) =>
                      term.exams.map((exam) => {
                        const compCount = exam.components.length;
                        return (
                          <th
                            key={exam.id}
                            colSpan={compCount || 1}
                            className="text-center py-1 px-1 text-[11px] font-medium text-gray-500 border border-gray-200 bg-gray-50"
                          >
                            {exam.name}
                          </th>
                        );
                      })
                    )}
                  </tr>
                </thead>
                <tbody>
                  {localConfig.subjects.map((subj) => (
                    <tr key={subj.id} className="hover:bg-gray-50">
                      <td className="py-1.5 px-2 font-medium border border-gray-200 sticky left-0 z-10 bg-white text-sm">
                        {subj.name}
                      </td>
                      {localConfig.academic_structure.map((term) =>
                        term.exams.map((exam) =>
                          exam.components.map((comp) => {
                            const key = `${comp.id}:${subj.id}`;
                            const configEntry = localConfig.configs.find(
                              (c) =>
                                c.component_id === comp.id && c.subject_id === subj.id
                            );
                            const val = configEntry?.full_marks ?? null;
                            const isApplicable = configEntry?.is_applicable ?? true;

                            return (
                              <td
                                key={key}
                                className={cn(
                                  'py-1 px-1.5 border border-gray-200 text-center',
                                  !isApplicable && 'bg-gray-50'
                                )}
                              >
                                {comp.value_type === 'grade' ? (
                                  <span className="text-xs text-amber-600 font-medium">
                                    Grade
                                  </span>
                                ) : comp.value_type === 'descriptive' ? (
                                  <span className="text-xs text-blue-600 font-medium">
                                    Desc
                                  </span>
                                ) : (
                                  <input
                                    type="number"
                                    className={cn(
                                      'w-14 text-center border rounded px-1 py-0.5 text-xs transition-colors',
                                      isLocked
                                        ? 'bg-gray-50'
                                        : 'border-transparent hover:border-gray-300 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
                                    )}
                                    value={val ?? ''}
                                    disabled={isLocked}
                                    placeholder="-"
                                    onChange={(e) => {
                                      const v =
                                        e.target.value === ''
                                          ? null
                                          : Number(e.target.value);
                                      updateMatrixCell(comp.id, subj.id, v);
                                    }}
                                  />
                                )}
                              </td>
                            );
                          })
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        )}
      </Card>

      {/* ── GRADE SCALE ────────────────────────────────────────────── */}
      <Card>
        <div
          className="flex items-center justify-between p-4 cursor-pointer select-none"
          onClick={() => toggleSection('gradeScale')}
        >
          <div className="flex items-center gap-2">
            {expandedSections.gradeScale ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Grade Scale
            </h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isLocked}
            onClick={(e) => {
              e.stopPropagation();
              addGradeRule();
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Grade
          </Button>
        </div>

        {expandedSections.gradeScale && (
          <CardContent className="p-4 pt-0">
            {!localConfig.grade_scale || localConfig.grade_scale.rules.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No grade rules configured. Click &ldquo;Add Grade&rdquo; to create the grading scale.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Grade</th>
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Min %</th>
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Max %</th>
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Grade Point</th>
                      <th className="text-center py-2 px-2 text-gray-500 font-medium w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localConfig.grade_scale.rules.map((rule, idx) => (
                      <tr key={rule.id || rule.label} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-1.5 px-2">
                          <input
                            className="w-12 text-sm font-medium border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-amber-400"
                            value={rule.label}
                            disabled={isLocked}
                            onChange={(e) =>
                              updateGradeRule(rule.id || rule.label, 'label', e.target.value)
                            }
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            className="w-16 text-sm border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-amber-400"
                            value={rule.min_percentage}
                            disabled={isLocked}
                            onChange={(e) =>
                              updateGradeRule(
                                rule.id || rule.label,
                                'min_percentage',
                                Number(e.target.value)
                              )
                            }
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            className="w-16 text-sm border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-amber-400"
                            value={rule.max_percentage}
                            disabled={isLocked}
                            onChange={(e) =>
                              updateGradeRule(
                                rule.id || rule.label,
                                'max_percentage',
                                Number(e.target.value)
                              )
                            }
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            step="0.1"
                            className="w-16 text-sm border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-amber-400"
                            value={rule.grade_point}
                            disabled={isLocked}
                            onChange={(e) =>
                              updateGradeRule(
                                rule.id || rule.label,
                                'grade_point',
                                Number(e.target.value)
                              )
                            }
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              className="p-1 text-blue-400 hover:text-blue-600 disabled:opacity-30"
                              disabled={isLocked}
                              onClick={() => duplicateGradeRule(rule)}
                              title="Duplicate"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30"
                              disabled={isLocked}
                              onClick={() => deleteGradeRule(rule.id || rule.label)}
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Preview */}
            {localConfig.grade_scale && localConfig.grade_scale.rules.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <span className="text-xs font-medium text-amber-800">Preview: </span>
                <span className="text-xs text-amber-700">
                  85% →{' '}
                  {(() => {
                    const sorted = [...localConfig.grade_scale!.rules].sort(
                      (a, b) => b.min_percentage - a.min_percentage
                    );
                    const match = sorted.find(
                      (r) => r.min_percentage <= 85 && r.max_percentage >= 85
                    );
                    return match
                      ? `${match.label} (Grade Point: ${match.grade_point})`
                      : 'No matching grade';
                  })()}
                </span>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* ── PROMOTION RULES ────────────────────────────────────────── */}
      <Card>
        <div
          className="flex items-center justify-between p-4 cursor-pointer select-none"
          onClick={() => toggleSection('promotion')}
        >
          <div className="flex items-center gap-2">
            {expandedSections.promotion ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Promotion Rules
            </h3>
          </div>
        </div>

        {expandedSections.promotion && (
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Promote to Class
                </label>
                <select
                  className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                  value={localConfig.promotion_rule?.to_class_id || ''}
                  disabled={isLocked}
                  onChange={(e) => updatePromotionRule('to_class_id', e.target.value)}
                >
                  <option value="">Select class...</option>
                  {classes.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Minimum Percentage
                </label>
                <div className="relative">
                  <input
                    type="number"
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                    value={localConfig.promotion_rule?.min_percentage ?? 33}
                    disabled={isLocked}
                    onChange={(e) =>
                      updatePromotionRule('min_percentage', Number(e.target.value))
                    }
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    %
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Max Failed Subjects Allowed
                </label>
                <input
                  type="number"
                  className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                  value={localConfig.promotion_rule?.max_subjects_fail ?? 0}
                  disabled={isLocked}
                  onChange={(e) =>
                    updatePromotionRule('max_subjects_fail', Number(e.target.value))
                  }
                />
              </div>
            </div>
            {!localConfig.promotion_rule && (
              <p className="mt-3 text-xs text-gray-400">
                Configure promotion rules to define how students progress to the next class.
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Bottom save bar */}
      <div className="sticky bottom-4 z-30 flex justify-center">
        <div className="bg-white rounded-full border border-gray-200 shadow-lg px-6 py-3 flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {isLocked
              ? 'Configuration is locked'
              : isDirty
              ? 'Unsaved changes'
              : 'All changes saved'}
          </span>
          {saveStatus === 'saving' && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
            </span>
          )}
          <Button
            onClick={handleSave}
            isLoading={saveMutation.isPending}
            disabled={isLocked || !isDirty}
            size="lg"
          >
            <Save className="h-4 w-4 mr-2" /> Save Configuration
          </Button>
        </div>
      </div>

      {/* ── Add Subject Dialog ────────────────────────────────────── */}
      {showAddSubjectDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowAddSubjectDialog(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-[520px] max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Assign Subjects</h3>
              <button onClick={() => setShowAddSubjectDialog(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Select subjects to assign to {selectedClass?.name}.
            </p>
            <div className="space-y-1 max-h-[40vh] overflow-y-auto">
              {(allSubjects.data || [])
                .filter(
                  (s: any) => !localConfig.subjects.find((ss) => ss.id === s.id)
                )
                .map((subject: any) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100 transition-colors"
                    onClick={() => {
                      addSubject(subject);
                    }}
                  >
                    <div>
                      <p className="font-medium text-sm">{subject.name}</p>
                      <p className="text-xs text-gray-400">{subject.code}</p>
                    </div>
                    <Button variant="ghost" size="icon-sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              {(allSubjects.data || []).filter(
                (s: any) => !localConfig.subjects.find((ss) => ss.id === s.id)
              ).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">
                  All subjects are already assigned to this class.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Clone Dialog ──────────────────────────────────────────── */}
      {showCloneDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowCloneDialog(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-[480px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Clone Configuration</h3>
              <button onClick={() => setShowCloneDialog(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Clone the entire configuration from {selectedSession?.name} —{' '}
              {selectedClass?.name} to another session and class.
            </p>
            <div className="space-y-3">
              <Select
                label="Target Session"
                placeholder="Select session"
                options={sessions.map((s: any) => ({ value: s.id, label: s.name }))}
                value={targetSessionId}
                onChange={(e) => setTargetSessionId(e.target.value)}
              />
              <Select
                label="Target Class"
                placeholder="Select class"
                options={classes.map((c: any) => ({ value: c.id, label: c.name }))}
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                disabled={!targetSessionId}
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowCloneDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleClone}
                isLoading={cloneMutation.isPending}
                disabled={!targetSessionId || !targetClassId}
              >
                <Copy className="h-4 w-4 mr-1" /> Clone
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Dialog ─────────────────────────────────────────── */}
      {showImportDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowImportDialog(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-[480px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Import Configuration</h3>
              <button onClick={() => setShowImportDialog(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Import academic structure, subjects, grade scale, and promotion rules from a previous
              session.
            </p>
            <Select
              label="Source Session"
              placeholder="Select session to import from"
              options={sessions
                .filter((s: any) => s.id !== sessionId)
                .map((s: any) => ({ value: s.id, label: s.name }))}
              value={sourceSessionId}
              onChange={(e) => setSourceSessionId(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                isLoading={importMutation.isPending}
                disabled={!sourceSessionId}
              >
                <Upload className="h-4 w-4 mr-1" /> Import
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
