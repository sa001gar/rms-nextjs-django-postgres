"""MarksEntry repository: data access for MarksEntry model."""

from __future__ import annotations

from uuid import UUID

from django.db import transaction
from django.db.models import QuerySet

from shared.base_repository import BaseRepository
from results.models import MarksEntry


class MarksEntryRepository(BaseRepository[MarksEntry]):
    """Repository for MarksEntry data access."""

    model = MarksEntry

    def get_for_enrollment(self, enrollment_id: UUID) -> QuerySet[MarksEntry]:
        return (
            self.model.objects.filter(enrollment_id=enrollment_id)
            .select_related("subject", "exam_component", "entered_by")
            .order_by("subject__code", "exam_component__display_order")
        )

    def get_for_class_subject(
        self, enrollment_ids: list[UUID], subject_id: UUID
    ) -> QuerySet[MarksEntry]:
        return (
            self.model.objects.filter(
                enrollment_id__in=enrollment_ids,
                subject_id=subject_id,
            )
            .select_related("enrollment", "exam_component", "entered_by")
            .order_by("enrollment__roll_no", "exam_component__display_order")
        )

    def get_entry(
        self, enrollment_id: UUID, subject_id: UUID, exam_component_id: UUID
    ) -> MarksEntry | None:
        try:
            return self.model.objects.get(
                enrollment_id=enrollment_id,
                subject_id=subject_id,
                exam_component_id=exam_component_id,
            )
        except self.model.DoesNotExist:
            return None

    @transaction.atomic
    def bulk_create_or_update(self, entries: list[dict]) -> list[MarksEntry]:
        """Upsert marks entries: update if exists, create otherwise."""
        results = []
        for entry in entries:
            existing = self.get_entry(
                enrollment_id=entry["enrollment_id"],
                subject_id=entry["subject_id"],
                exam_component_id=entry["exam_component_id"],
            )
            if existing:
                existing.marks_value = entry["obtained_marks"]
                existing.is_absent = entry.get("is_absent", False)
                if entry.get("is_grade_only", False):
                    existing.grade_value = str(entry["obtained_marks"])
                    existing.marks_value = None
                else:
                    existing.grade_value = None
                if entry.get("remarks"):
                    existing.remarks = entry["remarks"]
                if entry.get("entered_by_id"):
                    existing.entered_by_id = entry["entered_by_id"]
                existing.save()
                results.append(existing)
            else:
                kwargs = {
                    "enrollment_id": entry["enrollment_id"],
                    "subject_id": entry["subject_id"],
                    "exam_component_id": entry["exam_component_id"],
                    "marks_value": entry["obtained_marks"],
                    "is_absent": entry.get("is_absent", False),
                    "remarks": entry.get("remarks", ""),
                    "entered_by_id": entry.get("entered_by_id"),
                }
                if entry.get("is_grade_only", False):
                    kwargs["grade_value"] = str(entry["obtained_marks"])
                    kwargs["marks_value"] = None
                obj = self.model.objects.create(**kwargs)
                results.append(obj)
        return results
