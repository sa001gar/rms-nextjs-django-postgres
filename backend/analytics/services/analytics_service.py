"""Analytics service: comprehensive analytics and reporting."""

from __future__ import annotations

from uuid import UUID
from decimal import Decimal

import structlog
from django.db.models import Sum, Count, Avg, Q, F
from django.db.models.functions import Round

from shared.base_service import BaseService
from results.models import SubjectResult, MarksEntry
from enrollments.models import Enrollment, Student
from academics.models import AcademicSession, Class, Subject, GradeScale

logger = structlog.get_logger(__name__)


class AnalyticsService(BaseService):
    """Provides comprehensive analytics across the system."""

    def get_pass_fail_ratio(self, session_id: UUID, class_id: UUID = None) -> dict:
        """Get pass/fail ratio for a session, optionally filtered by class."""
        from academics.models import GradeScale, GradeRule

        qs = SubjectResult.objects.filter(enrollment__session_id=session_id)
        if class_id:
            qs = qs.filter(enrollment__class_field_id=class_id)

        # Determine pass mark from grade scale
        pass_mark_pct = 33.0  # default
        scale = GradeScale.objects.filter(session_id=session_id, is_active=True).first()
        if scale:
            rule = scale.rules.order_by("display_order").first()
            if rule:
                pass_mark_pct = float(rule.min_percentage)

        total = qs.values("enrollment_id").distinct().count()
        # A student passes if all their subjects are above pass mark
        passed = 0
        failed = 0
        for enrollment in qs.values("enrollment_id").distinct():
            eid = enrollment["enrollment_id"]
            subjects = qs.filter(enrollment_id=eid)
            all_pass = all(
                float(s.percentage) >= pass_mark_pct for s in subjects
            )
            if all_pass:
                passed += 1
            else:
                failed += 1

        return {
            "total": total,
            "passed": passed,
            "failed": failed,
            "pass_percentage": round((passed / total * 100), 2) if total > 0 else 0,
            "fail_percentage": round((failed / total * 100), 2) if total > 0 else 0,
        }

    def get_subject_difficulty(self, session_id: UUID, class_id: UUID = None) -> list[dict]:
        """Get subjects ranked by average percentage (lower = harder)."""
        qs = SubjectResult.objects.filter(
            enrollment__session_id=session_id
        ).select_related("subject")
        if class_id:
            qs = qs.filter(enrollment__class_field_id=class_id)

        subject_stats = (
            qs.values("subject__name", "subject_id")
            .annotate(
                avg_percentage=Round(Avg("percentage"), 2),
                total_students=Count("enrollment_id", distinct=True),
                pass_count=Count(
                    "enrollment_id",
                    filter=Q(percentage__gte=33),
                    distinct=True,
                ),
            )
            .order_by("avg_percentage")
        )

        return [
            {
                "subject": s["subject__name"],
                "subject_id": str(s["subject_id"]),
                "avg_percentage": float(s["avg_percentage"] or 0),
                "total_students": s["total_students"],
                "pass_count": s["pass_count"],
                "pass_rate": round((s["pass_count"] / s["total_students"] * 100), 2) if s["total_students"] > 0 else 0,
            }
            for s in subject_stats
        ]

    def get_grade_distribution(self, session_id: UUID, class_id: UUID = None) -> dict:
        """Get distribution of grades across all students."""
        qs = SubjectResult.objects.filter(enrollment__session_id=session_id)
        if class_id:
            qs = qs.filter(enrollment__class_field_id=class_id)

        distribution = {}
        for result in qs:
            grade = result.grade or "N/A"
            distribution[grade] = distribution.get(grade, 0) + 1

        return distribution

    def get_top_performers(self, session_id: UUID, class_id: UUID = None, limit: int = 10) -> list[dict]:
        """Get top performing students."""
        qs = Enrollment.objects.filter(
            session_id=session_id,
            is_active=True,
        ).select_related("student", "class_field")
        if class_id:
            qs = qs.filter(class_field_id=class_id)

        student_totals = []
        for enrollment in qs:
            agg = SubjectResult.objects.filter(
                enrollment=enrollment
            ).aggregate(
                total_obtained=Sum("total_obtained"),
                total_full=Sum("total_full"),
            )
            total_obtained = agg["total_obtained"] or 0
            total_full = agg["total_full"] or 0
            percentage = float(total_obtained / total_full * 100) if total_full > 0 else 0

            student_totals.append({
                "student_name": enrollment.student.name,
                "student_id": enrollment.student.student_id,
                "class_name": enrollment.class_field.name,
                "percentage": round(percentage, 2),
                "total_obtained": float(total_obtained),
                "total_full": float(total_full),
            })

        student_totals.sort(key=lambda x: x["percentage"], reverse=True)
        return student_totals[:limit]

    def get_bottom_performers(self, session_id: UUID, class_id: UUID = None, limit: int = 10) -> list[dict]:
        """Get bottom performing students."""
        all_students = self.get_top_performers(session_id, class_id, limit=9999)
        return all_students[-limit:] if len(all_students) >= limit else all_students

    def get_session_comparison(self, session_ids: list[UUID]) -> list[dict]:
        """Compare metrics across multiple sessions."""
        results = []
        for sid in session_ids:
            session = AcademicSession.objects.filter(id=sid).first()
            if not session:
                continue

            pass_fail = self.get_pass_fail_ratio(sid)
            total_students = Enrollment.objects.filter(
                session_id=sid, is_active=True
            ).values("student_id").distinct().count()

            results.append({
                "session_name": session.name,
                "session_id": str(sid),
                "total_students": total_students,
                **pass_fail,
            })

        return results

    def get_class_performance(self, session_id: UUID) -> list[dict]:
        """Get performance summary for each class in a session."""
        classes = Class.objects.filter(is_active=True)
        results = []

        for cls in classes:
            enrollments = Enrollment.objects.filter(
                session_id=session_id,
                class_field=cls,
                is_active=True,
            )
            student_count = enrollments.count()

            if student_count == 0:
                continue

            total_percentage = 0
            for enrollment in enrollments:
                agg = SubjectResult.objects.filter(
                    enrollment=enrollment
                ).aggregate(
                    total_obtained=Sum("total_obtained"),
                    total_full=Sum("total_full"),
                )
                t_obtained = agg["total_obtained"] or 0
                t_full = agg["total_full"] or 0
                pct = float(t_obtained / t_full * 100) if t_full > 0 else 0
                total_percentage += pct

            results.append({
                "class_name": cls.name,
                "class_id": str(cls.id),
                "student_count": student_count,
                "avg_percentage": round(total_percentage / student_count, 2),
            })

        return results
