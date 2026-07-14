"""API views for academics module."""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import IsAdmin, IsAdminOrTeacherReadOnly
from academics.services.session_service import SessionService
from academics.services.class_service import ClassService
from academics.services.subject_service import SubjectService
from academics.services.assignment_service import AssignmentService
from academics.api.serializers import (
    AcademicSessionInputSerializer,
    AcademicSessionOutputSerializer,
    ClassInputSerializer,
    ClassOutputSerializer,
    SectionInputSerializer,
    SectionOutputSerializer,
    SubjectInputSerializer,
    SubjectOutputSerializer,
    ClassSubjectInputSerializer,
    ClassSubjectOutputSerializer,
    TeacherAssignmentInputSerializer,
    TeacherAssignmentOutputSerializer,
    ExamInputSerializer,
    ExamSerializer,
    ExamComponentInputSerializer,
    ExamComponentSerializer,
    AssessmentComponentConfigInputSerializer,
    AssessmentComponentConfigSerializer,
    BulkAssessmentComponentConfigSerializer,
    GradeScaleInputSerializer,
    GradeScaleSerializer,
    GradeRuleSerializer,
    GradeRuleInputSerializer,
    PromotionRuleInputSerializer,
    PromotionRuleSerializer,
    TermSerializer,
    TermInputSerializer,
    SubjectCategorySerializer,
    SubjectCategoryInputSerializer,
    ReportCardTemplateInputSerializer,
    ReportCardTemplateSerializer,
    ReportCardSectionSerializer,
    ReportCardSectionInputSerializer,
    ReportCardSectionSubjectGroupSerializer,
    ReportCardSectionSubjectGroupInputSerializer,
    ReportCardTemplateAssignmentSerializer,
    ReportCardTemplateAssignmentInputSerializer,
)


class AcademicSessionViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrTeacherReadOnly]
    service = SessionService()

    def list(self, request):
        sessions = self.service.list_all()
        data = [AcademicSessionOutputSerializer(s).data for s in sessions]
        return Response(data)

    def retrieve(self, request, pk=None):
        obj = self.service.repo.get_by_id(pk)
        if not obj:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(AcademicSessionOutputSerializer(obj).data)

    def create(self, request):
        serializer = AcademicSessionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session = self.service.create(**serializer.validated_data)
        return Response(
            AcademicSessionOutputSerializer(session).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, pk=None):
        session = self.service.activate(pk)
        return Response(AcademicSessionOutputSerializer(session).data)

    @action(detail=True, methods=["post"], url_path="lock")
    def lock(self, request, pk=None):
        session = self.service.lock(pk)
        return Response(AcademicSessionOutputSerializer(session).data)


class TermViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrTeacherReadOnly]

    def list(self, request):
        from academics.models import Term
        session_id = request.query_params.get("session_id")
        qs = Term.objects.all()
        if session_id:
            qs = qs.filter(session_id=session_id)
        qs = qs.order_by("display_order")
        data = [TermSerializer(t).data for t in qs]
        return Response(data)

    def create(self, request):
        from academics.models import Term
        serializer = TermInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = Term.objects.create(**serializer.validated_data)
        return Response(TermSerializer(obj).data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        from academics.models import Term
        serializer = TermInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        Term.objects.filter(pk=pk).update(**serializer.validated_data)
        obj = Term.objects.get(pk=pk)
        return Response(TermSerializer(obj).data)

    def destroy(self, request, pk=None):
        from academics.models import Term
        Term.objects.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SubjectCategoryViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrTeacherReadOnly]

    def list(self, request):
        from academics.models import SubjectCategory
        qs = SubjectCategory.objects.all().order_by("display_order")
        data = [SubjectCategorySerializer(c).data for c in qs]
        return Response(data)

    def create(self, request):
        from academics.models import SubjectCategory
        serializer = SubjectCategoryInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = SubjectCategory.objects.create(**serializer.validated_data)
        return Response(SubjectCategorySerializer(obj).data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        from academics.models import SubjectCategory
        serializer = SubjectCategoryInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        SubjectCategory.objects.filter(pk=pk).update(**serializer.validated_data)
        obj = SubjectCategory.objects.get(pk=pk)
        return Response(SubjectCategorySerializer(obj).data)

    def destroy(self, request, pk=None):
        from academics.models import SubjectCategory
        SubjectCategory.objects.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ExamViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrTeacherReadOnly]

    def list(self, request):
        from academics.models import Exam
        session_id = request.query_params.get("session_id")
        qs = Exam.objects.all()
        if session_id:
            qs = qs.filter(session_id=session_id)
        qs = qs.prefetch_related("components")
        data = []
        for exam in qs:
            d = ExamSerializer(exam).data
            d["components"] = [
                ExamComponentSerializer(c).data for c in exam.components.all()
            ]
            data.append(d)
        return Response(data)

    def retrieve(self, request, pk=None):
        from academics.models import Exam
        exam = Exam.objects.prefetch_related("components").filter(pk=pk).first()
        if not exam:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        d = ExamSerializer(exam).data
        d["components"] = [ExamComponentSerializer(c).data for c in exam.components.all()]
        return Response(d)

    def create(self, request):
        from academics.models import Exam
        serializer = ExamInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        exam = Exam.objects.create(**serializer.validated_data)
        return Response(ExamSerializer(exam).data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        from academics.models import Exam
        serializer = ExamInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        Exam.objects.filter(pk=pk).update(**serializer.validated_data)
        exam = Exam.objects.get(pk=pk)
        return Response(ExamSerializer(exam).data)

    def destroy(self, request, pk=None):
        from academics.models import Exam
        Exam.objects.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ClassViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrTeacherReadOnly]
    service = ClassService()

    def list(self, request):
        classes = self.service.list_all()
        data = [ClassOutputSerializer(c).data for c in classes]
        return Response(data)

    def retrieve(self, request, pk=None):
        obj = self.service.get_by_id(pk)
        if not obj:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(ClassOutputSerializer(obj).data)

    def create(self, request):
        serializer = ClassInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        class_obj = self.service.create(**serializer.validated_data)
        return Response(
            ClassOutputSerializer(class_obj).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, pk=None):
        serializer = ClassInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        class_obj = self.service.update(pk, **serializer.validated_data)
        return Response(ClassOutputSerializer(class_obj).data)

    def destroy(self, request, pk=None):
        self.service.delete(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get", "post"], url_path="sections")
    def sections(self, request, pk=None):
        if request.method == "GET":
            sections = self.service.list_sections(pk)
            data = [SectionOutputSerializer(s).data for s in sections]
            return Response(data)

        serializer = SectionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        section = self.service.create_section(pk, **serializer.validated_data)
        return Response(
            SectionOutputSerializer(section).data,
            status=status.HTTP_201_CREATED,
        )


class SubjectViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrTeacherReadOnly]
    service = SubjectService()

    def list(self, request):
        category = request.query_params.get("category")
        if category:
            subjects = self.service.list_by_category(category)
        else:
            subjects = self.service.list_all()
        data = [SubjectOutputSerializer(s).data for s in subjects]
        return Response(data)

    def retrieve(self, request, pk=None):
        obj = self.service.get_by_id(pk)
        if not obj:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(SubjectOutputSerializer(obj).data)

    def create(self, request):
        serializer = SubjectInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subject = self.service.create(**serializer.validated_data)
        return Response(
            SubjectOutputSerializer(subject).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, pk=None):
        serializer = SubjectInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subject = self.service.update(pk, **serializer.validated_data)
        return Response(SubjectOutputSerializer(subject).data)

    def destroy(self, request, pk=None):
        self.service.delete(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"], url_path="by-category")
    def by_category(self, request):
        category = request.query_params.get("category", "")
        subjects = self.service.list_by_category(category) if category else self.service.list_all()
        data = [SubjectOutputSerializer(s).data for s in subjects]
        return Response(data)

    @action(detail=False, methods=["post"], url_path="assign-to-class")
    def assign_to_class(self, request):
        serializer = ClassSubjectInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        class_id = request.data.get("class_id")
        cs = self.service.assign_to_class(class_id=class_id, **serializer.validated_data)
        return Response(
            ClassSubjectOutputSerializer(cs).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="class-subjects")
    def class_subjects(self, request):
        class_id = request.query_params.get("class_id")
        if not class_id:
            return Response(
                {"detail": "class_id query param required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cs_list = self.service.list_class_subjects(class_id)
        data = [ClassSubjectOutputSerializer(cs).data for cs in cs_list]
        return Response(data)

    @action(detail=False, methods=["post"], url_path="unassign-from-class")
    def unassign_from_class(self, request):
        class_id = request.data.get("class_id")
        subject_id = request.data.get("subject_id")
        if not class_id or not subject_id:
            return Response(
                {"detail": "class_id and subject_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from academics.models import ClassSubject
        ClassSubject.objects.filter(class_ref_id=class_id, subject_id=subject_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ExamComponentViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrTeacherReadOnly]

    def list(self, request):
        from academics.models import ExamComponent
        exam_id = request.query_params.get("exam_id")
        qs = ExamComponent.objects.select_related("exam", "parent")
        if exam_id:
            qs = qs.filter(exam_id=exam_id)
        data = [ExamComponentSerializer(c).data for c in qs]
        return Response(data)

    def create(self, request):
        from academics.models import ExamComponent
        serializer = ExamComponentInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = ExamComponent.objects.create(**serializer.validated_data)
        return Response(ExamComponentSerializer(obj).data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        from academics.models import ExamComponent
        serializer = ExamComponentInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ExamComponent.objects.filter(pk=pk).update(**serializer.validated_data)
        obj = ExamComponent.objects.get(pk=pk)
        return Response(ExamComponentSerializer(obj).data)

    def destroy(self, request, pk=None):
        from academics.models import ExamComponent
        ExamComponent.objects.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AssessmentComponentConfigViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrTeacherReadOnly]

    def list(self, request):
        from academics.models import AssessmentComponentConfig
        class_id = request.query_params.get("class_id")
        subject_id = request.query_params.get("subject_id")
        qs = AssessmentComponentConfig.objects.select_related(
            "class_ref", "subject", "assessment_component"
        )
        if class_id:
            qs = qs.filter(class_ref_id=class_id)
        if subject_id:
            qs = qs.filter(subject_id=subject_id)
        data = []
        for m in qs:
            d = AssessmentComponentConfigSerializer(m).data
            d["class_name"] = m.class_ref.name
            d["subject_name"] = m.subject.name
            d["exam_component_name"] = m.assessment_component.name
            data.append(d)
        return Response(data)

    @action(detail=False, methods=["post"], url_path="bulk-save")
    def bulk_save(self, request):
        from academics.models import AssessmentComponentConfig
        from django.db import transaction

        mappings = request.data.get("mappings", [])
        if not mappings:
            return Response({"detail": "No mappings provided."}, status=status.HTTP_400_BAD_REQUEST)

        errors = []
        results = []
        with transaction.atomic():
            for i, entry in enumerate(mappings):
                serializer = AssessmentComponentConfigInputSerializer(data=entry)
                if not serializer.is_valid():
                    errors.append({"index": i, "errors": serializer.errors})
                    continue
                obj, _ = AssessmentComponentConfig.objects.update_or_create(
                    class_ref_id=entry["class_id"],
                    subject_id=entry["subject_id"],
                    assessment_component_id=entry["assessment_component_id"],
                    defaults={
                        "full_marks": entry.get("full_marks", 0),
                        "weightage_pct": entry.get("weightage_pct", 100.00),
                        "is_applicable": entry.get("is_applicable", True),
                        "display_order": entry.get("display_order", 0),
                    },
                )
                results.append(AssessmentComponentConfigSerializer(obj).data)

        if errors:
            return Response({"results": results, "errors": errors}, status=status.HTTP_207_MULTI_STATUS)
        return Response(results, status=status.HTTP_200_OK)


class GradeScaleViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrTeacherReadOnly]

    def list(self, request):
        from academics.models import GradeScale, GradeRule
        session_id = request.query_params.get("session_id")
        qs = GradeScale.objects.all()
        if session_id:
            qs = qs.filter(session_id=session_id)
        qs = qs.prefetch_related("rules")
        data = []
        for scale in qs:
            d = GradeScaleSerializer(scale).data
            d["grades"] = [GradeRuleSerializer(g).data for g in scale.rules.all()]
            data.append(d)
        return Response(data)

    def create(self, request):
        from academics.models import GradeScale, GradeRule
        serializer = GradeScaleInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        grades_data = serializer.validated_data.pop("grades", [])
        scale = GradeScale.objects.create(**serializer.validated_data)
        for g in grades_data:
            GradeRule.objects.create(grade_scale=scale, **g)
        scale.refresh_from_db()
        d = GradeScaleSerializer(scale).data
        d["grades"] = [GradeRuleSerializer(g).data for g in scale.rules.all()]
        return Response(d, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        from academics.models import GradeScale
        GradeScale.objects.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GradeRuleViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrTeacherReadOnly]

    def list(self, request):
        from academics.models import GradeRule
        scale_id = request.query_params.get("scale_id")
        qs = GradeRule.objects.all()
        if scale_id:
            qs = qs.filter(grade_scale_id=scale_id)
        data = [GradeRuleSerializer(g).data for g in qs]
        return Response(data)

    def create(self, request):
        from academics.models import GradeRule
        serializer = GradeRuleInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = GradeRule.objects.create(**serializer.validated_data)
        return Response(GradeRuleSerializer(obj).data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        from academics.models import GradeRule
        serializer = GradeRuleInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        GradeRule.objects.filter(pk=pk).update(**serializer.validated_data)
        obj = GradeRule.objects.get(pk=pk)
        return Response(GradeRuleSerializer(obj).data)

    def destroy(self, request, pk=None):
        from academics.models import GradeRule
        GradeRule.objects.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PromotionRuleViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrTeacherReadOnly]

    def list(self, request):
        from academics.models import PromotionRule
        session_id = request.query_params.get("session_id")
        qs = PromotionRule.objects.select_related("from_class", "to_class", "session")
        if session_id:
            qs = qs.filter(session_id=session_id)
        data = []
        for r in qs:
            d = PromotionRuleSerializer(r).data
            d["from_class_name"] = r.from_class.name
            d["to_class_name"] = r.to_class.name
            data.append(d)
        return Response(data)

    def create(self, request):
        from academics.models import PromotionRule
        serializer = PromotionRuleInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = PromotionRule.objects.create(**serializer.validated_data)
        return Response(PromotionRuleSerializer(obj).data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        from academics.models import PromotionRule
        serializer = PromotionRuleInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        PromotionRule.objects.filter(pk=pk).update(**serializer.validated_data)
        obj = PromotionRule.objects.get(pk=pk)
        return Response(PromotionRuleSerializer(obj).data)

    def destroy(self, request, pk=None):
        from academics.models import PromotionRule
        PromotionRule.objects.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReportCardTemplateViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrTeacherReadOnly]

    def list(self, request):
        from academics.models import ReportCardTemplate
        qs = ReportCardTemplate.objects.all()
        data = []
        for t in qs:
            d = ReportCardTemplateSerializer(t).data
            d["sections"] = self._get_sections(t.id)
            d["assignments"] = self._get_assignments(t.id)
            data.append(d)
        return Response(data)

    def retrieve(self, request, pk=None):
        from academics.models import ReportCardTemplate
        try:
            t = ReportCardTemplate.objects.get(pk=pk)
        except ReportCardTemplate.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        d = ReportCardTemplateSerializer(t).data
        d["sections"] = self._get_sections(pk)
        d["assignments"] = self._get_assignments(pk)
        return Response(d)

    def create(self, request):
        from academics.models import ReportCardTemplate
        serializer = ReportCardTemplateInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = ReportCardTemplate.objects.create(**serializer.validated_data)
        d = ReportCardTemplateSerializer(obj).data
        d["sections"] = []
        d["assignments"] = []
        return Response(d, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        from academics.models import ReportCardTemplate
        serializer = ReportCardTemplateInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ReportCardTemplate.objects.filter(pk=pk).update(**serializer.validated_data)
        return self.retrieve(request, pk=pk)

    def destroy(self, request, pk=None):
        from academics.models import ReportCardTemplate
        ReportCardTemplate.objects.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get", "post"], url_path="sections")
    def sections(self, request, pk=None):
        from academics.models import ReportCardSection
        if request.method == "GET":
            return Response(self._get_sections(pk))
        serializer = ReportCardSectionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = ReportCardSection.objects.create(
            template_id=pk, **serializer.validated_data
        )
        return Response(ReportCardSectionSerializer(obj).data, status=status.HTTP_201_CREATED)

    def _get_sections(self, template_id):
        from academics.models import ReportCardSection
        sections = ReportCardSection.objects.filter(template_id=template_id).order_by("display_order")
        result = []
        for s in sections:
            d = ReportCardSectionSerializer(s).data
            d["subject_groups"] = self._get_subject_groups(s.id)
            result.append(d)
        return result

    def _get_subject_groups(self, section_id):
        from academics.models import ReportCardSectionSubjectGroup
        groups = ReportCardSectionSubjectGroup.objects.filter(section_id=section_id).order_by("display_order")
        return [ReportCardSectionSubjectGroupSerializer(g).data for g in groups]

    def _get_assignments(self, template_id):
        from academics.models import ReportCardTemplateAssignment
        assignments = ReportCardTemplateAssignment.objects.filter(template_id=template_id)
        data = []
        for a in assignments:
            d = ReportCardTemplateAssignmentSerializer(a).data
            d["class_name"] = a.class_ref.name if a.class_ref else None
            d["session_name"] = a.session.name if a.session else None
            data.append(d)
        return data


class ReportCardSectionViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrTeacherReadOnly]

    def update(self, request, pk=None):
        from academics.models import ReportCardSection
        serializer = ReportCardSectionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ReportCardSection.objects.filter(pk=pk).update(**serializer.validated_data)
        obj = ReportCardSection.objects.get(pk=pk)
        return Response(ReportCardSectionSerializer(obj).data)

    def destroy(self, request, pk=None):
        from academics.models import ReportCardSection
        ReportCardSection.objects.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get", "post"], url_path="subject-groups")
    def subject_groups(self, request, pk=None):
        from academics.models import ReportCardSectionSubjectGroup
        if request.method == "GET":
            groups = ReportCardSectionSubjectGroup.objects.filter(section_id=pk).order_by("display_order")
            return Response([ReportCardSectionSubjectGroupSerializer(g).data for g in groups])
        serializer = ReportCardSectionSubjectGroupInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = ReportCardSectionSubjectGroup.objects.create(section_id=pk, **serializer.validated_data)
        return Response(ReportCardSectionSubjectGroupSerializer(obj).data, status=status.HTTP_201_CREATED)


class ReportCardSectionSubjectGroupViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrTeacherReadOnly]

    def destroy(self, request, pk=None):
        from academics.models import ReportCardSectionSubjectGroup
        ReportCardSectionSubjectGroup.objects.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReportCardTemplateAssignmentViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrTeacherReadOnly]

    def create(self, request):
        from academics.models import ReportCardTemplateAssignment
        serializer = ReportCardTemplateAssignmentInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = ReportCardTemplateAssignment.objects.create(**serializer.validated_data)
        return Response(ReportCardTemplateAssignmentSerializer(obj).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        from academics.models import ReportCardTemplateAssignment
        ReportCardTemplateAssignment.objects.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TeacherAssignmentViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrTeacherReadOnly]
    service = AssignmentService()

    def list(self, request):
        teacher_id = request.query_params.get("teacher_id")
        session_id = request.query_params.get("session_id")
        class_id = request.query_params.get("class_id")

        if teacher_id and session_id:
            assignments = self.service.get_teacher_assignments(teacher_id, session_id)
        elif class_id and session_id:
            assignments = self.service.get_class_assignments(class_id, session_id)
        else:
            assignments = self.service.repo.list_all()

        data = [TeacherAssignmentOutputSerializer(a).data for a in assignments]
        return Response(data)

    def retrieve(self, request, pk=None):
        obj = self.service.repo.get_by_id(pk)
        if not obj:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(TeacherAssignmentOutputSerializer(obj).data)

    def create(self, request):
        serializer = TeacherAssignmentInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assignment = self.service.assign_teacher(**serializer.validated_data)
        return Response(
            TeacherAssignmentOutputSerializer(assignment).data,
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, pk=None):
        self.service.remove_assignment(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)




