'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabList, Tab, TabPanel, TabPanels } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Save } from 'lucide-react';
import { assessmentsApi, type AssessmentCategory } from '@/lib/api/assessments';
import { classesApi } from '@/lib/api/classes';
import { subjectsApi } from '@/lib/api/subjects';
import { termsApi, type Term } from '@/lib/api/terms';
import { marksDistributionApi, type MarksDistributionEntry } from '@/lib/api/marks-distribution';
import { useActiveSession } from '@/hooks/use-sessions';
import type { Class, Section, Subject } from '@/types/academic';

const CATEGORY_OPTIONS = [
  { value: 'formative', label: 'Formative' },
  { value: 'summative', label: 'Summative' },
  { value: 'diagnostic', label: 'Diagnostic' },
  { value: 'norm-referenced', label: 'Norm-Referenced' },
  { value: 'criterion-referenced', label: 'Criterion-Referenced' },
];

const typeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  category: z.string().min(1, 'Category is required'),
  term_id: z.string().nullable().optional(),
  display_order: z.number().int('Must be a whole number').min(0, 'Min is 0'),
  is_active: z.boolean(),
});

type TypeFormData = z.infer<typeof typeSchema>;

export function AssessmentConfig() {
  const [activeTab, setActiveTab] = useState('types');

  return (
    <div className="space-y-6">
      <PageHeader title="Assessment Configuration" description="Manage assessment types and weightages" />
      <Tabs
        tabs={[
          { id: 'types', label: 'Assessment Types' },
          { id: 'terms', label: 'Terms' },
          { id: 'marks-distribution', label: 'Marks Distribution' },
        ]}
        defaultValue="types"
        onChange={setActiveTab}
      >
        <TabList>
          <Tab id="types" />
          <Tab id="terms" />
          <Tab id="marks-distribution" />
        </TabList>
        <TabPanels>
          <TabPanel id="types">
            <AssessmentTypesTab />
          </TabPanel>
          <TabPanel id="terms">
            <TermsTab />
          </TabPanel>
          <TabPanel id="marks-distribution">
            <MarksDistributionTab />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}

function AssessmentTypesTab() {
  const [types, setTypes] = useState<AssessmentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssessmentCategory | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [terms, setTerms] = useState<Term[]>([]);
  const { data: activeSession } = useActiveSession();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TypeFormData>({
    resolver: zodResolver(typeSchema),
    defaultValues: {
      name: '',
      code: '',
      category: '',
      term_id: null,
      display_order: 0,
      is_active: true,
    },
  });

  const fetchTypes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await assessmentsApi.getCategories();
      setTypes(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load assessment types');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTerms = useCallback(async () => {
    if (activeSession?.id) {
      try {
        const data = await termsApi.getAll(activeSession.id);
        setTerms(data);
      } catch (err) {
        console.error('Failed to load terms');
      }
    }
  }, [activeSession?.id]);

  useEffect(() => {
    fetchTypes();
    fetchTerms();
  }, [fetchTypes, fetchTerms]);

  const openAddModal = () => {
    setEditingId(null);
    reset({ name: '', code: '', category: '', term_id: null, display_order: 0, is_active: true });
    setModalOpen(true);
  };

  const openEditModal = (record: AssessmentCategory) => {
    setEditingId(record.id);
    reset({
      name: record.name,
      code: record.code,
      category: record.category,
      term_id: record.term?.id || null,
      display_order: record.display_order ?? 0,
      is_active: record.is_active,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: TypeFormData) => {
    try {
      setSubmitting(true);
      if (editingId) {
        await assessmentsApi.updateCategory(editingId, data);
        toast.success('Assessment type updated');
      } else {
        await assessmentsApi.createCategory(data);
        toast.success('Assessment type created');
      }
      setModalOpen(false);
      await fetchTypes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await assessmentsApi.deleteCategory(deleteTarget.id);
      toast.success('Assessment type deleted');
      setDeleteTarget(null);
      await fetchTypes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const sortedTypes = [...types].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Assessment Types</CardTitle>
        <Button onClick={openAddModal} size="sm">
          <Plus className="h-4 w-4" />
          Add Type
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          </div>
        ) : sortedTypes.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">No assessment types configured yet.</p>
            <Button variant="outline" className="mt-4" onClick={openAddModal}>
              <Plus className="h-4 w-4" />
              Add Your First Type
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTypes.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.name}</TableCell>
                  <TableCell>{record.code}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{record.category || '-'}</Badge>
                  </TableCell>
                  <TableCell>{record.term?.name || '-'}</TableCell>
                  <TableCell>{record.display_order ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={record.is_active ? 'success' : 'secondary'}>
                      {record.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditModal(record)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(record)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Assessment Type' : 'Add Assessment Type'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <Input
            label="Name"
            placeholder="e.g., Mid-term Exam"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Code"
            placeholder="e.g., MID"
            error={errors.code?.message}
            {...register('code')}
          />
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <select
              className="flex h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
              value={watch('category')}
              onChange={(e) => setValue('category', e.target.value, { shouldValidate: true })}
            >
              <option value="" disabled>Select category</option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.category?.message && (
              <p className="mt-1.5 text-sm text-red-600">{errors.category.message}</p>
            )}
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Term (Optional)</label>
            <select
              className="flex h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
              value={watch('term_id') || ''}
              onChange={(e) => setValue('term_id', e.target.value || null, { shouldValidate: true })}
            >
              <option value="">No Term</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <Input
            label="Display Order"
            type="number"
            min={0}
            step={1}
            error={errors.display_order?.message}
            {...register('display_order', { valueAsNumber: true })}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              checked={watch('is_active')}
              onChange={(e) => setValue('is_active', e.target.checked)}
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              {editingId ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Assessment Type"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
      />
    </Card>
  );
}

function MarksDistributionTab() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [activeTypes, setActiveTypes] = useState<AssessmentCategory[]>([]);
  const [distributions, setDistributions] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [classesData, typesData, distData] = await Promise.all([
        classesApi.getAll(),
        assessmentsApi.getCategories(),
        marksDistributionApi.getAll(),
      ]);

      setClasses(classesData.sort((a, b) => a.level - b.level));

      const filteredTypes = typesData
        .filter((t) => t.is_active)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      setActiveTypes(filteredTypes);

      // Convert distData list into nested record: { [classId]: { [typeId]: fullMarks } }
      const distMap: Record<string, Record<string, number>> = {};
      classesData.forEach((c) => {
        distMap[c.id] = {};
        filteredTypes.forEach((t) => {
          distMap[c.id][t.id] = 0;
        });
      });

      distData.forEach((d) => {
        if (distMap[d.class_id]) {
          distMap[d.class_id][d.assessment_type_id] = d.full_marks;
        }
      });

      setDistributions(distMap);
    } catch (err) {
      toast.error('Failed to load marks distribution data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInputChange = (classId: string, typeId: string, valueStr: string) => {
    const val = valueStr === '' ? 0 : parseInt(valueStr, 10);
    if (isNaN(val) || val < 0) return;

    setDistributions((prev) => ({
      ...prev,
      [classId]: {
        ...prev[classId],
        [typeId]: val,
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload: any[] = [];
      Object.entries(distributions).forEach(([classId, typeMap]) => {
        Object.entries(typeMap).forEach(([typeId, fullMarks]) => {
          payload.push({
            class_id: classId,
            assessment_type_id: typeId,
            full_marks: fullMarks,
          });
        });
      });

      await marksDistributionApi.bulkSave(payload);
      toast.success('Marks distribution updated successfully');
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const getRowTotal = (classId: string) => {
    const row = distributions[classId] || {};
    return Object.values(row).reduce((sum, val) => sum + val, 0);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
        </CardContent>
      </Card>
    );
  }

  if (classes.length === 0 || activeTypes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          No classes or active assessment types found. Please configure them first.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 shadow-sm overflow-hidden">
      {/* Header Panel matching design */}
      <div className="bg-amber-50 border-b border-amber-100 p-6 flex flex-row items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-amber-900">Marks Distribution per Class</h2>
          <p className="text-sm text-amber-700/80 mt-1">
            Configure the marks distribution for summative and formative assessments for each class.
          </p>
        </div>
        <Button
          onClick={handleSave}
          isLoading={saving}
          className="bg-amber-600 hover:bg-amber-700 text-white border-none shadow-sm flex items-center gap-2 px-4 py-2 rounded-lg"
        >
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <CardContent className="p-0 overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader className="bg-amber-50/30">
            <TableRow className="border-b border-amber-100">
              <TableHead className="font-bold text-amber-800 uppercase tracking-wider text-sm px-6 py-4">
                Class
              </TableHead>
              {activeTypes.map((type) => (
                <TableHead
                  key={type.id}
                  className="font-bold text-amber-800 uppercase tracking-wider text-center text-sm px-4 py-4"
                >
                  {type.name}
                </TableHead>
              ))}
              <TableHead className="font-bold text-amber-800 uppercase tracking-wider text-center text-sm px-6 py-4">
                Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.map((cls) => {
              const rowTotal = getRowTotal(cls.id);
              return (
                <TableRow key={cls.id} className="border-b border-amber-100/50 hover:bg-amber-50/10">
                  <TableCell className="font-bold text-amber-900 px-6 py-4 text-base">
                    {cls.name}
                  </TableCell>
                  {activeTypes.map((type) => (
                    <TableCell key={type.id} className="text-center px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        value={distributions[cls.id]?.[type.id] ?? 0}
                        onChange={(e) => handleInputChange(cls.id, type.id, e.target.value)}
                        className="w-20 px-2 py-1.5 text-center font-semibold text-amber-900 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none bg-amber-50/5 transition-colors duration-150"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-center px-6 py-4">
                    <span className="inline-block bg-amber-100/60 text-amber-800 font-bold px-3 py-1.5 rounded-md min-w-12 text-center border border-amber-200">
                      {rowTotal}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TermsTab() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Term | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { data: activeSession } = useActiveSession();

  const termSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    display_order: z.number().int('Must be a whole number').min(0, 'Min is 0'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof termSchema>>({
    resolver: zodResolver(termSchema),
    defaultValues: { name: '', display_order: 0 },
  });

  const fetchTermsData = useCallback(async () => {
    if (!activeSession?.id) return;
    try {
      setLoading(true);
      const data = await termsApi.getAll(activeSession.id);
      setTerms(data);
    } catch (err) {
      toast.error('Failed to load terms');
    } finally {
      setLoading(false);
    }
  }, [activeSession?.id]);

  useEffect(() => {
    fetchTermsData();
  }, [fetchTermsData]);

  const openAddModal = () => {
    setEditingId(null);
    reset({ name: '', display_order: 0 });
    setModalOpen(true);
  };

  const openEditModal = (record: Term) => {
    setEditingId(record.id);
    reset({ name: record.name, display_order: record.display_order ?? 0 });
    setModalOpen(true);
  };

  const onSubmit = async (data: z.infer<typeof termSchema>) => {
    if (!activeSession?.id) return;
    try {
      setSubmitting(true);
      if (editingId) {
        await termsApi.update(editingId, data);
        toast.success('Term updated');
      } else {
        await termsApi.create({ ...data, session_id: activeSession.id } as any);
        toast.success('Term created');
      }
      setModalOpen(false);
      await fetchTermsData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await termsApi.delete(deleteTarget.id);
      toast.success('Term deleted');
      setDeleteTarget(null);
      await fetchTermsData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const sortedTerms = [...terms].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  if (!activeSession) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          No active academic session found. Create and activate a session first.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Academic Terms</CardTitle>
        <Button onClick={openAddModal} size="sm">
          <Plus className="h-4 w-4" /> Add Term
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          </div>
        ) : sortedTerms.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">No terms configured yet.</p>
            <Button variant="outline" className="mt-4" onClick={openAddModal}>
              <Plus className="h-4 w-4" /> Add Your First Term
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTerms.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.name}</TableCell>
                  <TableCell>{record.display_order ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditModal(record)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(record)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Term' : 'Add Term'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <Input label="Name" placeholder="e.g., First Term" error={errors.name?.message} {...register('name')} />
          <Input label="Display Order" type="number" min={0} step={1} error={errors.display_order?.message} {...register('display_order', { valueAsNumber: true })} />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={submitting}>{editingId ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Term"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
      />
    </Card>
  );
}
