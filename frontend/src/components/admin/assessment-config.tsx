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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { assessmentsApi, type AssessmentCategory } from '@/lib/api/assessments';
import { classesApi } from '@/lib/api/classes';
import { subjectsApi } from '@/lib/api/subjects';
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
          { id: 'weightage', label: 'Weightage Configuration' },
        ]}
        defaultValue="types"
        onChange={setActiveTab}
      >
        <TabList>
          <Tab id="types" />
          <Tab id="weightage" />
        </TabList>
        <TabPanels>
          <TabPanel id="types">
            <AssessmentTypesTab />
          </TabPanel>
          <TabPanel id="weightage">
            <WeightageConfigTab />
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

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const openAddModal = () => {
    setEditingId(null);
    reset({ name: '', code: '', category: '', display_order: 0, is_active: true });
    setModalOpen(true);
  };

  const openEditModal = (record: AssessmentCategory) => {
    setEditingId(record.id);
    reset({
      name: record.name,
      code: record.code,
      category: record.category,
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

function WeightageConfigTab() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assessmentTypes, setAssessmentTypes] = useState<AssessmentCategory[]>([]);

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  const [weightages, setWeightages] = useState<Record<string, { full_marks: number; weightage: number }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    classesApi.getAll().then(setClasses).catch(() => toast.error('Failed to load classes'));
    subjectsApi.getAll().then(setSubjects).catch(() => toast.error('Failed to load subjects'));
    assessmentsApi.getCategories().then(setAssessmentTypes).catch(() => toast.error('Failed to load assessment types'));
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setSelectedSubjectId('');
      return;
    }
    setSelectedSubjectId('');
    setWeightages({});
  }, [selectedClassId]);

  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId) {
      setWeightages({});
      return;
    }
    setLoading(true);
    assessmentsApi.getWeightages(selectedClassId, selectedSubjectId)
      .then((data) => {
        const map: Record<string, { full_marks: number; weightage: number }> = {};
        data.forEach((w) => {
          map[w.assessment_type_id] = { full_marks: w.full_marks, weightage: w.weightage };
        });
        setWeightages(map);
      })
      .catch(() => toast.error('Failed to load weightages'))
      .finally(() => setLoading(false));
  }, [selectedClassId, selectedSubjectId]);

  const totalWeightage = Object.values(weightages).reduce((sum, w) => sum + (w.weightage || 0), 0);
  const isValidTotal = Math.abs(totalWeightage - 100) < 0.01;
  const activeTypes = assessmentTypes.filter((t) => t.is_active).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  const updateWeightage = (typeId: string, field: 'full_marks' | 'weightage', value: number) => {
    setWeightages((prev) => ({
      ...prev,
      [typeId]: { ...prev[typeId] || { full_marks: 0, weightage: 0 }, [field]: value },
    }));
  };

  const handleSave = async () => {
    if (!selectedClassId || !selectedSubjectId) return;
    if (!isValidTotal) {
      toast.error(`Total weightage must equal 100%. Currently: ${totalWeightage}%`);
      return;
    }
    try {
      setSaving(true);
      const payload = activeTypes
        .filter((t) => weightages[t.id])
        .map((t) => ({
          assessment_type_id: t.id,
          full_marks: weightages[t.id].full_marks,
          weightage_pct: weightages[t.id].weightage,
        }));
      await assessmentsApi.setWeightage({
        class_id: selectedClassId,
        subject_id: selectedSubjectId,
        weightages: payload,
      });
      toast.success('Weightage configuration saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save weightage');
    } finally {
      setSaving(false);
    }
  };

  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }));
  const sectionOptions = sections.map((s) => ({ value: s.id, label: s.name }));
  const subjectOptions = subjects.map((s) => ({ value: s.id, label: s.name }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weightage Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-2xl">
          <Select
            label="Class"
            placeholder="Select class"
            options={classOptions}
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          />
          <Select
            label="Subject"
            placeholder={
              !selectedClassId 
                ? "Select a class first" 
                : subjectOptions.length === 0 
                ? "No subjects found" 
                : "Select subject"
            }
            options={subjectOptions}
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            disabled={!selectedClassId || subjectOptions.length === 0}
          />
        </div>

        {!selectedClassId || !selectedSubjectId ? (
          <div className="py-12 text-center text-gray-500">
            Select a class and subject to configure weightages.
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          </div>
        ) : activeTypes.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No active assessment types found. Create assessment types first.
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessment Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="w-[140px]">Full Marks</TableHead>
                  <TableHead className="w-[140px]">Weightage %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{type.category || '-'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={weightages[type.id]?.full_marks ?? ''}
                        onChange={(e) => updateWeightage(type.id, 'full_marks', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={weightages[type.id]?.weightage ?? ''}
                        onChange={(e) => updateWeightage(type.id, 'weightage', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Total Weightage:</span>
                <Badge variant={isValidTotal ? 'success' : totalWeightage > 100 ? 'danger' : 'warning'}>
                  {totalWeightage.toFixed(2)}%
                </Badge>
                {!isValidTotal && (
                  <span className="text-sm text-red-600">
                    Must equal 100% (currently {totalWeightage > 100 ? 'over' : 'under'} by {Math.abs(totalWeightage - 100).toFixed(2)}%)
                  </span>
                )}
              </div>
              <Button onClick={handleSave} isLoading={saving} disabled={!isValidTotal}>
                Save Configuration
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
