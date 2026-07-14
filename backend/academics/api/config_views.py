"""Aggregate configuration API — single endpoint for class-level config."""

from uuid import UUID

from django.db import transaction
from django.db.models import Prefetch
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdmin
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

    # 2. Academic structure: Term → Exam → AssessmentComponent
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

    # 3. Component configs: the matrix (component × subject → full_marks/weightage)
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

    return {
        "subjects": subjects_data,
        "academic_structure": academic_structure,
        "configs": configs_data,
        "grade_scale": grade_scale_data,
        "promotion_rule": promotion_data,
    }


class ResultConfigView(APIView):
    """Aggregate endpoint for class-level result configuration."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, session_id, class_id):
        data = _serialize_class_config(session_id, class_id)
        return Response(data)

    def put(self, request, session_id, class_id):
        data = request.data
        with transaction.atomic():
            # 1. Update subject assignments
            if "subjects" in data:
                _update_subjects(class_id, data["subjects"])

            # 2. Update component configs (config matrix)
            if "configs" in data:
                _update_configs(session_id, class_id, data["configs"])

            # 3. Update grade scale
            if "grade_scale" in data:
                _update_grade_scale(session_id, data["grade_scale"])

            # 4. Update promotion rule
            if "promotion_rule" in data:
                _update_promotion_rule(session_id, class_id, data["promotion_rule"])

        return Response(_serialize_class_config(session_id, class_id))

    def patch(self, request, session_id, class_id):
        """Partial update — same as PUT but only applies provided fields."""
        return self.put(request, session_id, class_id)


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

    # Remove subjects not in incoming list
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
        for rule in scale_data["rules"]:
            GradeRule.objects.create(
                grade_scale=scale,
                label=rule["label"],
                min_percentage=rule["min_percentage"],
                max_percentage=rule["max_percentage"],
                grade_point=rule["grade_point"],
                display_order=rule.get("display_order", 0),
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


class SubjectGroupListView(APIView):
    """List all subject groups with their categories."""

    permission_classes = [IsAuthenticated, IsAdmin]

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


from rest_framework import serializers as drf_serializers


class _SubjectGroupSerializer(drf_serializers.Serializer):
    name = drf_serializers.CharField(max_length=100)
    code = drf_serializers.CharField(max_length=30)
    category_id = drf_serializers.UUIDField()
    display_order = drf_serializers.IntegerField(default=0)
