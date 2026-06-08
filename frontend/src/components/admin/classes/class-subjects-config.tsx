"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Save,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { subjectsApi, classSubjectAssignmentsApi } from "@/lib/api/core";
import type { Subject, ClassSubjectAssignment } from "@/types";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ClassSubjectsConfigProps {
  classId: string;
  className: string;
}

export function ClassSubjectsConfig({
  classId,
  className,
}: ClassSubjectsConfigProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<ClassSubjectAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Local state for batch editing
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(
    new Set(),
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [classId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const subjectsData = await subjectsApi.getAll();
      setSubjects(subjectsData);
      await fetchAssignments();
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    setAssignmentsLoading(true);
    try {
      const data = await classSubjectAssignmentsApi.getByClass(classId);
      setAssignments(data);

      // Initialize local selection state
      const currentIds = new Set(
        data
          .map((a) => a.subject?.id || a.subject_id)
          .filter((id): id is string => !!id),
      );
      setSelectedSubjectIds(currentIds);
      setHasChanges(false);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast.error("Failed to load existing assignments");
      setAssignments([]);
      setSelectedSubjectIds(new Set());
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const toggleSubjectAssignment = (subjectId: string) => {
    const newSelected = new Set(selectedSubjectIds);
    if (newSelected.has(subjectId)) {
      newSelected.delete(subjectId);
    } else {
      newSelected.add(subjectId);
    }

    setSelectedSubjectIds(newSelected);

    // Check if changed from original
    const originalIds = new Set(
      assignments.map((a) => a.subject?.id || a.subject_id),
    );

    // Check if sets are equal (size check + every element check)
    let isChanged = newSelected.size !== originalIds.size;
    if (!isChanged) {
      for (let id of newSelected) {
        if (!originalIds.has(id)) {
          isChanged = true;
          break;
        }
      }
    }

    setHasChanges(isChanged);
  };

  const handleCancel = () => {
    // Revert to original assignments
    const currentIds = new Set(
      assignments
        .map((a) => a.subject?.id || a.subject_id)
        .filter((id): id is string => !!id),
    );
    setSelectedSubjectIds(currentIds);
    setHasChanges(false);
    toast.info("Changes reverted");
  };

  const confirmSave = async () => {
    setSaving(true);
    setShowConfirmModal(false);

    try {
      await classSubjectAssignmentsApi.bulkUpdate({
        class_id: classId,
        subject_ids: Array.from(selectedSubjectIds),
      });

      toast.success("Assignments saved successfully");
      await fetchAssignments(); // Refresh data and reset state
    } catch (error) {
      console.error("Error saving assignments:", error);
      toast.error("Failed to save assignments");
      setSaving(false);
    }
  };

  // Filter subjects based on search
  const filteredSubjects = subjects.filter(
    (subject) =>
      subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header / Selection Area */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          {/* Subject Search */}
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Subjects
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="shrink-0 flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={!hasChanges || saving}
            >
              Cancel
            </Button>

            <Button
              onClick={() => setShowConfirmModal(true)}
              disabled={!hasChanges || saving}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-amber-600" />
          Configured Subjects
        </h3>

        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-gray-500">
            {selectedSubjectIds.size} selected
          </Badge>
          {hasChanges && (
            <Badge variant="danger" className="animate-pulse">
              Unsaved Changes
            </Badge>
          )}
        </div>
      </div>

      {assignmentsLoading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-gray-100">
          <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((subject) => {
            const isSelected = selectedSubjectIds.has(subject.id);

            return (
              <div
                key={subject.id}
                onClick={() => toggleSubjectAssignment(subject.id)}
                className={`
                  relative group cursor-pointer p-4 rounded-xl border-2 transition-all duration-200
                  ${
                    isSelected
                      ? "border-amber-500 bg-amber-50/50 shadow-sm transform scale-[1.01]"
                      : "border-gray-100 bg-white hover:border-amber-200 hover:shadow-md"
                  }
                `}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4
                      className={`font-semibold ${
                        isSelected ? "text-amber-900" : "text-gray-900"
                      }`}
                    >
                      {subject.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className="bg-gray-100 font-normal"
                      >
                        {subject.code}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Marks: {subject.full_marks || "N/A"}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`
                    w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300
                    ${
                      isSelected
                        ? "bg-amber-600 text-white rotate-0"
                        : "bg-gray-100 text-gray-300 group-hover:bg-amber-100 group-hover:text-amber-600 rotate-90"
                    }
                  `}
                  >
                    {isSelected ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="absolute inset-0 border-2 border-amber-500 rounded-xl pointer-events-none animate-in fade-in zoom-in-95 duration-200" />
                )}
              </div>
            );
          })}

          {filteredSubjects.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p>No subjects found matching "{searchTerm}"</p>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Assignment Changes"
        size="sm"
      >
        <div className="p-4 space-y-4">
          <p className="text-gray-600 text-sm">
            You are about to update the subject assignments for{" "}
            <strong>{className}</strong>. This action will overwrite existing
            assignments.
          </p>

          <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="text-center flex-1">
              <div className="text-xs text-gray-500 uppercase font-medium tracking-wide mb-1">
                Previous
              </div>
              <div className="text-xl font-semibold text-gray-700">
                {assignments.length}
              </div>
            </div>

            <div className="text-gray-300">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </div>

            <div className="text-center flex-1">
              <div className="text-xs text-amber-600 uppercase font-medium tracking-wide mb-1">
                New
              </div>
              <div className="text-xl font-bold text-amber-600">
                {selectedSubjectIds.size}
              </div>
            </div>
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={confirmSave}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Confirm Update
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
