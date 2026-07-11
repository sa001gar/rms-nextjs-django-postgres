"""Selectors for Subject queries."""

from __future__ import annotations

from uuid import UUID

from django.db.models import QuerySet

from academics.models import Subject, ClassSubject
from shared.base_selector import BaseSelector


class SubjectSelector(BaseSelector):
    """Read-only queries for subjects."""

    def list_by_category(self, category_code: str) -> QuerySet[Subject]:
        return Subject.objects.filter(
            subject_category__code=category_code
        ).order_by("code")

    def list_class_subjects(self, class_id: UUID) -> QuerySet[ClassSubject]:
        return ClassSubject.objects.filter(class_id=class_id).select_related(
            "subject"
        )
