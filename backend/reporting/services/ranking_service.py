"""Ranking service: computes student rankings within a class."""

from __future__ import annotations

from uuid import UUID
from decimal import Decimal

import structlog
from django.db.models import Sum

from shared.base_service import BaseService
from results.models import SubjectResult

logger = structlog.get_logger(__name__)


class RankingService(BaseService):
    """Computes class rankings based on total percentage."""

    def compute_class_rankings(
        self,
        class_id: UUID,
        section_id: UUID,
        session_id: UUID,
    ) -> list[dict]:
        """Rank students by total obtained marks percentage.

        Returns a list of dicts ordered by rank (descending percentage).
        """
        from enrollments.models import Enrollment

        enrollments = (
            Enrollment.objects.filter(
                class_field_id=class_id,
                section_id=section_id,
                session_id=session_id,
                status="active",
            )
            .select_related("student")
            .order_by("roll_no")
        )

        student_totals = []
        for enrollment in enrollments:
            agg = (
                SubjectResult.objects.filter(enrollment=enrollment)
                .aggregate(
                    total_obtained=Sum("total_obtained"),
                    total_full=Sum("total_full"),
                )
            )
            total_obtained = agg["total_obtained"] or 0
            total_full = agg["total_full"] or 0
            percentage = (
                round((total_obtained / total_full) * 100, 2)
                if total_full > 0
                else 0.0
            )

            student_totals.append({
                "enrollment_id": str(enrollment.id),
                "student_name": enrollment.student.name,
                "student_id": enrollment.student.student_id,
                "roll_no": enrollment.roll_no,
                "total_obtained": total_obtained,
                "total_full": total_full,
                "percentage": percentage,
            })

        student_totals.sort(key=lambda x: x["percentage"], reverse=True)

        rankings = []
        for rank_pos, student in enumerate(student_totals, start=1):
            student["rank"] = rank_pos
            rankings.append(student)

        self.log.info(
            "rankings.computed",
            class_id=str(class_id),
            section_id=str(section_id),
            count=len(rankings),
        )
        return rankings

    def get_student_rank(
        self,
        student_id: UUID,
        session_id: UUID,
    ) -> dict:
        """Get a specific student's rank, percentage, and grade within their current class."""
        from enrollments.models import Enrollment
        from academics.services.grading_service import GradingService

        enrollment = Enrollment.objects.filter(
            student_id=student_id,
            session_id=session_id,
            is_active=True,
        ).select_related("class_field", "section").first()

        if not enrollment:
            return {"percentage": None, "grade": None, "rank": None, "total_students": None}

        # Get rankings for this student's class/section
        rankings = self.compute_class_rankings(
            class_id=enrollment.class_field_id,
            section_id=enrollment.section_id,
            session_id=session_id,
        )

        # Find this student's ranking
        student_ranking = None
        for r in rankings:
            if r["enrollment_id"] == str(enrollment.id):
                student_ranking = r
                break

        if not student_ranking:
            return {"percentage": None, "grade": None, "rank": None, "total_students": len(rankings)}

        # Determine grade from percentage using GradingService
        grading_svc = GradingService()
        grade, _ = grading_svc.calculate_grade(student_ranking["percentage"])

        return {
            "percentage": student_ranking["percentage"],
            "grade": grade,
            "rank": student_ranking["rank"],
            "total_students": len(rankings),
        }
