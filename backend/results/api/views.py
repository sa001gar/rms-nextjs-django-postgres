"""DRF views for results API."""

from uuid import UUID

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import IsAdminOrTeacher
from results.models import MarksEntry, SubjectResult
from results.api.serializers import (
    MarksEntrySerializer,
    MarksEntryCreateSerializer,
    MarksEntryUpdateSerializer,
    BulkMarksPayloadSerializer,
    SubjectResultSerializer,
)
from results.services.marks_entry_service import MarksEntryService
from results.services.result_service import ResultService
from results.selectors.marks_entry_selector import MarksEntrySelector
from results.selectors.result_selector import ResultSelector


class MarksEntryViewSet(viewsets.ModelViewSet):
    """ViewSet for MarksEntry CRUD operations."""

    queryset = MarksEntry.objects.select_related(
        "subject", "exam_component", "entered_by"
    ).all()
    serializer_class = MarksEntrySerializer
    permission_classes = [IsAdminOrTeacher]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._service = MarksEntryService()
        self._selector = MarksEntrySelector()

    def create(self, request, *args, **kwargs):
        serializer = MarksEntryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        authorized, error = self._service.authorize_entry(
            user_id=request.user.id,
            enrollment_id=data["enrollment_id"],
            subject_id=data["subject_id"],
        )
        if not authorized:
            return Response(
                {"detail": error}, status=status.HTTP_403_FORBIDDEN
            )

        entry = self._service.enter_marks(
            enrollment_id=data["enrollment_id"],
            subject_id=data["subject_id"],
            exam_component_id=data["exam_component_id"],
            obtained_marks=data["obtained_marks"],
            is_absent=data.get("is_absent", False),
            is_grade_only=data.get("is_grade_only", False),
            entered_by_id=request.user.id,
        )
        return Response(
            MarksEntrySerializer(entry).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        entry = self.get_object()
        serializer = MarksEntryUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        update_kwargs = {"obtained_marks": data["obtained_marks"]}
        if "is_absent" in data:
            update_kwargs["is_absent"] = data["is_absent"]
        if "is_grade_only" in data:
            update_kwargs["is_grade_only"] = data["is_grade_only"]
        updated = self._service.update_marks(
            entry_id=entry.id,
            **update_kwargs,
        )
        return Response(MarksEntrySerializer(updated).data)

    @action(detail=False, methods=["post"], url_path="bulk-upsert")
    def bulk_upsert(self, request):
        """Bulk create or update marks entries."""
        serializer = BulkMarksPayloadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        entries = self._service.bulk_upsert(
            entries=serializer.validated_data["entries"],
            entered_by_id=request.user.id,
        )
        return Response(
            MarksEntrySerializer(entries, many=True).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="by-enrollment/(?P<enrollment_id>[^/.]+)")
    def by_enrollment(self, request, enrollment_id=None):
        """List marks entries for a specific enrollment."""
        qs = self._selector.list_for_enrollment(UUID(enrollment_id))
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(MarksEntrySerializer(page, many=True).data)
        return Response(MarksEntrySerializer(qs, many=True).data)


class SubjectResultViewSet(viewsets.ModelViewSet):
    """ViewSet for SubjectResult (read-only; computed by ResultService)."""

    queryset = SubjectResult.objects.select_related("subject").all()
    serializer_class = SubjectResultSerializer
    permission_classes = [IsAdminOrTeacher]
    http_method_names = ["get"]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._result_service = ResultService()
        self._selector = ResultSelector()

    @action(detail=False, methods=["get"], url_path="by-enrollment/(?P<enrollment_id>[^/.]+)")
    def by_enrollment(self, request, enrollment_id=None):
        """Get all subject results for an enrollment."""
        qs = self._selector.get_student_results(UUID(enrollment_id))
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(SubjectResultSerializer(page, many=True).data)
        return Response(SubjectResultSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="by-class/(?P<class_id>[^/.]+)")
    def by_class(self, request, class_id=None):
        """Get all subject results for a class (by enrollment IDs)."""
        section_id = request.query_params.get("section_id")
        session_id = request.query_params.get("session_id")
        if not section_id or not session_id:
            return Response(
                {"detail": "section_id and session_id query params are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from enrollments.models import Enrollment

        enrollment_ids = list(
            Enrollment.objects.filter(
                class_field_id=class_id,
                section_id=section_id,
                session_id=session_id,
                status="active",
            ).values_list("id", flat=True)
        )
        qs = self._selector.get_class_results(enrollment_ids)
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(SubjectResultSerializer(page, many=True).data)
        return Response(SubjectResultSerializer(qs, many=True).data)

    @action(detail=False, methods=["post"], url_path="compute/(?P<enrollment_id>[^/.]+)")
    def compute(self, request, enrollment_id=None):
        """Trigger result computation for an enrollment."""
        results = self._result_service.compute_all_results(UUID(enrollment_id))
        return Response(
            SubjectResultSerializer(results, many=True).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="refresh-session/(?P<session_id>[^/.]+)")
    def refresh_session(self, request, session_id=None):
        """Recompute all results for a session."""
        count = self._result_service.refresh_all_results(UUID(session_id))
        return Response({"refreshed_enrollments": count})
