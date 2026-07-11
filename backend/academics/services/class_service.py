"""Service for Class and Section operations."""

from __future__ import annotations

from uuid import UUID

from django.db.models import QuerySet

from academics.models import Class, Section
from academics.repositories.class_repository import ClassRepository
from shared.base_service import BaseService
from shared.exceptions import ConflictException, NotFoundException


class ClassService(BaseService):
    """Business logic for class and section management."""

    def __init__(self) -> None:
        self.repo = ClassRepository()

    def create(self, name: str, level: int) -> Class:
        existing = self.repo.get_by_name(name)
        if existing:
            raise ConflictException(f"Class '{name}' already exists.")
        self.log.info("class.create", name=name)
        return self.repo.create(name=name, level=level)

    def update(self, class_id: UUID, **kwargs) -> Class:
        class_obj = self.repo.get_by_id_or_raise(class_id, "Class not found.")
        if "name" in kwargs and kwargs["name"] != class_obj.name:
            existing = self.repo.get_by_name(kwargs["name"])
            if existing:
                raise ConflictException(f"Class '{kwargs['name']}' already exists.")
        self.log.info("class.update", class_id=str(class_id))
        updated_class = self.repo.update(class_id, **kwargs)
        if updated_class is None:
            raise NotFoundException("Class not found.")
        return updated_class

    def delete(self, class_id: UUID) -> bool:
        self.repo.get_by_id_or_raise(class_id, "Class not found.")
        self.log.info("class.delete", class_id=str(class_id))
        return self.repo.delete(class_id)

    def list_all(self) -> QuerySet[Class]:
        return self.repo.list_all()

    def get_by_id(self, class_id: UUID) -> Class | None:
        return self.repo.get_by_id(class_id)

    def create_section(self, class_id: UUID, name: str) -> Section:
        self.repo.get_by_id_or_raise(class_id, "Class not found.")
        existing = Section.objects.filter(class_ref_id=class_id, name=name).first()
        if existing:
            raise ConflictException(
                f"Section '{name}' already exists in this class."
            )
        self.log.info("section.create", class_id=str(class_id), name=name)
        return Section.objects.create(class_ref_id=class_id, name=name)

    def list_sections(self, class_id: UUID) -> QuerySet[Section]:
        self.repo.get_by_id_or_raise(class_id, "Class not found.")
        return Section.objects.filter(class_ref_id=class_id).order_by("name")
