"""Results module models: MarksEntry and ResultPublication."""

from django.core.validators import MinValueValidator
from django.db import models

from shared.base_model import BaseModel


class MarksEntry(BaseModel):
    """Individual marks entry — stores only raw values, everything else is computed.

    Exactly one of {marks_value, grade_value, descriptive_value} is stored,
    determined by the ExamComponent's value_type.
    """

    enrollment = models.ForeignKey(
        "enrollments.Enrollment",
        on_delete=models.CASCADE,
        related_name="marks_entries",
    )
    subject = models.ForeignKey(
        "academics.Subject",
        on_delete=models.CASCADE,
        related_name="marks_entries",
    )
    exam_component = models.ForeignKey(
        "academics.ExamComponent",
        on_delete=models.CASCADE,
        related_name="marks_entries",
    )
    marks_value = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(0)],
        help_text="Numeric marks (when component.value_type='numeric')"
    )
    grade_value = models.CharField(
        max_length=10, null=True, blank=True,
        help_text="Grade (when component.value_type='grade')"
    )
    descriptive_value = models.TextField(
        null=True, blank=True,
        help_text="Free-text comment (when component.value_type='descriptive')"
    )
    is_absent = models.BooleanField(default=False)
    remarks = models.TextField(blank=True, default="")
    entered_by = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="entered_marks",
    )

    class Meta:
        db_table = "marks_entries"
        ordering = ["enrollment", "subject", "exam_component"]
        unique_together = [("enrollment", "subject", "exam_component")]
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(is_absent=True,
                             marks_value__isnull=True,
                             grade_value__isnull=True,
                             descriptive_value__isnull=True)
                    |
                    models.Q(is_absent=False,
                             marks_value__isnull=False,
                             grade_value__isnull=True,
                             descriptive_value__isnull=True)
                    |
                    models.Q(is_absent=False,
                             marks_value__isnull=True,
                             grade_value__isnull=False,
                             descriptive_value__isnull=True)
                    |
                    models.Q(is_absent=False,
                             marks_value__isnull=True,
                             grade_value__isnull=True,
                             descriptive_value__isnull=False)
                ),
                name="exactly_one_value_type",
            )
        ]

    # -- Serializer-friendly aliases --------------------------------------------------
    # The entire API layer references `obtained_marks` and `is_grade_only`; these
    # properties bridge the gap between the serializers and the actual DB columns.

    @property
    def obtained_marks(self):
        return self.marks_value

    @obtained_marks.setter
    def obtained_marks(self, value):
        self.marks_value = value

    @property
    def is_grade_only(self):
        return self.grade_value is not None

    @is_grade_only.setter
    def is_grade_only(self, value):
        if value:
            self.marks_value = None
        else:
            self.grade_value = None

    def __str__(self) -> str:
        value = self.marks_value or self.grade_value or self.descriptive_value or "ABSENT"
        return (
            f"{self.enrollment.student.name} - {self.subject.code} "
            f"({self.exam_component.name}): {value}"
        )


class ResultPublication(BaseModel):
    """Tracks result publication status for a class in a session."""

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("under_review", "Under Review"),
        ("published", "Published"),
        ("unpublished", "Unpublished"),
    ]

    session = models.ForeignKey(
        "academics.AcademicSession",
        on_delete=models.CASCADE,
        related_name="result_publications",
    )
    class_field = models.ForeignKey(
        "academics.Class",
        on_delete=models.CASCADE,
        related_name="result_publications",
    )
    section = models.ForeignKey(
        "academics.Section",
        on_delete=models.CASCADE,
        related_name="result_publications",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    published_by = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="published_results",
    )
    published_at = models.DateTimeField(null=True, blank=True)
    remarks = models.TextField(blank=True, default="")

    class Meta:
        db_table = "result_publications"
        ordering = ["-created_at"]
        unique_together = [("session", "class_field", "section")]
        indexes = [
            models.Index(fields=["status"], name="idx_pub_status"),
            models.Index(fields=["session"], name="idx_pub_session"),
        ]

    def __str__(self) -> str:
        return f"{self.class_field.name} - {self.section.name} ({self.session.name}): {self.status}"

    def publish(self, user):
        from django.utils import timezone
        self.status = "published"
        self.published_by = user
        self.published_at = timezone.now()
        self.save(update_fields=["status", "published_by", "published_at"])

    def unpublish(self):
        self.status = "unpublished"
        self.published_by = None
        self.published_at = None
        self.save(update_fields=["status", "published_by", "published_at"])

    def submit_for_review(self):
        self.status = "under_review"
        self.save(update_fields=["status"])


class SubjectResult(BaseModel):
    """DEPRECATED — computed on-the-fly by ReportCardComputationService."""
    enrollment = models.ForeignKey("enrollments.Enrollment", on_delete=models.CASCADE, related_name="subject_results+")
    subject = models.ForeignKey("academics.Subject", on_delete=models.CASCADE, related_name="subject_results+")
    total_obtained = models.PositiveIntegerField(default=0)
    total_full = models.PositiveIntegerField(default=0)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    grade = models.CharField(max_length=10, blank=True, default="")
    grade_point = models.DecimalField(max_digits=3, decimal_places=1, default=0)
    class Meta: db_table = "subject_results"; ordering = ["enrollment", "subject"]
    def __str__(self) -> str: return f"{self.enrollment} - {self.subject}: {self.total_obtained}/{self.total_full}"


class StudentRemarks(BaseModel):
    """Per-student, per-session remarks from teachers and principal."""

    enrollment = models.ForeignKey(
        "enrollments.Enrollment",
        on_delete=models.CASCADE,
        related_name="student_remarks",
    )
    session = models.ForeignKey(
        "academics.AcademicSession",
        on_delete=models.CASCADE,
        related_name="student_remarks",
    )
    remark_type = models.CharField(
        max_length=30,
        choices=[
            ("class_teacher", "Class Teacher"),
            ("principal", "Principal"),
            ("subject_teacher", "Subject Teacher"),
        ],
        default="class_teacher",
    )
    content = models.TextField(blank=True, default="")

    class Meta:
        db_table = "student_remarks"
        unique_together = [("enrollment", "session", "remark_type")]

    def __str__(self) -> str:
        return f"{self.enrollment.student.name} - {self.remark_type}: {self.content[:50]}"
