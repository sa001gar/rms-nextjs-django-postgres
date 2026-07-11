"""Attendance module models."""

from django.db import models
from shared.base_model import BaseModel

class TermAttendance(BaseModel):
    """Attendance record for a student for a specific term."""

    enrollment = models.ForeignKey(
        "enrollments.Enrollment",
        on_delete=models.CASCADE,
        related_name="term_attendances",
    )
    term = models.ForeignKey(
        "academics.Term",
        on_delete=models.CASCADE,
        related_name="term_attendances",
    )
    present_days = models.PositiveIntegerField(default=0)
    total_days = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "term_attendances"
        ordering = ["enrollment", "term"]
        unique_together = [("enrollment", "term")]

    def __str__(self) -> str:
        return f"{self.enrollment.student.name} - {self.term.name}: {self.present_days}/{self.total_days}"
