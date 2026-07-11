"""API views for attendance module."""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction

from core.permissions import IsAdminOrTeacher
from attendance.models import TermAttendance
from attendance.api.serializers import (
    TermAttendanceSerializer,
    BulkTermAttendancePayloadSerializer,
)

class TermAttendanceViewSet(viewsets.ModelViewSet):
    queryset = TermAttendance.objects.select_related("enrollment__student", "term").all()
    serializer_class = TermAttendanceSerializer
    permission_classes = [IsAdminOrTeacher]

    def get_queryset(self):
        qs = super().get_queryset()
        session_id = self.request.query_params.get("session_id")
        class_id = self.request.query_params.get("class_id")
        section_id = self.request.query_params.get("section_id")
        term_id = self.request.query_params.get("term_id")

        if session_id:
            qs = qs.filter(enrollment__session_id=session_id)
        if class_id:
            qs = qs.filter(enrollment__class_field_id=class_id)
        if section_id:
            qs = qs.filter(enrollment__section_id=section_id)
        if term_id:
            qs = qs.filter(term_id=term_id)

        return qs

    @action(detail=False, methods=["post"], url_path="bulk-upsert")
    def bulk_upsert(self, request):
        serializer = BulkTermAttendancePayloadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entries = serializer.validated_data["entries"]

        results = []
        with transaction.atomic():
            for entry in entries:
                obj, created = TermAttendance.objects.update_or_create(
                    enrollment_id=entry["enrollment_id"],
                    term_id=entry["term_id"],
                    defaults={
                        "present_days": entry["present_days"],
                        "total_days": entry["total_days"],
                    }
                )
                results.append(obj)
        
        return Response(
            TermAttendanceSerializer(results, many=True).data,
            status=status.HTTP_201_CREATED
        )
