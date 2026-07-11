"""API serializers for academics module."""

from rest_framework import serializers

from academics.models import (
    AcademicSession,
    Class,
    Section,
    Subject,
    ClassSubject,
    Term,
    AssessmentType,
    AssessmentWeightage,
    GradePolicy,
    TeacherAssignment,
)


# ──────────────────────────────────────────────
# AcademicSession
# ──────────────────────────────────────────────
class AcademicSessionInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    start_date = serializers.DateField()
    end_date = serializers.DateField()


class AcademicSessionOutputSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    is_active = serializers.BooleanField()
    is_locked = serializers.BooleanField()
    created_at = serializers.DateTimeField(read_only=True)


# ──────────────────────────────────────────────
# Class & Section
# ──────────────────────────────────────────────
class ClassInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    level = serializers.IntegerField(min_value=1)


class ClassOutputSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField()
    level = serializers.IntegerField()
    created_at = serializers.DateTimeField(read_only=True)


class SectionInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=50)


class SectionOutputSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField()
    class_ref = serializers.UUIDField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


# ──────────────────────────────────────────────
# Subject & ClassSubject
# ──────────────────────────────────────────────
class SubjectInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    code = serializers.CharField(max_length=20)
    subject_type = serializers.ChoiceField(
        choices=Subject.SUBJECT_TYPE_CHOICES, default="core"
    )
    default_full_marks = serializers.IntegerField(min_value=1, default=100)


class SubjectOutputSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField()
    code = serializers.CharField()
    subject_type = serializers.CharField()
    default_full_marks = serializers.IntegerField()
    created_at = serializers.DateTimeField(read_only=True)


class ClassSubjectInputSerializer(serializers.Serializer):
    subject_id = serializers.UUIDField()
    is_required = serializers.BooleanField(default=True)
    full_marks = serializers.IntegerField(min_value=1, default=100)


class ClassSubjectOutputSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    class_ref = serializers.UUIDField(read_only=True)
    subject = SubjectOutputSerializer(read_only=True)
    is_required = serializers.BooleanField()
    full_marks = serializers.IntegerField()
    created_at = serializers.DateTimeField(read_only=True)


# ──────────────────────────────────────────────
# Term
# ──────────────────────────────────────────────
class TermInputSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    name = serializers.CharField(max_length=50)
    display_order = serializers.IntegerField(min_value=0, default=0)


class TermOutputSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    session = serializers.UUIDField(read_only=True)
    name = serializers.CharField()
    display_order = serializers.IntegerField()
    created_at = serializers.DateTimeField(read_only=True)


# ──────────────────────────────────────────────
# AssessmentType & Weightage
# ──────────────────────────────────────────────
class AssessmentTypeInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    code = serializers.CharField(max_length=30)
    category = serializers.ChoiceField(
        choices=AssessmentType.CATEGORY_CHOICES, default="summative"
    )
    term_id = serializers.UUIDField(required=False, allow_null=True)
    display_order = serializers.IntegerField(min_value=0, default=0)


class AssessmentTypeOutputSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField()
    code = serializers.CharField()
    category = serializers.CharField()
    term = TermOutputSerializer(read_only=True, allow_null=True)
    display_order = serializers.IntegerField()
    is_active = serializers.BooleanField()
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class AssessmentWeightageInputSerializer(serializers.Serializer):
    class_id = serializers.UUIDField()
    subject_id = serializers.UUIDField()
    assessment_type_id = serializers.UUIDField()
    full_marks = serializers.IntegerField(min_value=1)
    weightage_pct = serializers.DecimalField(max_digits=5, decimal_places=2)


class AssessmentWeightageOutputSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    class_ref = serializers.UUIDField(read_only=True)
    subject = serializers.UUIDField(read_only=True)
    assessment_type = AssessmentTypeOutputSerializer(read_only=True)
    full_marks = serializers.IntegerField()
    weightage_pct = serializers.DecimalField(max_digits=5, decimal_places=2)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


# ──────────────────────────────────────────────
# GradePolicy
# ──────────────────────────────────────────────
class GradePolicyInputSerializer(serializers.Serializer):
    grade_label = serializers.CharField(max_length=10)
    min_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    max_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    grade_point = serializers.DecimalField(max_digits=3, decimal_places=1)
    display_order = serializers.IntegerField(min_value=0)


class GradePolicyOutputSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    grade_label = serializers.CharField()
    min_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    max_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    grade_point = serializers.DecimalField(max_digits=3, decimal_places=1)
    display_order = serializers.IntegerField()
    is_active = serializers.BooleanField()
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


# ──────────────────────────────────────────────
# TeacherAssignment
# ──────────────────────────────────────────────
class TeacherAssignmentInputSerializer(serializers.Serializer):
    teacher_id = serializers.UUIDField()
    class_id = serializers.UUIDField()
    section_id = serializers.UUIDField()
    subject_id = serializers.UUIDField()
    session_id = serializers.UUIDField()


class TeacherAssignmentOutputSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    teacher = serializers.UUIDField(read_only=True)
    class_ref = serializers.UUIDField(read_only=True)
    section = serializers.UUIDField(read_only=True)
    subject = serializers.UUIDField(read_only=True)
    session = serializers.UUIDField(read_only=True)
    is_active = serializers.BooleanField()
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
