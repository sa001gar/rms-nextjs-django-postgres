"""Marks Entry Grid API — full spreadsheet-style marks entry."""

from uuid import UUID
from collections import defaultdict

from django.db import transaction
from django.db.models import Prefetch
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdminOrTeacher
from academics.models import (
    AssessmentComponentConfig,
    ClassSubject,
    ExamComponent,
    Subject,
)
from enrollments.models import Enrollment
from results.models import MarksEntry


class MarksEntryGridView(APIView):
    """Full marks entry grid for a class — all students × all subjects × all components."""

    permission_classes = [IsAuthenticated, IsAdminOrTeacher]

    def get(self, request, session_id, class_id):
        section_id = request.query_params.get("section_id")

        # 1. Students (enrolled in this class)
        enroll_qs = Enrollment.objects.filter(
            session_id=session_id,
            class_field_id=class_id,
            status="active",
        ).select_related("student").order_by("roll_no")

        if section_id:
            enroll_qs = enroll_qs.filter(section_id=section_id)

        enrollments = list(enroll_qs)
        enrollment_ids = [e.id for e in enrollments]

        # 2. Subjects assigned to this class
        subjects = list(
            ClassSubject.objects.filter(class_ref_id=class_id)
            .select_related("subject")
            .order_by("display_order")
        )

        # 3. Assessment components for this class's configs
        configs = AssessmentComponentConfig.objects.filter(
            class_ref_id=class_id, session_id=session_id, is_applicable=True
        ).select_related("assessment_component").order_by("display_order")

        component_ids = set(c.assessment_component_id for c in configs)
        components = list(
            ExamComponent.objects.filter(id__in=component_ids)
            .select_related("exam__term")
            .order_by("exam__display_order", "display_order")
        )

        # 4. Existing marks entries
        marks = MarksEntry.objects.filter(
            enrollment_id__in=enrollment_ids,
            subject_id__in=[cs.subject_id for cs in subjects],
        )
        marks_by_key: dict[tuple[UUID, UUID, UUID], MarksEntry] = {}
        for m in marks:
            marks_by_key[(m.enrollment_id, m.subject_id, m.exam_component_id)] = m

        # Build response
        students_data = [
            {
                "id": str(e.id),
                "enrollment_id": str(e.id),
                "student_id": e.student.student_id,
                "name": e.student.name,
                "roll_no": e.roll_no,
                "section_id": str(e.section_id),
            }
            for e in enrollments
        ]

        subjects_data = [
            {
                "id": str(cs.subject_id),
                "name": cs.subject.name,
                "code": cs.subject.code,
            }
            for cs in subjects
        ]

        components_data = [
            {
                "id": str(c.id),
                "name": c.name,
                "exam_name": c.exam.name,
                "term_name": c.exam.term.name if c.exam.term else None,
                "value_type": c.value_type,
                "default_full_marks": float(c.full_marks) if c.full_marks else None,
                "display_order": c.display_order,
            }
            for c in components
        ]

        # Build config lookup: (component_id, subject_id) → full_marks
        config_lookup: dict[tuple[UUID, UUID], float] = {}
        for cfg in configs:
            config_lookup[(cfg.assessment_component_id, cfg.subject_id)] = (
                float(cfg.full_marks) if cfg.full_marks else 0
            )

        entries_data = []
        for m in marks:
            entries_data.append({
                "enrollment_id": str(m.enrollment_id),
                "subject_id": str(m.subject_id),
                "component_id": str(m.exam_component_id),
                "marks_value": float(m.marks_value) if m.marks_value else None,
                "grade_value": m.grade_value,
                "descriptive_value": m.descriptive_value,
                "is_absent": m.is_absent,
                "remarks": m.remarks,
            })

        return Response({
            "students": students_data,
            "subjects": subjects_data,
            "components": components_data,
            "config_lookup": {
                f"{comp_id}:{subj_id}": marks
                for (comp_id, subj_id), marks in config_lookup.items()
            },
            "entries": entries_data,
        })

    def post(self, request, session_id, class_id):
        """Bulk save marks entries (create or update)."""
        entries = request.data.get("entries", [])
        if not entries:
            return Response(
                {"detail": "No entries provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        errors = []
        saved = 0

        with transaction.atomic():
            for i, entry in enumerate(entries):
                enrollment_id = entry.get("enrollment_id")
                subject_id = entry.get("subject_id")
                component_id = entry.get("component_id")

                if not all([enrollment_id, subject_id, component_id]):
                    errors.append({
                        "index": i,
                        "error": "enrollment_id, subject_id, component_id required",
                    })
                    continue

                try:
                    MarksEntry.objects.update_or_create(
                        enrollment_id=enrollment_id,
                        subject_id=subject_id,
                        exam_component_id=component_id,
                        defaults={
                            "marks_value": entry.get("marks_value"),
                            "grade_value": entry.get("grade_value"),
                            "descriptive_value": entry.get("descriptive_value"),
                            "is_absent": entry.get("is_absent", False),
                            "remarks": entry.get("remarks", ""),
                            "entered_by": request.user if request.user.is_authenticated else None,
                        },
                    )
                    saved += 1
                except Exception as e:
                    errors.append({"index": i, "error": str(e)})

        return Response({
            "saved": saved,
            "errors": errors,
        }, status=status.HTTP_207_MULTI_STATUS if errors else status.HTTP_200_OK)


class MarksEntryCellView(APIView):
    """Single cell update for auto-save."""

    permission_classes = [IsAuthenticated, IsAdminOrTeacher]

    def patch(self, request, session_id, class_id):
        data = request.data
        enrollment_id = data.get("enrollment_id")
        subject_id = data.get("subject_id")
        component_id = data.get("component_id")

        if not all([enrollment_id, subject_id, component_id]):
            return Response(
                {"detail": "enrollment_id, subject_id, component_id required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        MarksEntry.objects.update_or_create(
            enrollment_id=enrollment_id,
            subject_id=subject_id,
            exam_component_id=component_id,
            defaults={
                "marks_value": data.get("marks_value"),
                "grade_value": data.get("grade_value"),
                "descriptive_value": data.get("descriptive_value"),
                "is_absent": data.get("is_absent", False),
                "remarks": data.get("remarks", ""),
                "entered_by": request.user if request.user.is_authenticated else None,
            },
        )

        return Response({"success": True})
