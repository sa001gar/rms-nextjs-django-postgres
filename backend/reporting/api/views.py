"""DRF views for reporting API — marksheets and rankings (legacy)."""

from uuid import UUID

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import IsAdminOrTeacher
from reporting.services.marksheet_service import MarksheetService
from reporting.services.ranking_service import RankingService
from reporting.api.serializers import (
    MarksheetDTOSerializer,
    RankingEntrySerializer,
)


class MarksheetViewSet(viewsets.ViewSet):
    """ViewSet for marksheet generation."""

    permission_classes = [IsAdminOrTeacher]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._service = MarksheetService()

    @action(detail=False, methods=["get"], url_path="student/(?P<enrollment_id>[^/.]+)")
    def student_marksheet(self, request, enrollment_id=None):
        """Generate marksheet for a single student."""
        marksheet = self._service.generate_student_marksheet(UUID(enrollment_id))
        return Response(MarksheetDTOSerializer(marksheet).data)

    @action(detail=False, methods=["get"], url_path="class")
    def class_marksheet(self, request):
        """Generate marksheets for an entire class-section-session."""
        class_id = request.query_params.get("class_id")
        section_id = request.query_params.get("section_id")
        session_id = request.query_params.get("session_id")

        if not all([class_id, section_id, session_id]):
            return Response(
                {"detail": "class_id, section_id and session_id query params are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        marksheets = self._service.generate_class_marksheet(
            UUID(class_id), UUID(section_id), UUID(session_id)
        )
        return Response(
            MarksheetDTOSerializer(marksheets, many=True).data
        )


class RankingViewSet(viewsets.ViewSet):
    """ViewSet for class ranking computation."""

    permission_classes = [IsAdminOrTeacher]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._service = RankingService()

    @action(detail=False, methods=["get"], url_path="class")
    def class_rankings(self, request):
        """Compute rankings for a class-section-session."""
        class_id = request.query_params.get("class_id")
        section_id = request.query_params.get("section_id")
        session_id = request.query_params.get("session_id")

        if not all([class_id, section_id, session_id]):
            return Response(
                {"detail": "class_id, section_id and session_id query params are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rankings = self._service.compute_class_rankings(
            UUID(class_id), UUID(section_id), UUID(session_id)
        )
        return Response(
            RankingEntrySerializer(rankings, many=True).data
        )
