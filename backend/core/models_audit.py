"""Audit log and notification models."""

import typing
import uuid
from django.db import models
from django.utils import timezone


class AuditLog(models.Model):
    """Tracks all critical system actions for accountability."""

    ACTION_CHOICES = [
        ("marks Entered", "Marks Entered"),
        ("marks_updated", "Marks Updated"),
        ("marks_bulk_updated", "Marks Bulk Updated"),
        ("result_published", "Result Published"),
        ("result_unpublished", "Result Unpublished"),
        ("student_created", "Student Created"),
        ("student_updated", "Student Updated"),
        ("student_deleted", "Student Deleted"),
        ("student_promoted", "Student Promoted"),
        ("student_retained", "Student Retained"),
        ("student_transferred", "Student Transferred"),
        ("teacher_assigned", "Teacher Assigned"),
        ("teacher_unassigned", "Teacher Unassigned"),
        ("assessment_created", "Assessment Created"),
        ("assessment_updated", "Assessment Updated"),
        ("session_created", "Session Created"),
        ("session_activated", "Session Activated"),
        ("session_locked", "Session Locked"),
        ("grade_policy_updated", "Grade Policy Updated"),
        ("login_success", "Login Success"),
        ("login_failed", "Login Failed"),
        ("password_reset", "Password Reset"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    objects = models.Manager()
    user = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    entity_type = models.CharField(max_length=100, help_text="Model name affected")
    entity_id = models.CharField(max_length=100, help_text="ID of affected object")
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["action"], name="idx_audit_action"),
            models.Index(fields=["user"], name="idx_audit_user"),
            models.Index(fields=["entity_type", "entity_id"], name="idx_audit_entity"),
            models.Index(fields=["created_at"], name="idx_audit_created"),
        ]

    def __str__(self) -> str:
        return f"{self.action} by {self.user} at {self.created_at}"

    @classmethod
    def log(cls, action: str, user: typing.Any = None, entity_type: str = "", entity_id: str = "",
            details: typing.Dict[str, typing.Any] | None = None, ip_address: str | None = None, user_agent: str = "") -> "AuditLog":
        return cls.objects.create(
            action=action,
            user=user,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent,
        )


class Notification(models.Model):
    """User notifications for system events."""

    TYPE_CHOICES = [
        ("result_published", "Result Published"),
        ("password_reset", "Password Reset"),
        ("marks_submitted", "Marks Submitted"),
        ("assignment_created", "Assignment Created"),
        ("session_activated", "Session Activated"),
        ("general", "General"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    objects = models.Manager()
    user = models.ForeignKey(
        "core.User",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read"], name="idx_notif_user_read"),
        ]

    def __str__(self) -> str:
        return f"{self.title} -> {self.user}"

    @classmethod
    def create_notification(cls, user: typing.Any, notification_type: str, title: str,
                            message: str, link: str = "") -> "Notification":
        return cls.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            link=link,
        )
