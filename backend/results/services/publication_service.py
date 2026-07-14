"""Result publication service: manages result publication workflow."""

from __future__ import annotations

from uuid import UUID

import structlog
from django.db import transaction
from django.utils import timezone

from shared.base_service import BaseService
from core.models_audit import AuditLog
from results.models import ResultPublication
from results.repositories.result_repository import ResultRepository

logger = structlog.get_logger(__name__)


class ResultPublicationService(BaseService):
    """Handles result publication workflow: draft → under review → published."""

    def __init__(self) -> None:
        self.repo = ResultRepository()

    def get_by_session_class_section(
        self,
        session_id: UUID,
        class_id: UUID,
        section_id: UUID,
    ) -> ResultPublication | None:
        return ResultPublication.objects.filter(
            session_id=session_id,
            class_field_id=class_id,
            section_id=section_id,
        ).first()

    def list_by_session(self, session_id: UUID):
        return ResultPublication.objects.filter(session_id=session_id).select_related(
            "class_field", "section", "published_by"
        )

    @transaction.atomic
    def create_publication(
        self,
        session_id: UUID,
        class_id: UUID,
        section_id: UUID,
        remarks: str = "",
    ) -> ResultPublication:
        existing = self.get_by_session_class_section(session_id, class_id, section_id)
        if existing:
            self.log.info("publication_already_exists", id=str(existing.id))
            return existing

        self.log.info(
            "creating_publication",
            session_id=str(session_id),
            class_id=str(class_id),
        )
        publication = ResultPublication.objects.create(
            session_id=session_id,
            class_field_id=class_id,
            section_id=section_id,
            status="draft",
            remarks=remarks,
        )
        return publication

    @transaction.atomic
    def submit_for_review(self, publication_id: UUID) -> ResultPublication | None:
        publication = ResultPublication.objects.filter(id=publication_id).first()
        if not publication:
            return None
        if publication.status != "draft":
            self.log.warning(
                "cannot_submit_for_review",
                current_status=publication.status,
            )
            return None
        publication.submit_for_review()
        self.log.info("publication_submitted_for_review", id=str(publication_id))
        return publication

    @transaction.atomic
    def publish(self, publication_id: UUID, user) -> ResultPublication | None:
        publication = ResultPublication.objects.filter(id=publication_id).first()
        if not publication:
            return None
        if publication.status not in ("draft", "under_review"):
            self.log.warning(
                "cannot_publish",
                current_status=publication.status,
            )
            return None
        publication.publish(user)
        self.log.info("publication_published", id=str(publication_id))
        AuditLog.log(
            action="result_published",
            user=user,
            entity_type="ResultPublication",
            entity_id=str(publication_id),
            details={
                "session_id": str(publication.session_id),
                "class_id": str(publication.class_field_id),
                "section_id": str(publication.section_id),
            },
        )

        # Notify students
        from core.services.notification_service import NotificationService
        from enrollments.models import Enrollment

        notif_svc = NotificationService()
        enrollments = Enrollment.objects.filter(
            session=publication.session,
            class_field=publication.class_field,
            section=publication.section,
            status="active",
        ).select_related("student")

        for enrollment in enrollments:
            if enrollment.student.user:
                notif_svc.create(
                    user=enrollment.student.user,
                    notification_type="result_published",
                    title="Result Published",
                    message=f"Your result for {publication.class_field.name} has been published.",
                    link="/student/results",
                )

        return publication

    @transaction.atomic
    def unpublish(self, publication_id: UUID) -> ResultPublication | None:
        publication = ResultPublication.objects.filter(id=publication_id).first()
        if not publication:
            return None
        if publication.status != "published":
            self.log.warning(
                "cannot_unpublish",
                current_status=publication.status,
            )
            return None
        publication.unpublish()
        self.log.info("publication_unpublished", id=str(publication_id))
        AuditLog.log(
            action="result_unpublished",
            entity_type="ResultPublication",
            entity_id=str(publication_id),
            details={
                "session_id": str(publication.session_id),
                "class_id": str(publication.class_field_id),
                "section_id": str(publication.section_id),
            },
        )
        return publication

    def get_publication_status_summary(self, session_id: UUID) -> dict:
        publications = ResultPublication.objects.filter(session_id=session_id)
        summary = {
            "total": publications.count(),
            "draft": publications.filter(status="draft").count(),
            "under_review": publications.filter(status="under_review").count(),
            "published": publications.filter(status="published").count(),
            "unpublished": publications.filter(status="unpublished").count(),
        }
        return summary
