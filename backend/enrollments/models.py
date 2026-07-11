"""Enrollment models: Student, Enrollment, ClassTeacher."""

import random
import string

from django.contrib.auth.hashers import make_password, check_password
from django.db import models
from django.utils import timezone

from shared.base_model import BaseModel


class SystemSetting(BaseModel):
    """General system settings stored in the database."""

    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()

    class Meta:
        db_table = "system_settings"

    def __str__(self) -> str:
        return f"{self.key}: {self.value}"


class Student(BaseModel):
    """Student record for the RMS system."""

    user = models.OneToOneField(
        "core.User",
        on_delete=models.CASCADE,
        related_name="student_profile",
        null=True,
        blank=True,
    )
    student_id = models.CharField(max_length=20, unique=True, editable=False)
    registration_number = models.CharField(max_length=100, unique=True, null=True, blank=True)
    name = models.CharField(max_length=255)
    date_of_birth = models.DateField()
    father_name = models.CharField(max_length=255, blank=True, default="")
    mother_name = models.CharField(max_length=255, blank=True, default="")
    guardian_name = models.CharField(max_length=255, blank=True, default="")
    guardian_relation = models.CharField(max_length=50, blank=True, default="")
    phone = models.CharField(max_length=20, blank=True, default="")
    alternate_phone = models.CharField(max_length=20, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    profile_pic = models.ImageField(upload_to="students/profile_pics/", blank=True, null=True)
    address = models.TextField(blank=True, default="")
    admission_date = models.DateField(default=timezone.now)
    admission_class = models.ForeignKey(
        "academics.Class",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admitted_students",
    )
    admission_session = models.ForeignKey(
        "academics.AcademicSession",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admitted_students",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "students"
        ordering = ["-admission_date", "name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.student_id})"

    def set_default_password(self) -> str:
        default = self.date_of_birth.strftime("%d%m%Y")
        self.user.set_password(default)
        self.user.save()
        return default

    @staticmethod
    def generate_student_id() -> str:
        try:
            setting = SystemSetting.objects.get(key="student_id_pattern")
            pattern = setting.value
        except SystemSetting.DoesNotExist:
            pattern = "STU_{year}_{rand:6}"

        import re
        now = timezone.now()
        student_id = pattern

        # Replace {year}
        student_id = student_id.replace("{year}", str(now.year))
        
        # Replace {month}
        student_id = student_id.replace("{month}", f"{now.month:02d}")

        # Replace {seq:X} or {seq}
        seq_matches = re.findall(r"\{seq:?(\d+)?\}", student_id)
        if seq_matches:
            next_seq = Student.objects.count() + 1
            for match in seq_matches:
                padding = int(match) if match else 4
                placeholder = f"{{seq:{match}}}" if match else "{seq}"
                student_id = student_id.replace(placeholder, f"{next_seq:0{padding}d}")

        # Replace {rand:X} or {rand}
        rand_matches = re.findall(r"\{rand:?(\d+)?\}", student_id)
        for match in rand_matches:
            length = int(match) if match else 6
            placeholder = f"{{rand:{match}}}" if match else "{rand}"
            chars = string.ascii_uppercase + string.digits
            random_suffix = "".join(random.choices(chars, k=length))
            student_id = student_id.replace(placeholder, random_suffix)

        base_id = student_id
        counter = 1
        while Student.objects.filter(student_id=student_id).exists():
            student_id = f"{base_id}_{counter}"
            counter += 1

        return student_id


class Enrollment(BaseModel):
    """Tracks student enrollment per academic session with promotion history."""

    STATUS_CHOICES = [
        ("active", "Active"),
        ("promoted", "Promoted"),
        ("retained", "Retained"),
        ("transferred", "Transferred"),
        ("graduated", "Graduated"),
        ("dropped", "Dropped"),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="enrollments")
    session = models.ForeignKey(
        "academics.AcademicSession",
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    class_field = models.ForeignKey(
        "academics.Class",
        on_delete=models.CASCADE,
        related_name="enrollments",
        db_column="class_id",
    )
    section = models.ForeignKey(
        "academics.Section",
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    roll_no = models.CharField(max_length=20, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    promoted_to = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="promoted_from",
    )
    promotion_date = models.DateField(null=True, blank=True)
    remarks = models.TextField(blank=True, default="")

    class Meta:
        db_table = "enrollments"
        ordering = ["-created_at"]
        unique_together = [("student", "session")]

    def __str__(self) -> str:
        return f"{self.student.name} - {self.session} ({self.get_status_display()})"

    def promote_to_next_class(
        self,
        new_class,
        new_section,
        new_session,
        new_roll_no: str = "",
    ) -> "Enrollment":
        new_enrollment = Enrollment.objects.create(
            student=self.student,
            session=new_session,
            class_field=new_class,
            section=new_section,
            roll_no=new_roll_no,
            status="active",
        )
        self.status = "promoted"
        self.promoted_to = new_enrollment
        self.promotion_date = timezone.now().date()
        self.save()
        return new_enrollment

    def retain_in_same_class(self, new_session, new_roll_no: str = "") -> "Enrollment":
        new_enrollment = Enrollment.objects.create(
            student=self.student,
            session=new_session,
            class_field=self.class_field,
            section=self.section,
            roll_no=new_roll_no,
            status="active",
        )
        self.status = "retained"
        self.promoted_to = new_enrollment
        self.promotion_date = timezone.now().date()
        self.save()
        return new_enrollment

    def transfer_out(self, remarks: str = "") -> None:
        self.status = "transferred"
        self.remarks = remarks
        self.promotion_date = timezone.now().date()
        self.save()


class ClassTeacher(BaseModel):
    """Assigns a teacher as class teacher for a class-section-session."""

    teacher = models.ForeignKey(
        "identity.TeacherProfile",
        on_delete=models.CASCADE,
        related_name="class_teacher_assignments",
    )
    class_field = models.ForeignKey(
        "academics.Class",
        on_delete=models.CASCADE,
        related_name="class_teachers",
        db_column="class_id",
    )
    section = models.ForeignKey(
        "academics.Section",
        on_delete=models.CASCADE,
        related_name="class_teachers",
    )
    session = models.ForeignKey(
        "academics.AcademicSession",
        on_delete=models.CASCADE,
        related_name="class_teachers",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "class_teachers"
        unique_together = [("class_field", "section", "session")]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.teacher.name} -> {self.class_field} {self.section} ({self.session})"
