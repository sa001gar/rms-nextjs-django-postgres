"""Service for Subject and ClassSubject operations."""

from __future__ import annotations

from uuid import UUID

from django.db.models import QuerySet

from academics.models import Subject, ClassSubject
from academics.repositories.subject_repository import SubjectRepository
from shared.base_service import BaseService
from shared.exceptions import ConflictException, NotFoundException


class SubjectService(BaseService):
    """Business logic for subject management."""

    def __init__(self) -> None:
        self.repo = SubjectRepository()

    def create(
        self,
        name: str,
        code: str,
        subject_type: str = "core",
        default_full_marks: int = 100,
    ) -> Subject:
        existing = self.repo.get_by_code(code)
        if existing:
            raise ConflictException(f"Subject with code '{code}' already exists.")
        self.log.info("subject.create", code=code)
        return self.repo.create(
            name=name,
            code=code,
            subject_type=subject_type,
            default_full_marks=default_full_marks,
        )

    def update(self, subject_id: UUID, **kwargs) -> Subject:
        subject = self.repo.get_by_id_or_raise(subject_id, "Subject not found.")
        if "code" in kwargs and kwargs["code"] != subject.code:
            existing = self.repo.get_by_code(kwargs["code"])
            if existing:
                raise ConflictException(
                    f"Subject with code '{kwargs['code']}' already exists."
                )
        self.log.info("subject.update", subject_id=str(subject_id))
        return self.repo.update(subject_id, **kwargs)

    def delete(self, subject_id: UUID) -> bool:
        self.repo.get_by_id_or_raise(subject_id, "Subject not found.")
        self.log.info("subject.delete", subject_id=str(subject_id))
        return self.repo.delete(subject_id)

    def list_all(self) -> QuerySet[Subject]:
        return self.repo.list_all()

    def get_by_id(self, subject_id: UUID) -> Subject | None:
        return self.repo.get_by_id(subject_id)

    def assign_to_class(
        self,
        class_id: UUID,
        subject_id: UUID,
        is_required: bool = True,
        full_marks: int = 100,
    ) -> ClassSubject:
        existing = ClassSubject.objects.filter(
            class_ref_id=class_id, subject_id=subject_id
        ).first()
        if existing:
            raise ConflictException(
                "Subject is already assigned to this class."
            )
        self.log.info(
            "class_subject.assign", class_id=str(class_id), subject_id=str(subject_id)
        )
        return ClassSubject.objects.create(
            class_ref_id=class_id,
            subject_id=subject_id,
            is_required=is_required,
            full_marks=full_marks,
        )

    def list_class_subjects(self, class_id: UUID) -> QuerySet[ClassSubject]:
        return ClassSubject.objects.filter(class_ref_id=class_id).select_related("subject")

    def list_by_type(self, subject_type: str) -> QuerySet[Subject]:
        return self.repo.list_by_type(subject_type)
