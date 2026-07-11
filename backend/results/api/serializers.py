"""DRF serializers for results API."""

from rest_framework import serializers

from results.models import MarksEntry, SubjectResult, ResultPublication


class MarksEntrySerializer(serializers.ModelSerializer):
    """Serializer for MarksEntry model."""

    entered_by_email = serializers.CharField(
        source="entered_by.email", read_only=True, default=None
    )
    subject_name = serializers.CharField(
        source="subject.name", read_only=True
    )
    exam_component_name = serializers.CharField(
        source="exam_component.name", read_only=True, default=None
    )

    class Meta:
        model = MarksEntry
        fields = [
            "id",
            "enrollment",
            "subject",
            "subject_name",
            "exam_component",
            "exam_component_name",
            "obtained_marks",
            "is_absent",
            "is_grade_only",
            "remarks",
            "entered_by",
            "entered_by_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class MarksEntryCreateSerializer(serializers.Serializer):
    """Serializer for creating a marks entry."""

    enrollment_id = serializers.UUIDField()
    subject_id = serializers.UUIDField()
    exam_component_id = serializers.UUIDField()
    obtained_marks = serializers.DecimalField(max_digits=6, decimal_places=2)
    is_absent = serializers.BooleanField(default=False)
    is_grade_only = serializers.BooleanField(default=False)
    remarks = serializers.CharField(required=False, default="", allow_blank=True)


class MarksEntryUpdateSerializer(serializers.Serializer):
    """Serializer for updating obtained marks."""

    obtained_marks = serializers.DecimalField(max_digits=6, decimal_places=2)
    is_absent = serializers.BooleanField(required=False)
    is_grade_only = serializers.BooleanField(required=False)
    remarks = serializers.CharField(required=False, default="", allow_blank=True)


class BulkMarksEntrySerializer(serializers.Serializer):
    """Serializer for bulk marks entry."""

    enrollment_id = serializers.UUIDField()
    subject_id = serializers.UUIDField()
    exam_component_id = serializers.UUIDField()
    obtained_marks = serializers.DecimalField(max_digits=6, decimal_places=2)
    is_absent = serializers.BooleanField(default=False)
    is_grade_only = serializers.BooleanField(default=False)
    remarks = serializers.CharField(required=False, default="", allow_blank=True)


class BulkMarksPayloadSerializer(serializers.Serializer):
    """Wrapper for bulk marks payload."""

    entries = BulkMarksEntrySerializer(many=True)


class SubjectResultSerializer(serializers.ModelSerializer):
    """Serializer for SubjectResult model."""

    subject_name = serializers.CharField(source="subject.name", read_only=True)
    subject_code = serializers.CharField(source="subject.code", read_only=True)

    class Meta:
        model = SubjectResult
        fields = [
            "id",
            "enrollment",
            "subject",
            "subject_name",
            "subject_code",
            "total_obtained",
            "total_full",
            "percentage",
            "grade",
            "grade_point",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ResultPublicationSerializer(serializers.ModelSerializer):
    """Serializer for ResultPublication model."""

    class_name = serializers.CharField(source="class_field.name", read_only=True)
    section_name = serializers.CharField(source="section.name", read_only=True)
    published_by_email = serializers.CharField(
        source="published_by.email", read_only=True, default=None
    )

    class Meta:
        model = ResultPublication
        fields = [
            "id",
            "session",
            "class_field",
            "class_name",
            "section",
            "section_name",
            "status",
            "published_by",
            "published_by_email",
            "published_at",
            "remarks",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "published_by", "published_at", "created_at", "updated_at"]
