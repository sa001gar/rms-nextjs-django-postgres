"""API views for the dynamic report card system."""

from datetime import date
from decimal import Decimal
from uuid import UUID

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import IsAdminOrTeacher
from enrollments.models import Enrollment
from reporting.services.computation_service import ReportCardComputationService


class ReportCardViewSet(viewsets.ViewSet):
    """Template-driven, dynamically computed report card endpoint."""

    permission_classes = [IsAdminOrTeacher]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._service = ReportCardComputationService()

    @action(detail=False, methods=["get"], url_path="student/(?P<enrollment_id>[^/.]+)")
    def student_report_card(self, request, enrollment_id=None):
        template_id = request.query_params.get("template_id")

        data = self._service.generate(
            enrollment_id=UUID(enrollment_id),
            template_id=UUID(template_id) if template_id else None,
        )

        return Response(self._serialize(data))

    @action(detail=False, methods=["get"], url_path="by-user/(?P<user_id>[^/.]+)")
    def by_user(self, request, user_id=None):
        """Resolve the student's user ID to an enrollment and generate report."""
        template_id = request.query_params.get("template_id")
        session_id = request.query_params.get("session_id")

        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(id=user_id, role="student").first()
        if not user:
            return Response(
                {"detail": "Student user not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        enrollment_qs = Enrollment.objects.filter(
            student__user=user,
            status="active",
        )
        if session_id:
            enrollment_qs = enrollment_qs.filter(session_id=session_id)

        enrollment = enrollment_qs.select_related(
            "student", "session", "class_field", "section"
        ).first()

        if not enrollment:
            return Response(
                {"detail": "No active enrollment found for this student."},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = self._service.generate(
            enrollment_id=enrollment.id,
            template_id=UUID(template_id) if template_id else None,
        )

        return Response(self._serialize(data))

    @action(detail=False, methods=["get"], url_path="class")
    def class_report_cards(self, request):
        class_id = request.query_params.get("class_id")
        section_id = request.query_params.get("section_id")
        session_id = request.query_params.get("session_id")

        if not all([class_id, section_id, session_id]):
            return Response(
                {"detail": "class_id, section_id and session_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        results = self._service.generate_for_class(
            UUID(class_id), UUID(section_id), UUID(session_id)
        )

        return Response([self._serialize(r) for r in results])

    def _serialize(self, data) -> dict:
        """Convert ReportCardData dataclass to a plain dict for JSON response."""

        def _d(obj):
            if obj is None:
                return None
            if hasattr(obj, "__dataclass_fields__"):
                return {f: _d(getattr(obj, f)) for f in obj.__dataclass_fields__}
            if isinstance(obj, list):
                return [_d(i) for i in obj]
            if isinstance(obj, Decimal):
                return float(obj)
            if isinstance(obj, UUID):
                return str(obj)
            if isinstance(obj, date):
                return obj.isoformat()
            return obj

        return _d(data)
