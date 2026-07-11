"""MarksEntry service: business logic for marks entry operations."""

from __future__ import annotations

from uuid import UUID

import structlog
from django.db import transaction
from django.db.models import QuerySet

from shared.base_service import BaseService
from shared.exceptions import (
    ConflictException,
    ForbiddenException,
    MarksAuthorizationException,
    MarksValidationException,
    NotFoundException,
)
from core.models_audit import AuditLog
from results.models import MarksEntry
from results.repositories.marks_entry_repository import MarksEntryRepository

logger = structlog.get_logger(__name__)


class MarksEntryService(BaseService):
    """Handles marks entry CRUD and authorization checks."""

    def __init__(self) -> None:
        self.repo = MarksEntryRepository()

    def enter_marks(
        self,
        enrollment_id: UUID,
        subject_id: UUID,
        exam_component_id: UUID,
        obtained_marks: int,
        is_absent: bool = False,
        is_grade_only: bool = False,
        entered_by_id: UUID | None = None,
    ) -> MarksEntry:
        """Create a single marks entry with validation."""
        self._validate_marks(obtained_marks)

        existing = self.repo.get_entry(
            enrollment_id=enrollment_id,
            subject_id=subject_id,
            exam_component_id=exam_component_id,
        )
        if existing:
            self.log.warning(
                "marks_entry.already_exists",
                enrollment_id=str(enrollment_id),
                subject_id=str(subject_id),
            )
            raise ConflictException(
                "Marks already entered for this enrollment, subject and exam component. "
                "Use update instead."
            )

        self.log.info(
            "marks_entry.creating",
            enrollment_id=str(enrollment_id),
            subject_id=str(subject_id),
        )
        entry = self.repo.create(
            enrollment_id=enrollment_id,
            subject_id=subject_id,
            exam_component_id=exam_component_id,
            obtained_marks=obtained_marks,
            is_absent=is_absent,
            is_grade_only=is_grade_only,
            entered_by_id=entered_by_id,
        )
        AuditLog.log(
            action="marks Entered",
            entity_type="MarksEntry",
            entity_id=str(entry.id),
            details={
                "enrollment_id": str(enrollment_id),
                "subject_id": str(subject_id),
                "exam_component_id": str(exam_component_id),
                "obtained_marks": obtained_marks,
            },
        )
        return entry

    def update_marks(
        self,
        entry_id: UUID,
        obtained_marks: int = None,
        is_absent: bool = None,
        is_grade_only: bool = None,
    ) -> MarksEntry:
        """Update obtained marks for an existing entry."""
        entry = self.repo.get_by_id_or_raise(entry_id, "Marks entry not found.")

        if obtained_marks is not None and obtained_marks < 0:
            self.log.warning(
                "marks_entry.validation_failed",
                entry_id=str(entry_id),
                obtained=obtained_marks,
            )
            raise MarksValidationException(
                f"Obtained marks ({obtained_marks}) cannot be negative."
            )

        self.log.info("marks_entry.updating", entry_id=str(entry_id))
        old_marks = entry.obtained_marks
        update_kwargs = {}
        if obtained_marks is not None:
            update_kwargs["obtained_marks"] = obtained_marks
        if is_absent is not None:
            update_kwargs["is_absent"] = is_absent
        if is_grade_only is not None:
            update_kwargs["is_grade_only"] = is_grade_only
        updated = self.repo.update(entry_id, **update_kwargs)
        AuditLog.log(
            action="marks_updated",
            entity_type="MarksEntry",
            entity_id=str(entry_id),
            details={
                "obtained_marks": f"{old_marks} -> {obtained_marks}",
            },
        )
        return updated  # type: ignore[return-value]

    @transaction.atomic
    def bulk_upsert(
        self,
        entries: list[dict],
        entered_by_id: UUID,
    ) -> list[MarksEntry]:
        """Bulk create or update marks entries."""
        for entry in entries:
            self._validate_marks(entry["obtained_marks"])
            entry["entered_by_id"] = entered_by_id

        self.log.info("marks_entry.bulk_upsert", count=len(entries))
        return self.repo.bulk_create_or_update(entries)

    def authorize_entry(
        self, user_id: UUID, enrollment_id: UUID, subject_id: UUID
    ) -> tuple[bool, str | None]:
        """Check if a user is authorized to enter marks for this enrollment+subject.

        Admins are always authorized. Teachers must have an active
        TeacherAssignment for the enrollment's class-section-subject-session.
        """
        from core.models import User

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return False, "User not found."

        if user.role == "admin":
            return True, None

        if user.role != "teacher":
            return False, "Only admins and teachers can enter marks."

        from enrollments.models import Enrollment
        from academics.models import TeacherAssignment
        from identity.models import TeacherProfile

        try:
            enrollment = Enrollment.objects.select_related(
                "class_field", "section", "session"
            ).get(id=enrollment_id)
        except Enrollment.DoesNotExist:
            return False, "Enrollment not found."

        try:
            teacher_profile = TeacherProfile.objects.get(user=user)
        except TeacherProfile.DoesNotExist:
            return False, "Teacher profile not found."

        has_assignment = TeacherAssignment.objects.filter(
            teacher=teacher_profile,
            class_ref=enrollment.class_field,
            section=enrollment.section,
            subject_id=subject_id,
            session=enrollment.session,
            is_active=True,
        ).exists()

        if not has_assignment:
            return False, "You are not assigned to teach this subject for this class."

        return True, None

    def get_entries_for_enrollment(self, enrollment_id: UUID) -> QuerySet[MarksEntry]:
        """Return all marks entries for a given enrollment."""
        return self.repo.get_for_enrollment(enrollment_id)

    @staticmethod
    def _validate_marks(obtained_marks: int) -> None:
        """Validate marks constraints."""
        if obtained_marks < 0:
            raise MarksValidationException("Obtained marks cannot be negative.")
