"""Service for TeacherAssignment operations."""

from __future__ import annotations

from uuid import UUID

from django.db.models import QuerySet

from academics.models import TeacherAssignment
from academics.repositories.assignment_repository import AssignmentRepository
from shared.base_service import BaseService
from shared.exceptions import ConflictException, NotFoundException


class AssignmentService(BaseService):
    """Business logic for teacher assignment management."""

    def __init__(self) -> None:
        self.repo = AssignmentRepository()

    def assign_teacher(
        self,
        teacher_id: UUID,
        class_id: UUID,
        section_id: UUID,
        subject_id: UUID,
        session_id: UUID,
    ) -> TeacherAssignment:
        if self.repo.exists_for_combination(
            teacher_id, class_id, section_id, subject_id, session_id
        ):
            raise ConflictException("This teacher assignment already exists.")
        self.log.info(
            "assignment.create",
            teacher_id=str(teacher_id),
            class_id=str(class_id),
        )
        return self.repo.create(
            teacher_id=teacher_id,
            class_ref_id=class_id,
            section_id=section_id,
            subject_id=subject_id,
            session_id=session_id,
        )

    def remove_assignment(self, assignment_id: UUID) -> bool:
        self.repo.get_by_id_or_raise(assignment_id, "Assignment not found.")
        self.log.info("assignment.delete", assignment_id=str(assignment_id))
        return self.repo.delete(assignment_id)

    def get_teacher_assignments(
        self, teacher_id: UUID, session_id: UUID
    ) -> QuerySet[TeacherAssignment]:
        return self.repo.get_by_teacher_and_session(teacher_id, session_id)

    def is_teacher_assigned(
        self,
        teacher_id: UUID,
        class_id: UUID,
        section_id: UUID,
        subject_id: UUID,
        session_id: UUID,
    ) -> bool:
        return self.repo.exists_for_combination(
            teacher_id, class_id, section_id, subject_id, session_id
        )

    def get_class_assignments(
        self, class_id: UUID, session_id: UUID
    ) -> QuerySet[TeacherAssignment]:
        return TeacherAssignment.objects.filter(
            class_ref_id=class_id, session_id=session_id, is_active=True
        ).select_related("teacher", "section", "subject")
