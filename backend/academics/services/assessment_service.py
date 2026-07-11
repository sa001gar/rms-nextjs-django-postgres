"""Service for AssessmentType and AssessmentWeightage operations."""

from __future__ import annotations

from uuid import UUID

from django.db.models import QuerySet

from academics.models import AssessmentType, AssessmentWeightage
from academics.repositories.assessment_repository import AssessmentRepository
from shared.base_service import BaseService
from shared.exceptions import ConflictException, NotFoundException


class AssessmentService(BaseService):
    """Business logic for assessment type and weightage management."""

    def __init__(self) -> None:
        self.repo = AssessmentRepository()

    def create_assessment_type(
        self,
        name: str,
        code: str,
        category: str = "summative",
        display_order: int = 0,
    ) -> AssessmentType:
        existing = self.repo.get_by_code(code)
        if existing:
            raise ConflictException(
                f"Assessment type with code '{code}' already exists."
            )
        self.log.info("assessment_type.create", code=code)
        return self.repo.create(
            name=name, code=code, category=category, display_order=display_order
        )

    def update(self, assessment_type_id: UUID, **kwargs) -> AssessmentType:
        assessment_type = self.repo.get_by_id_or_raise(
            assessment_type_id, "Assessment type not found."
        )
        if "code" in kwargs and kwargs["code"] != assessment_type.code:
            existing = self.repo.get_by_code(kwargs["code"])
            if existing:
                raise ConflictException(
                    f"Assessment type with code '{kwargs['code']}' already exists."
                )
        self.log.info("assessment_type.update", id=str(assessment_type_id))
        return self.repo.update(assessment_type_id, **kwargs)

    def delete(self, assessment_type_id: UUID) -> bool:
        self.repo.get_by_id_or_raise(assessment_type_id, "Assessment type not found.")
        self.log.info("assessment_type.delete", id=str(assessment_type_id))
        return self.repo.delete(assessment_type_id)

    def list_active(self) -> QuerySet[AssessmentType]:
        return AssessmentType.objects.filter(is_active=True).order_by("display_order")

    def set_weightage(
        self,
        class_id: UUID,
        subject_id: UUID,
        assessment_type_id: UUID,
        full_marks: int,
        weightage_pct: float,
    ) -> AssessmentWeightage:
        existing = AssessmentWeightage.objects.filter(
            class_ref_id=class_id,
            subject_id=subject_id,
            assessment_type_id=assessment_type_id,
        ).first()
        if existing:
            existing.full_marks = full_marks
            existing.weightage_pct = weightage_pct
            existing.save()
            self.log.info(
                "weightage.update",
                class_id=str(class_id),
                subject_id=str(subject_id),
            )
            return existing
        self.log.info(
            "weightage.create",
            class_id=str(class_id),
            subject_id=str(subject_id),
        )
        return AssessmentWeightage.objects.create(
            class_ref_id=class_id,
            subject_id=subject_id,
            assessment_type_id=assessment_type_id,
            full_marks=full_marks,
            weightage_pct=weightage_pct,
        )

    def get_assessment_structure(
        self, class_id: UUID, subject_id: UUID
    ) -> QuerySet[AssessmentWeightage]:
        return AssessmentWeightage.objects.filter(
            class_ref_id=class_id, subject_id=subject_id
        ).select_related("assessment_type")
