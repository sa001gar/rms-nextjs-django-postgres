"""Aggregate configuration API — single endpoint for class-level config."""

from uuid import UUID

from django.db import transaction
from django.db.models import Prefetch
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdminOrTeacherReadOnly
from academics.models import (
    AcademicSession,
    AssessmentComponentConfig,
    Class,
    ClassSubject,
    Exam,
    ExamComponent,
    GradeRule,
    GradeScale,
    PromotionRule,
    Subject,
    SubjectCategory,
    SubjectGroup,
    Term,
)


def _serialize_class_config(session_id: UUID, class_id: UUID) -> dict:
    """Build the full configuration dict for a (session, class)."""
    # 1. Subjects assigned to this class
    class_subjects = ClassSubject.objects.filter(
        class_ref_id=class_id
    ).select_related(
        "subject", "subject__subject_category", "subject__group", "group"
    ).order_by("display_order")

    subjects_data = []
    for cs in class_subjects:
        s = cs.subject
        subjects_data.append({
            "id": str(s.id),
            "name": s.name,
            "code": s.code,
            "category": {
                "id": str(s.subject_category.id) if s.subject_category else None,
                "name": s.subject_category.name if s.subject_category else None,
                "code": s.subject_category.code if s.subject_category else None,
                "is_scholastic": s.subject_category.is_scholastic if s.subject_category else True,
            } if s.subject_category else None,
            "group": {
                "id": str(cs.group.id) if cs.group else None,
                "name": cs.group.name if cs.group else None,
                "code": cs.group.code if cs.group else None,
            } if cs.group else None,
            "is_required": cs.is_required,
            "display_order": cs.display_order,
        })

    # 2. Academic structure: Term -> Exam -> AssessmentComponent
    terms = Term.objects.filter(session_id=session_id).order_by("display_order")
    academic_structure = []
    for term in terms:
        exams = Exam.objects.filter(term=term).prefetch_related(
            Prefetch("components", queryset=ExamComponent.objects.order_by("display_order"))
        ).order_by("display_order")
        exams_data = []
        for exam in exams:
            components = exam.components.all()
            exams_data.append({
                "id": str(exam.id),
                "name": exam.name,
                "display_order": exam.display_order,
                "components": [
                    {
                        "id": str(c.id),
                        "name": c.name,
                        "code": c.code,
                        "value_type": c.value_type,
                        "full_marks": float(c.full_marks) if c.full_marks else None,
                        "display_order": c.display_order,
                        "is_optional": c.is_optional,
                    }
                    for c in components
                ],
            })
        academic_structure.append({
            "id": str(term.id),
            "name": term.name,
            "display_order": term.display_order,
            "exams": exams_data,
        })

    # 3. Component configs: the matrix (component x subject -> full_marks/weightage)
    configs_qs = AssessmentComponentConfig.objects.filter(
        class_ref_id=class_id, session_id=session_id
    ).select_related("assessment_component", "subject")
    configs_data = [
        {
            "id": str(c.id),
            "component_id": str(c.assessment_component_id),
            "component_name": c.assessment_component.name,
            "subject_id": str(c.subject_id),
            "subject_name": c.subject.name,
            "full_marks": float(c.full_marks) if c.full_marks else None,
            "weightage_pct": float(c.weightage_pct),
            "is_applicable": c.is_applicable,
            "display_order": c.display_order,
        }
        for c in configs_qs
    ]

    # 4. Active grade scale with rules
    grade_scale = GradeScale.objects.filter(
        session_id=session_id, is_active=True
    ).prefetch_related("rules").first()
    grade_scale_data = None
    if grade_scale:
        grade_scale_data = {
            "id": str(grade_scale.id),
            "name": grade_scale.name,
            "rules": [
                {
                    "id": str(r.id),
                    "label": r.label,
                    "min_percentage": float(r.min_percentage),
                    "max_percentage": float(r.max_percentage),
                    "grade_point": float(r.grade_point),
                    "display_order": r.display_order,
                }
                for r in grade_scale.rules.order_by("display_order")
            ],
        }

    # 5. Promotion rule
    promotion = PromotionRule.objects.filter(
        session_id=session_id, from_class_id=class_id
    ).select_related("to_class").first()
    promotion_data = None
    if promotion:
        promotion_data = {
            "id": str(promotion.id),
            "from_class_id": str(promotion.from_class_id),
            "to_class_id": str(promotion.to_class_id),
            "to_class_name": promotion.to_class.name,
            "min_percentage": float(promotion.min_percentage),
            "max_subjects_fail": promotion.max_subjects_fail,
        }

    # 6. Session lock state
    session = AcademicSession.objects.filter(id=session_id).first()

    return {
        "subjects": subjects_data,
        "academic_structure": academic_structure,
        "configs": configs_data,
        "grade_scale": grade_scale_data,
        "promotion_rule": promotion_data,
        "is_locked": session.is_locked if session else False,
    }


class ResultConfigView(APIView):
    """Aggregate endpoint for class-level result configuration."""

    permission_classes = [IsAuthenticated, IsAdminOrTeacherReadOnly]

    def get(self, request, session_id, class_id):
        data = _serialize_class_config(session_id, class_id)
        return Response(data)

    def put(self, request, session_id, class_id):
        data = request.data
        with transaction.atomic():
            if "academic_structure" in data:
                _update_academic_structure(session_id, data["academic_structure"])
            if "subjects" in data:
                _update_subjects(class_id, data["subjects"])
            if "configs" in data:
                _update_configs(session_id, class_id, data["configs"])
            if "grade_scale" in data:
                if data["grade_scale"] is not None:
                    _update_grade_scale(session_id, data["grade_scale"])
                else:
                    GradeScale.objects.filter(session_id=session_id).delete()
            if "promotion_rule" in data:
                if data["promotion_rule"] is not None:
                    _update_promotion_rule(session_id, class_id, data["promotion_rule"])
                else:
                    PromotionRule.objects.filter(
                        session_id=session_id, from_class_id=class_id
                    ).delete()

        return Response(_serialize_class_config(session_id, class_id))

    def patch(self, request, session_id, class_id):
        return self.put(request, session_id, class_id)


# ---------------------------------------------------------------------------
# Internal helpers — academic structure reconciliation
# ---------------------------------------------------------------------------

def _update_academic_structure(session_id: UUID, terms_data: list[dict]):
    """
    Full reconciliation of the academic structure:
    Create / Update / Delete terms, exams, and components in one pass.
    """
    existing_terms = {str(t.id): t for t in Term.objects.filter(session_id=session_id)}
    processed_term_ids = set()

    for term_data in terms_data:
        term_id = term_data.get("id")
        term_name = term_data.get("name", "").strip()
        term_order = term_data.get("display_order", 0)

        if not term_name:
            continue

        if term_id and term_id in existing_terms:
            term = existing_terms[term_id]
            term.name = term_name
            term.display_order = term_order
            term.save()
        else:
            term = Term.objects.create(
                session_id=session_id,
                name=term_name,
                display_order=term_order,
            )
            # Create initial config entries for this term's components
            term_id = str(term.id)

        processed_term_ids.add(str(term.id))

        # -- Exams -----------------------------------------------------------
        existing_exams = {str(e.id): e for e in Exam.objects.filter(term=term)}
        processed_exam_ids = set()

        for exam_data in term_data.get("exams", []):
            exam_id = exam_data.get("id")
            exam_name = exam_data.get("name", "").strip()
            exam_order = exam_data.get("display_order", 0)

            if not exam_name:
                continue

            if exam_id and exam_id in existing_exams:
                exam = existing_exams[exam_id]
                exam.name = exam_name
                exam.display_order = exam_order
                exam.save()
            else:
                exam = Exam.objects.create(
                    term=term,
                    session_id=session_id,
                    name=exam_name,
                    display_order=exam_order,
                )
                exam_id = str(exam.id)

            processed_exam_ids.add(str(exam.id))

            # -- Components ---------------------------------------------------
            existing_components = {
                str(c.id): c for c in ExamComponent.objects.filter(exam=exam)
            }
            processed_component_ids = set()

            for comp_data in exam_data.get("components", []):
                comp_id = comp_data.get("id")
                comp_name = comp_data.get("name", "").strip()
                comp_order = comp_data.get("display_order", 0)
                value_type = comp_data.get("value_type", "numeric")
                full_marks = comp_data.get("full_marks")
                is_optional = comp_data.get("is_optional", False)

                if not comp_name:
                    continue

                if comp_id and comp_id in existing_components:
                    comp = existing_components[comp_id]
                    comp.name = comp_name
                    comp.display_order = comp_order
                    comp.value_type = value_type
                    comp.full_marks = full_marks if full_marks is not None else None
                    comp.is_optional = is_optional
                    comp.save()
                else:
                    comp = ExamComponent.objects.create(
                        exam=exam,
                        name=comp_name,
                        code=comp_name[:30].upper().replace(" ", "_"),
                        value_type=value_type,
                        full_marks=full_marks,
                        display_order=comp_order,
                        is_optional=is_optional,
                    )

                processed_component_ids.add(str(comp.id))

            # Delete stale components
            stale_components = set(existing_components.keys()) - processed_component_ids
            if stale_components:
                ExamComponent.objects.filter(id__in=list(stale_components)).delete()

        # Delete stale exams
        stale_exams = set(existing_exams.keys()) - processed_exam_ids
        if stale_exams:
            Exam.objects.filter(id__in=list(stale_exams)).delete()

    # Delete stale terms
    stale_terms = set(existing_terms.keys()) - processed_term_ids
    if stale_terms:
        Term.objects.filter(id__in=list(stale_terms)).delete()


def _update_subjects(class_id: str, subjects_data: list[dict]):
    """Replace subject assignments for a class."""
    current_ids = set(
        ClassSubject.objects.filter(class_ref_id=class_id)
        .values_list("subject_id", flat=True)
    )
    incoming_ids = set()
    for item in subjects_data:
        subj_id = item.get("id") or item.get("subject_id")
        if not subj_id:
            continue
        incoming_ids.add(subj_id)
        ClassSubject.objects.update_or_create(
            class_ref_id=class_id,
            subject_id=subj_id,
            defaults={
                "is_required": item.get("is_required", True),
                "display_order": item.get("display_order", 0),
                "group_id": item.get("group_id"),
            },
        )

    to_remove = current_ids - incoming_ids
    if to_remove:
        ClassSubject.objects.filter(
            class_ref_id=class_id, subject_id__in=to_remove
        ).delete()


def _update_configs(session_id: str, class_id: str, configs_data: list[dict]):
    """Bulk upsert component configs."""
    for item in configs_data:
        AssessmentComponentConfig.objects.update_or_create(
            class_ref_id=class_id,
            subject_id=item["subject_id"],
            session_id=session_id,
            assessment_component_id=item["component_id"],
            defaults={
                "full_marks": item.get("full_marks", 0),
                "weightage_pct": item.get("weightage_pct", 100.00),
                "is_applicable": item.get("is_applicable", True),
                "display_order": item.get("display_order", 0),
            },
        )


def _update_grade_scale(session_id: str, scale_data: dict):
    """Create or update grade scale and its rules."""
    scale, _ = GradeScale.objects.update_or_create(
        session_id=session_id,
        name=scale_data.get("name", "Default"),
        defaults={"is_active": scale_data.get("is_active", True)},
    )
    if "rules" in scale_data:
        scale.rules.all().delete()
        for i, rule in enumerate(scale_data["rules"]):
            GradeRule.objects.create(
                grade_scale=scale,
                label=rule["label"],
                min_percentage=rule["min_percentage"],
                max_percentage=rule["max_percentage"],
                grade_point=rule["grade_point"],
                display_order=rule.get("display_order", i),
            )


def _update_promotion_rule(session_id: str, class_id: str, rule_data: dict):
    """Create or update promotion rule for a class."""
    PromotionRule.objects.update_or_create(
        session_id=session_id,
        from_class_id=class_id,
        defaults={
            "to_class_id": rule_data["to_class_id"],
            "min_percentage": rule_data.get("min_percentage", 33.00),
            "max_subjects_fail": rule_data.get("max_subjects_fail", 0),
        },
    )


# ---------------------------------------------------------------------------
# Clone / Duplicate / Lock / Reset endpoints
# ---------------------------------------------------------------------------

class CloneConfigView(APIView):
    """Clone configuration from one session/class to another."""

    permission_classes = [IsAuthenticated, IsAdminOrTeacherReadOnly]

    def post(self, request, session_id, class_id):
        target_session_id = request.data.get("target_session_id")
        target_class_id = request.data.get("target_class_id")

        if not target_session_id or not target_class_id:
            return Response(
                {"detail": "target_session_id and target_class_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        source = _serialize_class_config(session_id, class_id)

        with transaction.atomic():
            # Clone academic structure
            if source.get("academic_structure"):
                _clone_academic_structure(
                    source["academic_structure"],
                    target_session_id,
                    target_class_id,
                )

            # Clone subjects
            if source.get("subjects"):
                # Remove existing assignments and replace
                ClassSubject.objects.filter(class_ref_id=target_class_id).delete()
                for subj in source["subjects"]:
                    ClassSubject.objects.create(
                        class_ref_id=target_class_id,
                        subject_id=subj["id"],
                        is_required=subj.get("is_required", True),
                        display_order=subj.get("display_order", 0),
                    )

            # Clone grade scale
            if source.get("grade_scale"):
                _update_grade_scale(target_session_id, source["grade_scale"])

            # Clone promotion rule
            if source.get("promotion_rule"):
                _update_promotion_rule(
                    target_session_id,
                    target_class_id,
                    source["promotion_rule"],
                )

        return Response(_serialize_class_config(target_session_id, target_class_id))


def _clone_academic_structure(
    structure: list[dict], target_session_id: UUID, target_class_id: UUID
):
    """Clone terms/exams/components and create config entries for the target class."""
    term_id_map = {}
    exam_id_map = {}
    component_id_map = {}

    # Delete existing structure for target session
    Term.objects.filter(session_id=target_session_id).delete()

    for term_data in structure:
        old_id = term_data.get("id")
        new_term = Term.objects.create(
            session_id=target_session_id,
            name=term_data["name"],
            display_order=term_data.get("display_order", 0),
        )
        if old_id:
            term_id_map[old_id] = new_term

        for exam_data in term_data.get("exams", []):
            old_exam_id = exam_data.get("id")
            new_exam = Exam.objects.create(
                term=new_term,
                session_id=target_session_id,
                name=exam_data["name"],
                display_order=exam_data.get("display_order", 0),
            )
            if old_exam_id:
                exam_id_map[old_exam_id] = new_exam

            for comp_data in exam_data.get("components", []):
                old_comp_id = comp_data.get("id")
                new_comp = ExamComponent.objects.create(
                    exam=new_exam,
                    name=comp_data["name"],
                    code=comp_data.get("code", ""),
                    value_type=comp_data.get("value_type", "numeric"),
                    full_marks=comp_data.get("full_marks"),
                    display_order=comp_data.get("display_order", 0),
                    is_optional=comp_data.get("is_optional", False),
                )
                if old_comp_id:
                    component_id_map[old_comp_id] = new_comp

                # Create default config entries for target class
                for cs in ClassSubject.objects.filter(class_ref_id=target_class_id):
                    AssessmentComponentConfig.objects.get_or_create(
                        class_ref_id=target_class_id,
                        subject_id=cs.subject_id,
                        session_id=target_session_id,
                        assessment_component_id=new_comp.id,
                        defaults={
                            "full_marks": new_comp.full_marks or 0,
                            "weightage_pct": 100.00,
                            "is_applicable": True,
                            "display_order": 0,
                        },
                    )


class DuplicateTermView(APIView):
    """Duplicate a term with all its exams, components, and configs."""

    permission_classes = [IsAuthenticated, IsAdminOrTeacherReadOnly]

    def post(self, request, session_id, class_id):
        term_id = request.data.get("term_id")
        new_term_name = request.data.get("name")

        if not term_id:
            return Response(
                {"detail": "term_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            source_term = Term.objects.get(id=term_id, session_id=session_id)
        except Term.DoesNotExist:
            return Response(
                {"detail": "Term not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_name = new_term_name or f"{source_term.name} (Copy)"

        # Get max order
        max_order = (
            Term.objects.filter(session_id=session_id)
            .order_by("-display_order")
            .values_list("display_order", flat=True)
            .first()
            or 0
        )

        with transaction.atomic():
            new_term = Term.objects.create(
                session_id=session_id,
                name=new_name,
                display_order=max_order + 1,
            )

            for exam in Exam.objects.filter(term=source_term).order_by("display_order"):
                new_exam = Exam.objects.create(
                    term=new_term,
                    session_id=session_id,
                    name=exam.name,
                    display_order=exam.display_order,
                )

                for comp in ExamComponent.objects.filter(exam=exam).order_by("display_order"):
                    new_comp = ExamComponent.objects.create(
                        exam=new_exam,
                        name=comp.name,
                        code=comp.code,
                        value_type=comp.value_type,
                        full_marks=comp.full_marks,
                        display_order=comp.display_order,
                        is_optional=comp.is_optional,
                    )

                    # Copy config entries for the class
                    for config in AssessmentComponentConfig.objects.filter(
                        class_ref_id=class_id,
                        session_id=session_id,
                        assessment_component_id=comp.id,
                    ):
                        AssessmentComponentConfig.objects.create(
                            class_ref_id=class_id,
                            subject_id=config.subject_id,
                            session_id=session_id,
                            assessment_component_id=new_comp.id,
                            full_marks=config.full_marks,
                            weightage_pct=config.weightage_pct,
                            is_applicable=config.is_applicable,
                            display_order=config.display_order,
                        )

        return Response(_serialize_class_config(session_id, class_id))


class LockConfigView(APIView):
    """Lock or unlock a session's configuration."""

    permission_classes = [IsAuthenticated, IsAdminOrTeacherReadOnly]

    def post(self, request, session_id, class_id=None):
        try:
            session = AcademicSession.objects.get(id=session_id)
        except AcademicSession.DoesNotExist:
            return Response(
                {"detail": "Session not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        session.is_locked = True
        session.save()
        return Response({"is_locked": True})


class UnlockConfigView(APIView):
    """Unlock a session's configuration (Super Admin only)."""

    permission_classes = [IsAuthenticated, IsAdminOrTeacherReadOnly]

    def post(self, request, session_id, class_id=None):
        if not request.user.is_superuser:
            return Response(
                {"detail": "Only super admins can unlock configuration."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            session = AcademicSession.objects.get(id=session_id)
        except AcademicSession.DoesNotExist:
            return Response(
                {"detail": "Session not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        session.is_locked = False
        session.save()
        return Response({"is_locked": False})


class ResetConfigView(APIView):
    """Reset all configuration for a session/class."""

    permission_classes = [IsAuthenticated, IsAdminOrTeacherReadOnly]

    def post(self, request, session_id, class_id):
        with transaction.atomic():
            AssessmentComponentConfig.objects.filter(
                session_id=session_id,
                class_ref_id=class_id,
            ).delete()
            ClassSubject.objects.filter(class_ref_id=class_id).delete()
            PromotionRule.objects.filter(
                session_id=session_id,
                from_class_id=class_id,
            ).delete()

        return Response(_serialize_class_config(session_id, class_id))


class ImportConfigView(APIView):
    """Import configuration from a previous session."""

    permission_classes = [IsAuthenticated, IsAdminOrTeacherReadOnly]

    def post(self, request, session_id, class_id):
        source_session_id = request.data.get("source_session_id")

        if not source_session_id:
            return Response(
                {"detail": "source_session_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        source = _serialize_class_config(source_session_id, class_id)

        with transaction.atomic():
            # Import academic structure
            if source.get("academic_structure"):
                _clone_academic_structure(
                    source["academic_structure"],
                    session_id,
                    class_id,
                )

            # Import subjects
            if source.get("subjects"):
                ClassSubject.objects.filter(class_ref_id=class_id).delete()
                for subj in source["subjects"]:
                    ClassSubject.objects.create(
                        class_ref_id=class_id,
                        subject_id=subj["id"],
                        is_required=subj.get("is_required", True),
                        display_order=subj.get("display_order", 0),
                    )

            # Import grade scale
            if source.get("grade_scale"):
                _update_grade_scale(session_id, source["grade_scale"])

            # Import promotion rule
            if source.get("promotion_rule"):
                _update_promotion_rule(
                    session_id,
                    class_id,
                    source["promotion_rule"],
                )

        return Response(_serialize_class_config(session_id, class_id))


class SubjectGroupListView(APIView):
    """List all subject groups with their categories."""

    permission_classes = [IsAuthenticated, IsAdminOrTeacherReadOnly]

    def get(self, request):
        groups = SubjectGroup.objects.select_related("category").order_by(
            "category__display_order", "display_order"
        )
        data = [
            {
                "id": str(g.id),
                "name": g.name,
                "code": g.code,
                "category_id": str(g.category_id),
                "category_name": g.category.name,
                "display_order": g.display_order,
            }
            for g in groups
        ]
        return Response(data)

    def post(self, request):
        serializer = _SubjectGroupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = SubjectGroup.objects.create(**serializer.validated_data)
        return Response({
            "id": str(obj.id),
            "name": obj.name,
            "code": obj.code,
            "category_id": str(obj.category_id),
            "display_order": obj.display_order,
        }, status=status.HTTP_201_CREATED)


class _SubjectGroupSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    code = serializers.CharField(max_length=30)
    category_id = serializers.UUIDField()
    display_order = serializers.IntegerField(default=0)
