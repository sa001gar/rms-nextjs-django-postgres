"""Service for grade rule operations."""

from __future__ import annotations

from uuid import UUID
from decimal import Decimal

from django.db.models import QuerySet

from academics.models import GradeRule, GradeScale
from shared.base_service import BaseService
from shared.exceptions import ConflictException, NotFoundException


class GradingService(BaseService):
    """Business logic for grade rule management."""

    def calculate_grade(self, percentage: float) -> tuple[str, float]:
        """Calculate grade label and grade point from percentage."""
        rules = GradeRule.objects.filter(grade_scale__is_active=True).order_by("-min_percentage")
        for rule in rules:
            if rule.min_percentage <= Decimal(str(percentage)) <= rule.max_percentage:
                self.log.info(
                    "grade.calculated",
                    percentage=percentage,
                    label=rule.label,
                )
                return rule.label, float(rule.grade_point)
        self.log.warning("grade.not_found", percentage=percentage)
        return "N/A", 0.0

    def get_all_rules(self) -> QuerySet[GradeRule]:
        return GradeRule.objects.filter(grade_scale__is_active=True).order_by("display_order")

    def upsert_rule(
        self,
        label: str,
        min_percentage: float,
        max_percentage: float,
        grade_point: float,
        display_order: int,
        scale_id: UUID | None = None,
    ) -> GradeRule:
        scale = GradeScale.objects.filter(is_active=True).first()
        if not scale:
            raise NotFoundException("No active grade scale found")
        existing = GradeRule.objects.filter(label=label, grade_scale=scale).first()
        if existing:
            existing.min_percentage = min_percentage
            existing.max_percentage = max_percentage
            existing.grade_point = grade_point
            existing.display_order = display_order
            existing.save()
            self.log.info("grade_rule.update", label=label)
            return existing
        self.log.info("grade_rule.create", label=label)
        return GradeRule.objects.create(
            grade_scale=scale,
            label=label,
            min_percentage=min_percentage,
            max_percentage=max_percentage,
            grade_point=grade_point,
            display_order=display_order,
        )
