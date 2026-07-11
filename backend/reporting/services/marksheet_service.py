"""Marksheet service: generates detailed marksheets."""

from __future__ import annotations

from uuid import UUID
from decimal import Decimal

import structlog
from django.db.models import Sum

from shared.base_service import BaseService
from shared.types import MarksheetDTO
from results.models import MarksEntry, SubjectResult
from results.services.result_service import ResultService

logger = structlog.get_logger(__name__)


class MarksheetService(BaseService):
    """Generates marksheet data for classes and individual students."""

    def __init__(self) -> None:
        self._result_service = ResultService()

    def generate_student_marksheet(
        self,
        enrollment_id: UUID,
    ) -> MarksheetDTO:
        """Generate a detailed marksheet for a single student."""
        from enrollments.models import Enrollment

        enrollment = (
            Enrollment.objects.select_related(
                "student", "session", "class_field", "section"
            )
            .get(id=enrollment_id)
        )

        marks_entries = list(
            MarksEntry.objects.filter(enrollment=enrollment)
            .select_related("subject", "exam_component", "exam_component__exam")
            .order_by("subject__code", "exam_component__display_order")
        )

        subjects_map: dict[UUID, dict] = {}
        for entry in marks_entries:
            sub_id = entry.subject_id
            if sub_id not in subjects_map:
                subjects_map[sub_id] = {
                    "subject_id": str(sub_id),
                    "subject_name": entry.subject.name,
                    "subject_code": entry.subject.code,
                    "assessments": [],
                }
            subjects_map[sub_id]["assessments"].append({
                "assessment_type": entry.exam_component.name,
                "exam": entry.exam_component.exam.name if entry.exam_component.exam else "",
                "full_marks": entry.exam_component.full_marks,
                "obtained_marks": entry.obtained_marks,
            })

        results = list(
            SubjectResult.objects.filter(enrollment=enrollment)
            .select_related("subject")
        )

        total_marks = sum(r.total_obtained for r in results)
        total_full = sum(r.total_full for r in results)
        percentage = (
            Decimal(str(round((total_marks / total_full) * 100, 2)))
            if total_full > 0
            else Decimal("0")
        )

        from academics.services.grading_service import GradingService

        grading = GradingService()
        overall_grade, _ = grading.calculate_grade(float(percentage))

        subjects_list = list(subjects_map.values())
        cocurricular = [
            {
                "subject_name": entry.subject.name,
                "assessment_type": entry.exam_component.name,
                "obtained_marks": entry.obtained_marks,
                "full_marks": entry.exam_component.full_marks,
            }
            for entry in marks_entries
            if entry.subject.subject_category and entry.subject.subject_category.code == "cocurricular"
        ]

        marksheet = MarksheetDTO(
            student_name=enrollment.student.name,
            student_id=enrollment.student.student_id,
            roll_no=enrollment.roll_no,
            class_name=enrollment.class_field.name,
            section_name=enrollment.section.name,
            session_name=enrollment.session.name,
            subjects=subjects_list,
            cocurricular=cocurricular,
            total_marks=total_marks,
            total_full=total_full,
            percentage=percentage,
            overall_grade=overall_grade,
        )

        self.log.info(
            "marksheet.generated",
            enrollment_id=str(enrollment_id),
            percentage=percentage,
        )
        return marksheet

    def generate_class_marksheet(
        self,
        class_id: UUID,
        section_id: UUID,
        session_id: UUID,
    ) -> list[MarksheetDTO]:
        """Generate marksheets for all students in a class-section-session."""
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

        marksheets = []
        for enrollment in enrollments:
            marksheet = self.generate_student_marksheet(enrollment.id)
            marksheets.append(marksheet)

        self.log.info(
            "marksheets.class_generated",
            class_id=str(class_id),
            section_id=str(section_id),
            count=len(marksheets),
        )
        return marksheets
