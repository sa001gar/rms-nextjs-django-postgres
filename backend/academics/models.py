"""Academics module models."""

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


class Subject(BaseModel):
    """Subject master."""

    SUBJECT_TYPE_CHOICES = [
        ("core", "Core"),
        ("optional", "Optional"),
        ("cocurricular", "Co-curricular"),
    ]

    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    subject_type = models.CharField(
        max_length=20, choices=SUBJECT_TYPE_CHOICES, default="core"
    )
    default_full_marks = models.PositiveIntegerField(default=100)

    class Meta:
        db_table = "subjects"
        ordering = ["code"]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class ClassSubject(BaseModel):
    """Mapping of subjects assigned to a class."""

    class_ref = models.ForeignKey(
        Class, on_delete=models.CASCADE, related_name="class_subjects", db_column="class_id"
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="class_subjects"
    )
    is_required = models.BooleanField(default=True)
    full_marks = models.PositiveIntegerField(default=100)

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


class AssessmentType(BaseModel):
    """Type of assessment (e.g. Unit Test, Final Exam)."""

    CATEGORY_CHOICES = [
        ("summative", "Summative"),
        ("formative", "Formative"),
        ("project", "Project"),
        ("practical", "Practical"),
        ("other", "Other"),
    ]

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=30, unique=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="summative")
    term = models.ForeignKey(
        Term, on_delete=models.SET_NULL, null=True, blank=True, related_name="assessment_types"
    )
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "assessment_types"
        ordering = ["display_order"]

    def __str__(self) -> str:
        return self.name


class AssessmentWeightage(BaseModel):
    """Weightage of an assessment type per class-subject."""

    class_ref = models.ForeignKey(
        Class, on_delete=models.CASCADE, related_name="assessment_weightages", db_column="class_id"
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="assessment_weightages"
    )
    assessment_type = models.ForeignKey(
        AssessmentType, on_delete=models.CASCADE, related_name="weightages"
    )
    full_marks = models.PositiveIntegerField()
    weightage_pct = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        db_table = "assessment_weightages"
        unique_together = [("class_ref", "subject", "assessment_type")]

    def __str__(self) -> str:
        return f"{self.class_ref.name} - {self.subject.name} - {self.assessment_type.name}"


class GradePolicy(BaseModel):
    """Grade label and point policy."""

    grade_label = models.CharField(max_length=10, unique=True)
    min_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    max_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    grade_point = models.DecimalField(max_digits=3, decimal_places=1)
    display_order = models.PositiveIntegerField(unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "grade_policies"
        ordering = ["display_order"]

    def __str__(self) -> str:
        return f"{self.grade_label} ({self.min_percentage}%-{self.max_percentage}%)"


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


class MarksDistribution(BaseModel):
    """Full-marks allocation for each assessment type per class."""

    class_ref = models.ForeignKey(
        Class, on_delete=models.CASCADE, related_name="marks_distributions", db_column="class_id"
    )
    assessment_type = models.ForeignKey(
        AssessmentType, on_delete=models.CASCADE, related_name="marks_distributions"
    )
    full_marks = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "marks_distributions"
        unique_together = [("class_ref", "assessment_type")]
        ordering = ["class_ref__level", "assessment_type__display_order"]

    def __str__(self) -> str:
        return f"{self.class_ref.name} - {self.assessment_type.name}: {self.full_marks}"

