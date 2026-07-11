"""Student service: business logic for Student CRUD and search."""

from __future__ import annotations

from uuid import UUID
from typing import Any

import structlog
from django.contrib.auth import get_user_model
from django.db import transaction

from shared.base_service import BaseService
from core.models_audit import AuditLog
from enrollments.models import Student
from enrollments.repositories.student_repository import StudentRepository

User = get_user_model()
logger = structlog.get_logger(__name__)


class StudentService(BaseService):
    """Handles Student creation, update, retrieval, and search."""

    def __init__(self) -> None:
        self.repo = StudentRepository()

    @transaction.atomic
    def create(self, **kwargs) -> Student:
        email = kwargs.pop("email", "")
        password = kwargs.pop("password", "")
        name = kwargs.get("name", "")

        class_id = kwargs.pop("class_id", None)
        session_id = kwargs.pop("session_id", None)
        section_id = kwargs.pop("section_id", None)
        roll_no = kwargs.pop("roll_no", "")

        student_id = Student.generate_student_id()
        self.log.info("creating_student", student_id=student_id)

        # Create User account for student
        user = User.objects.create_user(
            email=email or f"{student_id.lower()}@student.local",
            password=password or "temp1234",
            role="student",
            first_name=name.split()[0] if name else "",
            last_name=" ".join(name.split()[1:]) if name and len(name.split()) > 1 else "",
        )

        if class_id:
            kwargs["admission_class_id"] = class_id
        if session_id:
            kwargs["admission_session_id"] = session_id

        student = self.repo.create(user=user, student_id=student_id, **kwargs)

        # Set default password from DOB if not provided
        if not password:
            student.set_default_password()

        if class_id and session_id and section_id:
            from enrollments.models import Enrollment
            Enrollment.objects.create(
                student=student,
                session_id=session_id,
                class_field_id=class_id,
                section_id=section_id,
                roll_no=roll_no,
                status="active",
            )

        AuditLog.log(
            action="student_created",
            user=user,
            entity_type="Student",
            entity_id=str(student.id),
            details={"student_id": student_id, "email": user.email},
        )
        return student

    @transaction.atomic
    def update(self, student_id: UUID, **kwargs) -> Student | None:
        self.log.info("updating_student", student_id=student_id)
        student = self.repo.get_by_id(student_id)
        if not student:
            return None
        # Update user email if changed
        user_profile: Any = student.user
        if "email" in kwargs and user_profile:
            user_profile.email = kwargs.pop("email")
            user_profile.save(update_fields=["email"])
        updated_student = self.repo.update(student_id, **kwargs)
        if updated_student:
            AuditLog.log(
                action="student_updated",
                user=student.user,
                entity_type="Student",
                entity_id=str(student_id),
                details={k: str(v) for k, v in kwargs.items()},
            )
        return updated_student

    def get_by_id(self, student_id: UUID) -> Student | None:
        return self.repo.get_by_id(student_id)

    def list_all(self):
        return self.repo.list_all()

    def search_by_name(self, query: str):
        return self.repo.search_by_name(query)

    def generate_student_id(self) -> str:
        return Student.generate_student_id()

    @transaction.atomic
    def bulk_create(self, students_data: list[dict]) -> list[Student]:
        created = []
        for data in students_data:
            student = self.create(**data)
            created.append(student)
        return created
