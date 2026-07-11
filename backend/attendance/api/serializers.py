"""API serializers for attendance module."""

from rest_framework import serializers
from attendance.models import TermAttendance

class TermAttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="enrollment.student.name", read_only=True)
    roll_no = serializers.CharField(source="enrollment.roll_no", read_only=True)
    term_name = serializers.CharField(source="term.name", read_only=True)

    class Meta:
        model = TermAttendance
        fields = [
            "id",
            "enrollment",
            "student_name",
            "roll_no",
            "term",
            "term_name",
            "present_days",
            "total_days",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

class TermAttendanceBulkUpsertSerializer(serializers.Serializer):
    enrollment_id = serializers.UUIDField()
    term_id = serializers.UUIDField()
    present_days = serializers.IntegerField(min_value=0)
    total_days = serializers.IntegerField(min_value=0)

class BulkTermAttendancePayloadSerializer(serializers.Serializer):
    entries = TermAttendanceBulkUpsertSerializer(many=True)
