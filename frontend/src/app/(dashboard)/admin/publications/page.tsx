'use client';

import { useState } from 'react';
import {
  usePublications,
  usePublicationSummary,
  useCreatePublication,
  useSubmitForReview,
  usePublishResults,
  useUnpublishResults,
} from '@/hooks/use-publications';
import { useSessions, useActiveSession } from '@/hooks/use-sessions';
import { useClasses, useSections } from '@/hooks/use-classes';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StatsCard } from '@/components/ui/stats-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Loading } from '@/components/ui/loading';
import { FileText, FileCheck, CheckCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';

const statusConfig = {
  draft: { label: 'Draft', variant: 'secondary' as const },
  under_review: { label: 'Under Review', variant: 'warning' as const },
  published: { label: 'Published', variant: 'success' as const },
  unpublished: { label: 'Unpublished', variant: 'danger' as const },
};

export default function PublicationsPage() {
  const { data: activeSession } = useActiveSession();
  const { data: sessions = [] } = useSessions();
  const { data: classes = [] } = useClasses();
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [publishTarget, setPublishTarget] = useState<{ id: string; className: string; sectionName: string } | null>(null);

  const [formClassId, setFormClassId] = useState('');
  const [formSectionId, setFormSectionId] = useState('');
  const [formRemarks, setFormRemarks] = useState('');

  const sessionId = selectedSession || activeSession?.id || '';
  const { data: publications = [], isLoading } = usePublications(sessionId);
  const { data: summary } = usePublicationSummary(sessionId);
  const { data: sections = [] } = useSections(formClassId);

  const createPublication = useCreatePublication();
  const submitForReview = useSubmitForReview();
  const publishResults = usePublishResults();
  const unpublishResults = useUnpublishResults();

  const handleCreate = async () => {
    if (!formClassId || !formSectionId) {
      toast.error('Please select a class and section');
      return;
    }
    try {
      await createPublication.mutateAsync({
        session_id: sessionId,
        class_id: formClassId,
        section_id: formSectionId,
        remarks: formRemarks || undefined,
      });
      toast.success('Publication created');
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create publication');
    }
  };

  const handleSubmitForReview = async (id: string) => {
    try {
      await submitForReview.mutateAsync(id);
      toast.success('Submitted for review');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit');
    }
  };

  const handlePublish = async () => {
    if (!publishTarget) return;
    try {
      await publishResults.mutateAsync(publishTarget.id);
      toast.success('Results published successfully');
      setPublishTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish');
    }
  };

  const handleUnpublish = async (id: string) => {
    try {
      await unpublishResults.mutateAsync(id);
      toast.success('Results unpublished');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to unpublish');
    }
  };

  const resetForm = () => {
    setFormClassId('');
    setFormSectionId('');
    setFormRemarks('');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Result Publications"
        description="Manage and publish examination results"
        actions={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4" /> Create Publication
          </Button>
        }
      />

      <div className="flex gap-4">
        <Select
          placeholder="Select Session"
          options={sessions.map((s) => ({ value: s.id, label: s.name }))}
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
          className="w-64"
        />
      </div>

      {sessionId && summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <StatsCard
            title="Total"
            value={summary.total}
            icon={FileText}
          />
          <StatsCard
            title="Draft"
            value={summary.draft}
            icon={FileText}
            className="border-gray-200"
          />
          <StatsCard
            title="Under Review"
            value={summary.under_review}
            icon={FileCheck}
            className="border-yellow-200"
          />
          <StatsCard
            title="Published"
            value={summary.published}
            icon={CheckCircle}
            className="border-green-200"
          />
        </div>
      )}

      {isLoading ? (
        <Loading />
      ) : publications.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No publications"
          description="Create your first result publication"
          action={{ label: 'Create Publication', onClick: () => setIsModalOpen(true) }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Published By</TableHead>
                <TableHead>Published At</TableHead>
                <TableHead className="w-48">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {publications.map((pub) => (
                <TableRow key={pub.id}>
                  <TableCell className="font-medium">{pub.class_name}</TableCell>
                  <TableCell>{pub.section_name}</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[pub.status].variant}>
                      {statusConfig[pub.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>{pub.published_by_email || '-'}</TableCell>
                  <TableCell>{formatDate(pub.published_at)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {pub.status === 'draft' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSubmitForReview(pub.id)}
                          isLoading={submitForReview.isPending}
                        >
                          Submit for Review
                        </Button>
                      )}
                      {pub.status === 'under_review' && (
                        <>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() =>
                              setPublishTarget({
                                id: pub.id,
                                className: pub.class_name,
                                sectionName: pub.section_name,
                              })
                            }
                          >
                            Publish
                          </Button>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </>
                      )}
                      {pub.status === 'published' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleUnpublish(pub.id)}
                          isLoading={unpublishResults.isPending}
                        >
                          Unpublish
                        </Button>
                      )}
                      
                      {pub.status === 'published' && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a href={`/admin/publications/${pub.id}/report-card`} target="_blank" rel="noopener noreferrer">
                            View Report Cards
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Publication" size="md">
        <div className="p-6 space-y-4">
          <Select
            label="Class"
            placeholder="Select Class"
            options={classes.map((c) => ({ value: c.id, label: c.name }))}
            value={formClassId}
            onChange={(e) => {
              setFormClassId(e.target.value);
              setFormSectionId('');
            }}
          />
          <Select
            label="Section"
            placeholder="Select Section"
            options={sections.map((s) => ({ value: s.id, label: s.name }))}
            value={formSectionId}
            onChange={(e) => setFormSectionId(e.target.value)}
            disabled={!formClassId}
          />
          <Textarea
            label="Remarks"
            placeholder="Optional remarks..."
            value={formRemarks}
            onChange={(e) => setFormRemarks(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} isLoading={createPublication.isPending}>
              Create Publication
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        onConfirm={handlePublish}
        title="Publish Results"
        message={`Are you sure you want to publish results for ${publishTarget?.className} - ${publishTarget?.sectionName}? This will notify all students.`}
        confirmLabel="Publish"
        confirmVariant="success"
      />
    </div>
  );
}
