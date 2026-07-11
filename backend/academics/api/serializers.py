"""API serializers for academics module."""

from rest_framework import serializers

from academics.models import (
    AcademicSession,
    Class,
    Section,
    Subject,
    ClassSubject,
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
# SubjectCategory
# ──────────────────────────────────────────────
class SubjectCategorySerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField()
    code = serializers.CharField()
    is_scholastic = serializers.BooleanField()
    display_order = serializers.IntegerField()


class SubjectCategoryInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    code = serializers.CharField(max_length=30)
    is_scholastic = serializers.BooleanField(default=True)
    display_order = serializers.IntegerField(default=0)


# ──────────────────────────────────────────────
# Subject & ClassSubject
# ──────────────────────────────────────────────
class SubjectInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    code = serializers.CharField(max_length=20)
    subject_category_id = serializers.UUIDField(required=False, allow_null=True)


class SubjectOutputSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField()
    code = serializers.CharField()
    subject_category = SubjectCategorySerializer(read_only=True, allow_null=True)
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
# Exam & ExamComponent
# ──────────────────────────────────────────────
class ExamSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    session_id = serializers.UUIDField()
    name = serializers.CharField(max_length=100)
    display_order = serializers.IntegerField(default=0)
    created_at = serializers.DateTimeField(read_only=True)


class ExamInputSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    name = serializers.CharField(max_length=100)
    display_order = serializers.IntegerField(default=0)


class ExamComponentSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    exam_id = serializers.UUIDField()
    parent_id = serializers.UUIDField(allow_null=True, required=False)
    name = serializers.CharField(max_length=100)
    code = serializers.CharField(max_length=30, required=False, allow_blank=True)
    full_marks = serializers.DecimalField(max_digits=6, decimal_places=2)
    display_order = serializers.IntegerField(default=0)
    is_optional = serializers.BooleanField(default=False)
    is_grade_only = serializers.BooleanField(default=False)
    created_at = serializers.DateTimeField(read_only=True)


class ExamComponentInputSerializer(serializers.Serializer):
    exam_id = serializers.UUIDField()
    parent_id = serializers.UUIDField(allow_null=True, required=False)
    name = serializers.CharField(max_length=100)
    code = serializers.CharField(max_length=30, required=False, allow_blank=True)
    full_marks = serializers.DecimalField(max_digits=6, decimal_places=2)
    display_order = serializers.IntegerField(default=0)
    is_optional = serializers.BooleanField(default=False)
    is_grade_only = serializers.BooleanField(default=False)


# ──────────────────────────────────────────────
# SubjectAssessmentScheme (marks distribution)
# ──────────────────────────────────────────────
class SubjectAssessmentSchemeSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    class_id = serializers.UUIDField()
    subject_id = serializers.UUIDField()
    exam_component_id = serializers.UUIDField()
    full_marks = serializers.DecimalField(max_digits=6, decimal_places=2)
    weightage_pct = serializers.DecimalField(max_digits=5, decimal_places=2, default=100.00)
    is_active = serializers.BooleanField(default=True)
    display_order = serializers.IntegerField(default=0)
    created_at = serializers.DateTimeField(read_only=True)


class SubjectAssessmentSchemeInputSerializer(serializers.Serializer):
    class_id = serializers.UUIDField()
    subject_id = serializers.UUIDField()
    exam_component_id = serializers.UUIDField()
    full_marks = serializers.DecimalField(max_digits=6, decimal_places=2)
    weightage_pct = serializers.DecimalField(max_digits=5, decimal_places=2, default=100.00)
    is_active = serializers.BooleanField(default=True)
    display_order = serializers.IntegerField(default=0)


class BulkSubjectAssessmentSchemeSerializer(serializers.Serializer):
    """Bulk save for the marks distribution matrix grid."""
    mappings = serializers.ListField(child=SubjectAssessmentSchemeInputSerializer())


# ──────────────────────────────────────────────
# GradePolicySet & GradePolicyGrade
# ──────────────────────────────────────────────
class GradePolicyGradeSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    grade_label = serializers.CharField(max_length=10)
    min_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    max_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    grade_point = serializers.DecimalField(max_digits=3, decimal_places=1)
    display_order = serializers.IntegerField()


class GradePolicyGradeInputSerializer(serializers.Serializer):
    grade_label = serializers.CharField(max_length=10)
    min_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    max_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    grade_point = serializers.DecimalField(max_digits=3, decimal_places=1)
    display_order = serializers.IntegerField()


class GradePolicySetSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    session_id = serializers.UUIDField(allow_null=True, required=False)
    name = serializers.CharField(max_length=100, default="Default")
    is_active = serializers.BooleanField(default=True)
    grades = GradePolicyGradeSerializer(many=True, read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class GradePolicySetInputSerializer(serializers.Serializer):
    session_id = serializers.UUIDField(allow_null=True, required=False)
    name = serializers.CharField(max_length=100, default="Default")
    is_active = serializers.BooleanField(default=True)
    grades = GradePolicyGradeInputSerializer(many=True, required=False)


# ──────────────────────────────────────────────
# PromotionRule
# ──────────────────────────────────────────────
class PromotionRuleSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    session_id = serializers.UUIDField()
    from_class_id = serializers.UUIDField()
    to_class_id = serializers.UUIDField()
    min_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, default=33.00)
    max_subjects_fail = serializers.IntegerField(default=0)
    created_at = serializers.DateTimeField(read_only=True)


class PromotionRuleInputSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    from_class_id = serializers.UUIDField()
    to_class_id = serializers.UUIDField()
    min_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, default=33.00)
    max_subjects_fail = serializers.IntegerField(default=0)


# ──────────────────────────────────────────────
# ReportCardTemplate
# ──────────────────────────────────────────────
class TermSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    session = serializers.UUIDField(read_only=True)
    name = serializers.CharField(max_length=50)
    display_order = serializers.IntegerField()


class TermInputSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    name = serializers.CharField(max_length=50)
    display_order = serializers.IntegerField(default=0)


# ──────────────────────────────────────────────
class ReportCardTemplateSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(max_length=100)
    is_default = serializers.BooleanField(default=False)
    layout_config = serializers.JSONField()
    created_at = serializers.DateTimeField(read_only=True)


class ReportCardTemplateInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    is_default = serializers.BooleanField(default=False)
    layout_config = serializers.JSONField(default=dict)


class ReportCardSectionSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    template = serializers.UUIDField(read_only=True)
    section_type = serializers.ChoiceField(choices=[
        "school_header", "student_details", "scholastic_table",
        "co_scholastic", "discipline", "attendance", "remarks",
        "promotion_status", "signatures", "grading_scale", "summary_card",
    ])
    display_order = serializers.IntegerField()
    title = serializers.CharField(allow_blank=True, default="")
    config = serializers.JSONField(default=dict)


class ReportCardSectionInputSerializer(serializers.Serializer):
    section_type = serializers.ChoiceField(choices=[
        "school_header", "student_details", "scholastic_table",
        "co_scholastic", "discipline", "attendance", "remarks",
        "promotion_status", "signatures", "grading_scale", "summary_card",
    ])
    display_order = serializers.IntegerField()
    title = serializers.CharField(allow_blank=True, default="", required=False)
    config = serializers.JSONField(default=dict, required=False)


class ReportCardSectionSubjectGroupSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    section = serializers.UUIDField(read_only=True)
    subject_category = serializers.UUIDField(allow_null=True)
    include_scholastic = serializers.BooleanField(default=False)
    display_order = serializers.IntegerField()


class ReportCardTemplateAssignmentSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    template = serializers.UUIDField(read_only=True)
    class_id = serializers.UUIDField(allow_null=True)
    session_id = serializers.UUIDField(allow_null=True)


class ReportCardSectionSubjectGroupInputSerializer(serializers.Serializer):
    subject_category = serializers.UUIDField(allow_null=True, required=False)
    include_scholastic = serializers.BooleanField(default=False)
    display_order = serializers.IntegerField(default=0)


class ReportCardTemplateAssignmentInputSerializer(serializers.Serializer):
    template_id = serializers.UUIDField()
    class_id = serializers.UUIDField(allow_null=True, required=False)
    session_id = serializers.UUIDField(allow_null=True, required=False)


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
