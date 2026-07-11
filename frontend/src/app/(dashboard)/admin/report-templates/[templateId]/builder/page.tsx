'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api/client';
import { templatesApi } from '@/lib/api/templates';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import {
  GripVertical,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Eye,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  ReportCardTemplate,
  ReportCardSection,
  SectionType,
  SectionSubjectGroup,
} from '@/types/template';
import { SECTION_TYPE_LABELS } from '@/types/template';

function formatConfigSummary(config: Record<string, any>): string {
  const parts: string[] = [];
  if (config.column_widths) parts.push(`${config.column_widths} col`);
  if (config.show_header !== undefined) parts.push(config.show_header ? 'header on' : 'header off');
  return parts.join(', ') || 'default config';
}

interface SubjectCategory {
  id: string;
  name: string;
  code: string;
}

export default function TemplateBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const templateId = params.templateId as string;

  const [sections, setSections] = useState<ReportCardSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ['report-template', templateId],
    queryFn: () => templatesApi.get(templateId),
    enabled: !!templateId,
  });

  const { data: subjectCategories = [] } = useQuery<SubjectCategory[]>({
    queryKey: ['subject-categories'],
    queryFn: () => {
      const res = api.get<{ results?: SubjectCategory[] } | SubjectCategory[]>('/academics/subject-categories/');
      return res.then((data) => (Array.isArray(data) ? data : data.results || []));
    },
  });

  if (template && sections.length === 0 && template.sections) {
    setSections([...template.sections].sort((a, b) => a.display_order - b.display_order));
  }

  const selectedSection = sections.find((s) => s.id === selectedSectionId) ?? null;

  const usedTypes = new Set(sections.map((s) => s.section_type));
  const availableTypes = (Object.keys(SECTION_TYPE_LABELS) as SectionType[]).filter(
    (t) => !usedTypes.has(t)
  );

  const addSection = useCallback((sectionType: SectionType) => {
    const newSection: ReportCardSection = {
      id: `new-${Date.now()}`,
      template: templateId,
      section_type: sectionType,
      display_order: sections.length,
      title: SECTION_TYPE_LABELS[sectionType],
      config: {},
      subject_groups: [],
    };
    setSections((prev) => [...prev, newSection]);
    setSelectedSectionId(newSection.id);
  }, [templateId, sections.length]);

  const removeSection = useCallback((sectionId: string) => {
    setSections((prev) => {
      const filtered = prev.filter((s) => s.id !== sectionId);
      return filtered.map((s, i) => ({ ...s, display_order: i }));
    });
    setSelectedSectionId((prev) => (prev === sectionId ? null : prev));
  }, []);

  const moveSection = useCallback((sectionId: string, direction: 'up' | 'down') => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === sectionId);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next.map((s, i) => ({ ...s, display_order: i }));
    });
  }, []);

  const updateSectionField = useCallback(
    (sectionId: string, field: string, value: any) => {
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, [field]: value } : s))
      );
    },
    []
  );

  const updateSectionConfig = useCallback(
    (sectionId: string, key: string, value: any) => {
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId ? { ...s, config: { ...s.config, [key]: value } } : s
        )
      );
    },
    []
  );

  const updateSubjectGroup = useCallback(
    (sectionId: string, groupIndex: number, field: string, value: any) => {
      setSections((prev) =>
        prev.map((s) => {
          if (s.id !== sectionId) return s;
          const groups = [...s.subject_groups];
          groups[groupIndex] = { ...groups[groupIndex], [field]: value };
          return { ...s, subject_groups: groups };
        })
      );
    },
    []
  );

  const addSubjectGroup = useCallback((sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          subject_groups: [
            ...s.subject_groups,
            {
              id: `new-${Date.now()}`,
              section: sectionId,
              subject_category: null,
              include_scholastic: false,
              display_order: s.subject_groups.length,
            },
          ],
        };
      })
    );
  }, []);

  const removeSubjectGroup = useCallback((sectionId: string, groupIndex: number) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          subject_groups: s.subject_groups.filter((_, i) => i !== groupIndex),
        };
      })
    );
  }, []);

  const saveTemplate = useMutation({
    mutationFn: async () => {
      setSaving(true);
      for (const section of sections) {
        if (section.id.startsWith('new-')) {
          const created = await templatesApi.sections.create(templateId, {
            section_type: section.section_type,
            display_order: section.display_order,
            title: section.title,
            config: section.config,
          });
          for (const group of section.subject_groups) {
            await templatesApi.subjectGroups.create(created.id, {
              subject_category: group.subject_category,
              include_scholastic: group.include_scholastic,
              display_order: group.display_order,
            });
          }
        } else {
          await templatesApi.sections.update(section.id, {
            display_order: section.display_order,
            title: section.title,
            config: section.config,
          });
        }
      }
      setSaving(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-template', templateId] });
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      toast.success('Template saved');
    },
    onError: (err) => {
      setSaving(false);
      toast.error(err instanceof Error ? err.message : 'Failed to save template');
    },
  });

  if (templateLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={template?.name ?? 'Template Builder'}
        description="Arrange report card sections"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/report-templates')}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4" /> Preview
            </Button>
            <Button onClick={() => saveTemplate.mutate()} isLoading={saveTemplate.isPending}>
              <Save className="h-4 w-4" /> Save
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Available Sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {availableTypes.length === 0 ? (
                <p className="text-sm text-gray-500">All section types added.</p>
              ) : (
                availableTypes.map((type) => (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => addSection(type)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {SECTION_TYPE_LABELS[type]}
                  </Button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Section Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sections.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  Add sections from the palette on the left.
                </p>
              ) : (
                sections.map((section, idx) => (
                  <div
                    key={section.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedSectionId === section.id
                        ? 'border-amber-500 ring-1 ring-amber-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedSectionId(section.id)}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-5 w-5 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {section.title || SECTION_TYPE_LABELS[section.section_type]}
                          </span>
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            {SECTION_TYPE_LABELS[section.section_type]}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatConfigSummary(section.config)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={idx === 0}
                          onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'up'); }}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={idx === sections.length - 1}
                          onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'down'); }}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-500"
                          onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {selectedSection ? 'Section Config' : 'Configuration'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedSection ? (
                <p className="text-sm text-gray-500">Select a section to configure.</p>
              ) : (
                <div className="space-y-4">
                  <Input
                    label="Title"
                    value={selectedSection.title}
                    onChange={(e) => updateSectionField(selectedSection.id, 'title', e.target.value)}
                  />

                  <Input
                    label="Column Widths"
                    placeholder="e.g. 3"
                    value={selectedSection.config.column_widths ?? ''}
                    onChange={(e) => updateSectionConfig(selectedSection.id, 'column_widths', e.target.value)}
                  />

                  <Checkbox
                    label="Show Header"
                    checked={selectedSection.config.show_header !== false}
                    onChange={(checked) => updateSectionConfig(selectedSection.id, 'show_header', checked)}
                  />

                  <Input
                    label="Label Override"
                    placeholder="Override section label"
                    value={selectedSection.config.label_override ?? ''}
                    onChange={(e) => updateSectionConfig(selectedSection.id, 'label_override', e.target.value)}
                  />

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Subject Groups</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addSubjectGroup(selectedSection.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Group
                      </Button>
                    </div>

                    {selectedSection.subject_groups.length === 0 && (
                      <p className="text-xs text-gray-500">No subject groups configured.</p>
                    )}

                    {selectedSection.subject_groups.map((group, gi) => (
                      <div key={group.id} className="border rounded p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600">Group {gi + 1}</span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-red-500"
                            onClick={() => removeSubjectGroup(selectedSection.id, gi)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        <Checkbox
                          label="Include All Scholastic"
                          checked={group.include_scholastic}
                          onChange={(checked) =>
                            updateSubjectGroup(selectedSection.id, gi, 'include_scholastic', checked)
                          }
                        />

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Subject Category
                          </label>
                          <select
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            value={group.subject_category ?? ''}
                            onChange={(e) =>
                              updateSubjectGroup(
                                selectedSection.id,
                                gi,
                                'subject_category',
                                e.target.value || null
                              )
                            }
                          >
                            <option value="">None</option>
                            {subjectCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <Input
                          label="Display Order"
                          type="number"
                          value={group.display_order}
                          onChange={(e) =>
                            updateSubjectGroup(
                              selectedSection.id,
                              gi,
                              'display_order',
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} title="Preview" size="xl">
        <div className="p-6">
          <p className="text-sm text-gray-500 mb-4">
            Preview not available in builder. Save the template and navigate to a student report card to see the result.
          </p>
          <div className="border rounded-lg p-6 space-y-4 bg-gray-50">
            {sections.map((section) => (
              <div key={section.id} className="border rounded bg-white p-4">
                <Badge variant="secondary" className="mb-2">
                  {SECTION_TYPE_LABELS[section.section_type]}
                </Badge>
                <h4 className="text-sm font-medium">{section.title}</h4>
                <p className="text-xs text-gray-500">{formatConfigSummary(section.config)}</p>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
