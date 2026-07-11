"""Academics module models."""

import warnings

from django.db import models

from shared.base_model import BaseModel


class AcademicSession(BaseModel):
    """Academic session / year."""

    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)

    class Meta:
        db_table = "academic_sessions"
        ordering = ["-start_date"]

    def __str__(self) -> str:
        return self.name


class Class(BaseModel):
    """School class (e.g. Grade 1, Grade 2)."""

    name = models.CharField(max_length=100, unique=True)
    level = models.PositiveIntegerField(help_text="Numeric level for ordering")

    class Meta:
        db_table = "classes"
        ordering = ["level"]

    def __str__(self) -> str:
        return self.name


class Section(BaseModel):
    """Section within a class (e.g. A, B)."""

    name = models.CharField(max_length=50)
    class_ref = models.ForeignKey(
        Class, on_delete=models.CASCADE, related_name="sections", db_column="class_id"
    )

    class Meta:
        db_table = "sections"
        ordering = ["class_ref", "name"]
        unique_together = [("class_ref", "name")]

    def __str__(self) -> str:
        return f"{self.class_ref.name} - {self.name}"


class SubjectCategory(BaseModel):
    """Configurable subject type (Scholastic, Co-Scholastic, Optional, Language, Skill, etc.)."""

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=30, unique=True)
    is_scholastic = models.BooleanField(default=True, help_text="Affects percentage calculation")
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "subject_categories"
        ordering = ["display_order"]

    def __str__(self) -> str:
        return self.name


class Subject(BaseModel):
    """Subject master."""

    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    subject_category = models.ForeignKey(
        SubjectCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subjects",
    )

    class Meta:
        db_table = "subjects"
        ordering = ["code"]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class ClassSubject(BaseModel):
    """Mapping of subjects assigned to a class with optional grouping."""

    SUBJECT_GROUP_CHOICES = [
        ("core", "Core"),
        ("elective", "Elective"),
        ("language", "Language"),
        ("vocational", "Vocational"),
        ("co_scholastic", "Co-Scholastic"),
    ]

    class_ref = models.ForeignKey(
        Class, on_delete=models.CASCADE, related_name="class_subjects", db_column="class_id"
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="class_subjects"
    )
    is_required = models.BooleanField(default=True)
    subject_group = models.CharField(
        max_length=30, choices=SUBJECT_GROUP_CHOICES, default="core"
    )

    class Meta:
        db_table = "class_subjects"
        unique_together = [("class_ref", "subject")]

    def __str__(self) -> str:
        return f"{self.class_ref.name} - {self.subject.name}"


class Term(BaseModel):
    """Academic Term (e.g. First Term, Second Term)."""

    session = models.ForeignKey(
        AcademicSession, on_delete=models.CASCADE, related_name="terms"
    )
    name = models.CharField(max_length=50)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "terms"
        ordering = ["session", "display_order"]
        unique_together = [("session", "name")]

    def __str__(self) -> str:
        return f"{self.name} ({self.session.name})"


class Exam(BaseModel):
    """Flexible exam/term grouping (e.g., First Term, Half Yearly, Unit Test, Annual)."""

    term = models.ForeignKey(
        Term, on_delete=models.SET_NULL, null=True, blank=True, related_name="exams"
    )
    session = models.ForeignKey(
        AcademicSession, on_delete=models.CASCADE, related_name="exams"
    )
    name = models.CharField(max_length=100)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "exams"
        ordering = ["session", "display_order"]
        unique_together = [("session", "name")]

    def __str__(self) -> str:
        term_part = f" [{self.term.name}]" if self.term else ""
        return f"{self.name}{term_part} ({self.session.name})"


class ExamComponent(BaseModel):
    """A configurable, hierarchical assessable unit with declared value type."""

    VALUE_TYPES = [
        ("numeric", "Numeric Marks"),
        ("grade", "Grade Only"),
        ("descriptive", "Descriptive"),
    ]

    exam = models.ForeignKey(
        Exam, on_delete=models.CASCADE, related_name="components"
    )
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True, related_name="children"
    )
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=30, blank=True, default="",
                            help_text="Optional short code for matching")
    value_type = models.CharField(
        max_length=20, choices=VALUE_TYPES, default="numeric",
        help_text="What kind of value this component stores"
    )
    full_marks = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text="Required for numeric type, null for grade/descriptive"
    )
    display_order = models.PositiveIntegerField(default=0)
    is_optional = models.BooleanField(default=False)

    class Meta:
        db_table = "exam_components"
        ordering = ["exam", "parent__id", "display_order"]
        unique_together = [("exam", "parent", "name")]

    def __str__(self) -> str:
        prefix = f"{self.exam.name} / " if self.exam else ""
        parent_prefix = f"{self.parent.name} > " if self.parent else ""
        vtype = f" [{self.value_type}]" if self.value_type != "numeric" else ""
        marks = f" ({self.full_marks})" if self.full_marks else ""
        return f"{prefix}{parent_prefix}{self.name}{marks}{vtype}"


class SubjectAssessmentScheme(BaseModel):
    """Configures how a subject is assessed for a class in a given session.

    Maps which ExamComponents apply to a given class+subject+session with
    overridable full_marks and weightage.
    """

    class_ref = models.ForeignKey(
        Class, on_delete=models.CASCADE, related_name="assessment_schemes", db_column="class_id"
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="assessment_schemes"
    )
    session = models.ForeignKey(
        AcademicSession, on_delete=models.CASCADE, related_name="assessment_schemes",
        help_text="Session-scoped so historical report cards remain valid"
    )
    exam_component = models.ForeignKey(
        ExamComponent, on_delete=models.CASCADE, related_name="assessment_schemes"
    )
    full_marks = models.DecimalField(
        max_digits=6, decimal_places=2,
        help_text="Override ExamComponent.full_marks per class-subject-session"
    )
    weightage_pct = models.DecimalField(max_digits=5, decimal_places=2, default=100.00)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "subject_assessment_schemes"
        ordering = ["class_ref__level", "subject__code", "display_order"]
        unique_together = [("class_ref", "subject", "session", "exam_component")]

    def __str__(self) -> str:
        return (
            f"{self.class_ref.name} {self.subject.name} "
            f"[{self.session.name}] - {self.exam_component.name}"
        )


class GradePolicySet(BaseModel):
    """Named grading scheme scoped to a session."""

    session = models.ForeignKey(
        AcademicSession, on_delete=models.CASCADE, null=True, blank=True,
        related_name="grade_policy_sets"
    )
    name = models.CharField(max_length=100, default="Default")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "grade_policy_sets"
        unique_together = [("session", "name")]

    def __str__(self) -> str:
        return f"{self.name} ({self.session.name if self.session else 'Global'})"


class TeacherAssignment(BaseModel):
    """Teacher assignment to class-section-subject-session."""

    teacher = models.ForeignKey(
        "identity.TeacherProfile",
        on_delete=models.CASCADE,
        related_name="teacher_assignments",
    )
    class_ref = models.ForeignKey(
        Class, on_delete=models.CASCADE, related_name="teacher_assignments", db_column="class_id"
    )
    section = models.ForeignKey(
        Section, on_delete=models.CASCADE, related_name="teacher_assignments"
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="teacher_assignments"
    )
    session = models.ForeignKey(
        AcademicSession, on_delete=models.CASCADE, related_name="teacher_assignments"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "teacher_assignments"
        unique_together = [
            ("teacher", "class_ref", "section", "subject", "session"),
        ]

    def __str__(self) -> str:
        return (
            f"{self.teacher.name} -> {self.class_ref.name} "
            f"{self.section.name} {self.subject.name}"
        )


class GradePolicyGrade(BaseModel):
    """Individual grade row within a GradePolicySet."""

    grade_policy_set = models.ForeignKey(
        GradePolicySet, on_delete=models.CASCADE, related_name="grades"
    )
    grade_label = models.CharField(max_length=10)
    min_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    max_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    grade_point = models.DecimalField(max_digits=3, decimal_places=1)
    display_order = models.PositiveIntegerField()

    class Meta:
        db_table = "grade_policy_grades"
        ordering = ["grade_policy_set", "display_order"]

    def __str__(self) -> str:
        return f"{self.grade_label} ({self.min_percentage}%-{self.max_percentage}%)"


class PromotionRule(BaseModel):
    """Configurable promotion criteria for a class in a session."""

    session = models.ForeignKey(
        AcademicSession, on_delete=models.CASCADE, related_name="promotion_rules"
    )
    from_class = models.ForeignKey(
        Class, on_delete=models.CASCADE, related_name="promotion_rules_from"
    )
    to_class = models.ForeignKey(
        Class, on_delete=models.CASCADE, related_name="promotion_rules_to"
    )
    min_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=33.00)
    max_subjects_fail = models.PositiveIntegerField(
        default=0, help_text="Max subjects a student can fail and still be promoted"
    )

    class Meta:
        db_table = "promotion_rules"
        unique_together = [("session", "from_class")]

    def __str__(self) -> str:
        return f"{self.from_class.name} → {self.to_class.name} ({self.session.name})"


class ReportCardTemplate(BaseModel):
    """Configurable report card layout with domain-modeled sections."""

    name = models.CharField(max_length=100, unique=True)
    is_default = models.BooleanField(default=False)
    layout_config = models.JSONField(
        default=dict, blank=True,
        help_text="Rendering preferences: margins, orientation, font sizes, colors"
    )

    class Meta:
        db_table = "report_card_templates"

    def __str__(self) -> str:
        return self.name


class ReportCardTemplateAssignment(BaseModel):
    """Many-to-many assignment of templates to class + session."""

    template = models.ForeignKey(
        ReportCardTemplate, on_delete=models.CASCADE, related_name="assignments"
    )
    class_ref = models.ForeignKey(
        Class, on_delete=models.CASCADE, null=True, blank=True,
        related_name="template_assignments", db_column="class_id"
    )
    session = models.ForeignKey(
        AcademicSession, on_delete=models.CASCADE, null=True, blank=True,
        related_name="template_assignments"
    )

    class Meta:
        db_table = "report_card_template_assignments"
        unique_together = [("template", "class_ref", "session")]

    def __str__(self) -> str:
        class_part = self.class_ref.name if self.class_ref else "All Classes"
        session_part = self.session.name if self.session else "All Sessions"
        return f"{self.template.name} → {class_part} ({session_part})"


class ReportCardSection(BaseModel):
    """Domain-modeled section within a report card template."""

    SECTION_TYPES = [
        ("school_header", "School Header"),
        ("student_details", "Student Details"),
        ("scholastic_table", "Scholastic Subjects Table"),
        ("co_scholastic", "Co-Scholastic Areas"),
        ("discipline", "Discipline Record"),
        ("attendance", "Attendance Summary"),
        ("remarks", "Remarks"),
        ("promotion_status", "Promotion Status"),
        ("signatures", "Signature Block"),
        ("grading_scale", "Grading Scale"),
        ("summary_card", "Result Summary Card"),
    ]

    template = models.ForeignKey(
        ReportCardTemplate, on_delete=models.CASCADE, related_name="sections"
    )
    section_type = models.CharField(max_length=50, choices=SECTION_TYPES)
    display_order = models.PositiveIntegerField()
    title = models.CharField(max_length=200, blank=True, default="")
    config = models.JSONField(
        default=dict, blank=True,
        help_text="Per-section rendering options (column widths, label overrides, visibility)"
    )

    class Meta:
        db_table = "report_card_sections"
        ordering = ["template", "display_order"]

    def __str__(self) -> str:
        return f"{self.template.name} / {self.get_section_type_display()}"


class ReportCardSectionSubjectGroup(BaseModel):
    """Which subject categories appear in a given report card section."""

    section = models.ForeignKey(
        ReportCardSection, on_delete=models.CASCADE, related_name="subject_groups"
    )
    subject_category = models.ForeignKey(
        SubjectCategory, on_delete=models.CASCADE, null=True, blank=True,
        related_name="report_card_sections"
    )
    include_scholastic = models.BooleanField(
        default=False,
        help_text="Shortcut: include all scholastic subjects"
    )
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "report_card_section_subject_groups"
        ordering = ["section", "display_order"]

    def __str__(self) -> str:
        if self.include_scholastic:
            return f"{self.section} - All Scholastic"
        return f"{self.section} - {self.subject_category.name if self.subject_category else 'None'}"


# ════════════════════════════════════════════════════════════════
# DEPRECATED MODELS — kept for migration compatibility only.
# These tables will be removed in a future migration after all
# data has been migrated to the new schema.
# ════════════════════════════════════════════════════════════════

class ExamComponentMapping(BaseModel):
    """DEPRECATED — renamed to SubjectAssessmentScheme."""
    class_ref = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="exam_component_mappings+", db_column="class_id")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="exam_component_mappings+")
    exam_component = models.ForeignKey(ExamComponent, on_delete=models.CASCADE, related_name="class_subject_mappings+")
    full_marks = models.DecimalField(max_digits=6, decimal_places=2)
    weightage_pct = models.DecimalField(max_digits=5, decimal_places=2, default=100.00)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)
    class Meta: db_table = "exam_component_mappings"; ordering = ["class_ref__level", "subject__code", "display_order"]
    def __str__(self) -> str: return f"{self.class_ref} {self.subject} - {self.exam_component}"


class AssessmentType(BaseModel):
    """DEPRECATED — Use Exam + ExamComponent instead."""
    CATEGORY_CHOICES = [
        ("summative", "Summative"), ("formative", "Formative"),
        ("project", "Project"), ("practical", "Practical"), ("other", "Other"),
    ]
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=30, unique=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="summative")
    term = models.ForeignKey("Term", on_delete=models.SET_NULL, null=True, blank=True, related_name="assessment_types")
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    class Meta: db_table = "assessment_types"; ordering = ["display_order"]
    def __str__(self) -> str: return self.name


class AssessmentWeightage(BaseModel):
    """DEPRECATED — Use SubjectAssessmentScheme instead."""
    class_ref = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="assessment_weightages+", db_column="class_id")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="assessment_weightages+")
    assessment_type = models.ForeignKey(AssessmentType, on_delete=models.CASCADE, related_name="weightages+")
    full_marks = models.PositiveIntegerField()
    weightage_pct = models.DecimalField(max_digits=5, decimal_places=2)
    class Meta: db_table = "assessment_weightages"; unique_together = [("class_ref", "subject", "assessment_type")]
    def __str__(self) -> str: return f"{self.class_ref} - {self.subject} - {self.assessment_type}"


class MarksDistribution(BaseModel):
    """DEPRECATED — Use SubjectAssessmentScheme instead."""
    class_ref = models.ForeignKey(Class, on_delete=models.CASCADE, related_name="marks_distributions+", db_column="class_id")
    assessment_type = models.ForeignKey(AssessmentType, on_delete=models.CASCADE, related_name="marks_distributions+")
    full_marks = models.PositiveIntegerField(default=0)
    class Meta: db_table = "marks_distributions"; unique_together = [("class_ref", "assessment_type")]
    def __str__(self) -> str: return f"{self.class_ref} - {self.assessment_type}: {self.full_marks}"


class GradePolicy(BaseModel):
    """DEPRECATED — Use GradePolicySet + GradePolicyGrade instead."""
    grade_label = models.CharField(max_length=10, unique=True)
    min_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    max_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    grade_point = models.DecimalField(max_digits=3, decimal_places=1)
    display_order = models.PositiveIntegerField(unique=True)
    is_active = models.BooleanField(default=True)
    class Meta: db_table = "grade_policies"; ordering = ["display_order"]
    def __str__(self) -> str: return f"{self.grade_label} ({self.min_percentage}%-{self.max_percentage}%)"
