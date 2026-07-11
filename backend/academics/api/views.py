"""API views for academics module."""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import IsAdmin
from academics.services.session_service import SessionService
from academics.services.class_service import ClassService
from academics.services.subject_service import SubjectService
from academics.services.assessment_service import AssessmentService
from academics.services.grading_service import GradingService
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
    TermInputSerializer,
    TermOutputSerializer,
    AssessmentTypeInputSerializer,
    AssessmentTypeOutputSerializer,
    AssessmentWeightageInputSerializer,
    AssessmentWeightageOutputSerializer,
    GradePolicyInputSerializer,
    GradePolicyOutputSerializer,
    TeacherAssignmentInputSerializer,
    TeacherAssignmentOutputSerializer,
)


class AcademicSessionViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin]
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
    permission_classes = [IsAdmin]

    def list(self, request):
        from academics.models import Term
        session_id = request.query_params.get("session_id")
        qs = Term.objects.all()
        if session_id:
            qs = qs.filter(session_id=session_id)
        data = [TermOutputSerializer(t).data for t in qs]
        return Response(data)

    def retrieve(self, request, pk=None):
        from academics.models import Term
        obj = Term.objects.filter(pk=pk).first()
        if not obj:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(TermOutputSerializer(obj).data)

    def create(self, request):
        from academics.models import Term
        serializer = TermInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        term = Term.objects.create(**serializer.validated_data)
        return Response(
            TermOutputSerializer(term).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, pk=None):
        from academics.models import Term
        serializer = TermInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        Term.objects.filter(pk=pk).update(**serializer.validated_data)
        term = Term.objects.get(pk=pk)
        return Response(TermOutputSerializer(term).data)

    def partial_update(self, request, pk=None):
        from academics.models import Term
        serializer = TermInputSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        Term.objects.filter(pk=pk).update(**serializer.validated_data)
        term = Term.objects.get(pk=pk)
        return Response(TermOutputSerializer(term).data)

    def destroy(self, request, pk=None):
        from academics.models import Term
        Term.objects.filter(pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ClassViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin]
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
    permission_classes = [IsAdmin]
    service = SubjectService()

    def list(self, request):
        subject_type = request.query_params.get("type")
        if subject_type:
            subjects = self.service.list_by_type(subject_type)
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

    @action(detail=False, methods=["get"], url_path="by-type")
    def by_type(self, request):
        subject_type = request.query_params.get("type", "core")
        subjects = self.service.list_by_type(subject_type)
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


class AssessmentTypeViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin]
    service = AssessmentService()

    def list(self, request):
        types = self.service.list_active()
        data = [AssessmentTypeOutputSerializer(t).data for t in types]
        return Response(data)

    def retrieve(self, request, pk=None):
        obj = self.service.repo.get_by_id(pk)
        if not obj:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(AssessmentTypeOutputSerializer(obj).data)

    def create(self, request):
        serializer = AssessmentTypeInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        at = self.service.create_assessment_type(**serializer.validated_data)
        return Response(
            AssessmentTypeOutputSerializer(at).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, pk=None):
        serializer = AssessmentTypeInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        at = self.service.update(pk, **serializer.validated_data)
        return Response(AssessmentTypeOutputSerializer(at).data)

    def partial_update(self, request, pk=None):
        serializer = AssessmentTypeInputSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        at = self.service.update(pk, **serializer.validated_data)
        return Response(AssessmentTypeOutputSerializer(at).data)

    def destroy(self, request, pk=None):
        self.service.delete(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"], url_path="set-weightage")
    def set_weightage(self, request):
        serializer = AssessmentWeightageInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        w = self.service.set_weightage(**serializer.validated_data)
        return Response(
            AssessmentWeightageOutputSerializer(w).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="structure")
    def structure(self, request):
        class_id = request.query_params.get("class_id")
        subject_id = request.query_params.get("subject_id")
        if not class_id or not subject_id:
            return Response(
                {"detail": "class_id and subject_id query params required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        weightages = self.service.get_assessment_structure(class_id, subject_id)
        data = [AssessmentWeightageOutputSerializer(w).data for w in weightages]
        return Response(data)


class GradePolicyViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin]
    service = GradingService()

    def list(self, request):
        policies = self.service.get_all_policies()
        data = [GradePolicyOutputSerializer(p).data for p in policies]
        return Response(data)

    def retrieve(self, request, pk=None):
        from academics.models import GradePolicy
        obj = GradePolicy.objects.filter(id=pk).first()
        if not obj:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(GradePolicyOutputSerializer(obj).data)

    def create(self, request):
        serializer = GradePolicyInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        policy = self.service.upsert_policy(**serializer.validated_data)
        return Response(
            GradePolicyOutputSerializer(policy).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, pk=None):
        serializer = GradePolicyInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        policy = self.service.upsert_policy(**serializer.validated_data)
        return Response(GradePolicyOutputSerializer(policy).data)

    @action(detail=False, methods=["post"], url_path="calculate")
    def calculate(self, request):
        percentage = request.data.get("percentage")
        if percentage is None:
            return Response(
                {"detail": "percentage is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        label, point = self.service.calculate_grade(float(percentage))
        return Response({"grade_label": label, "grade_point": point})


class TeacherAssignmentViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin]
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


class MarksDistributionViewSet(viewsets.ViewSet):
    """Class-level marks distribution per assessment type."""
    permission_classes = [IsAdmin]

    def list(self, request):
        from academics.models import MarksDistribution
        qs = MarksDistribution.objects.select_related("class_ref", "assessment_type").all()
        data = [
            {
                "id": str(md.id),
                "class_id": str(md.class_ref_id),
                "class_name": md.class_ref.name,
                "assessment_type_id": str(md.assessment_type_id),
                "assessment_type_name": md.assessment_type.name,
                "full_marks": md.full_marks,
            }
            for md in qs
        ]
        return Response(data)

    @action(detail=False, methods=["post"], url_path="bulk-save")
    def bulk_save(self, request):
        """Bulk upsert marks distribution entries.
        
        Expected payload:
        {
          "entries": [
            {"class_id": "...", "assessment_type_id": "...", "full_marks": 40},
            ...
          ]
        }
        """
        from academics.models import MarksDistribution
        from django.db import transaction

        entries = request.data.get("entries", [])
        if not entries:
            return Response({"detail": "No entries provided."}, status=status.HTTP_400_BAD_REQUEST)

        results = []
        with transaction.atomic():
            for entry in entries:
                obj, _ = MarksDistribution.objects.update_or_create(
                    class_ref_id=entry["class_id"],
                    assessment_type_id=entry["assessment_type_id"],
                    defaults={"full_marks": entry.get("full_marks", 0)},
                )
                results.append({
                    "id": str(obj.id),
                    "class_id": str(obj.class_ref_id),
                    "assessment_type_id": str(obj.assessment_type_id),
                    "full_marks": obj.full_marks,
                })

        return Response(results, status=status.HTTP_200_OK)

