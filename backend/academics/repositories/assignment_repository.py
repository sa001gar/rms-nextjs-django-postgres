"""Repository for TeacherAssignment persistence."""

from __future__ import annotations

from uuid import UUID

from django.db.models import QuerySet

from academics.models import TeacherAssignment
from shared.base_repository import BaseRepository


class AssignmentRepository(BaseRepository[TeacherAssignment]):
    model = TeacherAssignment

    def get_by_teacher_and_session(
        self, teacher_id: UUID, session_id: UUID
    ) -> QuerySet[TeacherAssignment]:
        return TeacherAssignment.objects.filter(
            teacher_id=teacher_id, session_id=session_id, is_active=True
        )

    def exists_for_combination(
        self,
        teacher_id: UUID,
        class_id: UUID,
        section_id: UUID,
        subject_id: UUID,
        session_id: UUID,
        exclude_id: UUID | None = None,
    ) -> bool:
        qs = TeacherAssignment.objects.filter(
            teacher_id=teacher_id,
            class_ref_id=class_id,
            section_id=section_id,
            subject_id=subject_id,
            session_id=session_id,
        )
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        return qs.exists()
