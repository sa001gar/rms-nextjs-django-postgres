"""DRF ViewSets for the enrollments module."""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import IsAdmin
from enrollments.models import Student, Enrollment, ClassTeacher, SystemSetting
from enrollments.api.serializers import (
    StudentSerializer,
    EnrollmentSerializer,
    EnrollmentCreateSerializer,
    EnrollmentBulkCreateSerializer,
    ClassTeacherSerializer,
)
from enrollments.services.student_service import StudentService
from enrollments.services.enrollment_service import EnrollmentService
from enrollments.services.classteacher_service import ClassTeacherService


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsAdmin]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._service = StudentService()

    def create(self, request, *args, **kwargs):
        class_id = request.data.get("class_id")
        session_id = request.data.get("session_id")
        section_id = request.data.get("section_id")
        roll_no = request.data.get("roll_no", "")

        serializer = StudentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = self._service.create(
            class_id=class_id,
            session_id=session_id,
            section_id=section_id,
            roll_no=roll_no,
            **serializer.validated_data
        )
        return Response(StudentSerializer(student).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        student = self._service.get_by_id(kwargs["pk"])
        if student is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        
        class_id = request.data.get("class_id")
        session_id = request.data.get("session_id")
        section_id = request.data.get("section_id")
        roll_no = request.data.get("roll_no")

        serializer = StudentSerializer(data=request.data, partial=kwargs.get("partial", False))
        serializer.is_valid(raise_exception=True)
        updated = self._service.update(
            student.id,
            class_id=class_id,
            session_id=session_id,
            section_id=section_id,
            roll_no=roll_no,
            **serializer.validated_data
        )
        return Response(StudentSerializer(updated).data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def list(self, request, *args, **kwargs):
        query = request.query_params.get("search", "")
        if query:
            qs = self._service.search_by_name(query)
        else:
            qs = self._service.list_all()
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(StudentSerializer(page, many=True).data)
        return Response(StudentSerializer(qs, many=True).data)

    def retrieve(self, request, *args, **kwargs):
        student = self._service.get_by_id(kwargs["pk"])
        if student is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(StudentSerializer(student).data)

    def destroy(self, request, *args, **kwargs):
        student = self._service.get_by_id(kwargs["pk"])
        if student is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        student.is_active = False
        student.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"], url_path="generate-id")
    def generate_student_id(self, request, *args, **kwargs):
        student_id = StudentService().generate_student_id()
        return Response({"student_id": student_id})

    @action(detail=False, methods=["get"], url_path="get-id-pattern")
    def get_id_pattern(self, request, *args, **kwargs):
        try:
            setting = SystemSetting.objects.get(key="student_id_pattern")
            pattern = setting.value
        except SystemSetting.DoesNotExist:
            pattern = "STU_{year}_{rand:6}"
        return Response({"pattern": pattern})

    @action(detail=False, methods=["post"], url_path="set-id-pattern")
    def set_id_pattern(self, request, *args, **kwargs):
        pattern = request.data.get("pattern", "STU_{year}_{rand:6}")
        setting, _ = SystemSetting.objects.update_or_create(
            key="student_id_pattern",
            defaults={"value": pattern}
        )
        return Response({"pattern": setting.value})


class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAdmin]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._service = EnrollmentService()

    def create(self, request, *args, **kwargs):
        serializer = EnrollmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        enrollment = self._service.enroll(
            student_id=data["student"],
            session_id=data["session"],
            class_id=data["class_field"],
            section_id=data["section"],
            roll_no=data.get("roll_no", "")
        )
        return Response(EnrollmentSerializer(enrollment).data, status=status.HTTP_201_CREATED)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(EnrollmentSerializer(page, many=True).data)
        return Response(EnrollmentSerializer(queryset, many=True).data)

    def retrieve(self, request, *args, **kwargs):
        enrollment = self._service.repo.get_by_id(kwargs["pk"])
        if enrollment is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(EnrollmentSerializer(enrollment).data)

    @action(detail=True, methods=["post"], url_path="promote")
    def promote(self, request, *args, **kwargs):
        enrollment = self._service.repo.get_by_id(kwargs["pk"])
        if enrollment is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        new_enrollment = self._service.promote(
            enrollment.id,
            new_class_id=request.data["class_field"],
            new_section_id=request.data["section"],
            new_session_id=request.data["session"],
            new_roll_no=request.data.get("roll_no", ""),
        )
        return Response(EnrollmentSerializer(new_enrollment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="retain")
    def retain(self, request, *args, **kwargs):
        enrollment = self._service.repo.get_by_id(kwargs["pk"])
        if enrollment is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        new_enrollment = self._service.retain(
            enrollment.id,
            new_session_id=request.data["session"],
            new_roll_no=request.data.get("roll_no", ""),
        )
        return Response(EnrollmentSerializer(new_enrollment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="transfer-out")
    def transfer_out(self, request, *args, **kwargs):
        enrollment = self._service.repo.get_by_id(kwargs["pk"])
        if enrollment is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        self._service.transfer_out(enrollment.id, remarks=request.data.get("remarks", ""))
        return Response(status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="bulk-enroll")
    def bulk_enroll(self, request, *args, **kwargs):
        serializer = EnrollmentBulkCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        enrollments = self._service.bulk_enroll(
            student_ids=data["student_ids"],
            session_id=data["session"],
            class_id=data["class_field"],
            section_id=data["section"],
            roll_nos=data.get("roll_nos", {}),
        )
        return Response(
            EnrollmentSerializer(enrollments, many=True).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="active")
    def get_active(self, request, *args, **kwargs):
        student_id = request.query_params.get("student_id")
        session_id = request.query_params.get("session_id")
        if not student_id or not session_id:
            return Response(
                {"detail": "student_id and session_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        enrollment = self._service.get_active_enrollment(student_id, session_id)
        if enrollment is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(EnrollmentSerializer(enrollment).data)


class ClassTeacherViewSet(viewsets.ModelViewSet):
    queryset = ClassTeacher.objects.all()
    serializer_class = ClassTeacherSerializer
    permission_classes = [IsAdmin]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._service = ClassTeacherService()

    def create(self, request, *args, **kwargs):
        serializer = ClassTeacherSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        ct = self._service.assign(
            teacher_id=data["teacher"].id if hasattr(data["teacher"], "id") else data["teacher"],
            class_id=data["class_field"].id if hasattr(data["class_field"], "id") else data["class_field"],
            section_id=data["section"].id if hasattr(data["section"], "id") else data["section"],
            session_id=data["session"].id if hasattr(data["session"], "id") else data["session"],
        )
        return Response(ClassTeacherSerializer(ct).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        self._service.remove(kwargs["pk"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"], url_path="by-session")
    def list_for_session(self, request, *args, **kwargs):
        session_id = request.query_params.get("session_id")
        if not session_id:
            return Response(
                {"detail": "session_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        qs = self._service.list_for_session(session_id)
        return Response(ClassTeacherSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="check")
    def is_class_teacher(self, request, *args, **kwargs):
        teacher_id = request.query_params.get("teacher_id")
        class_id = request.query_params.get("class_id")
        section_id = request.query_params.get("section_id")
        session_id = request.query_params.get("session_id")
        if not all([teacher_id, class_id, section_id, session_id]):
            return Response(
                {"detail": "teacher_id, class_id, section_id, and session_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = self._service.is_class_teacher(teacher_id, class_id, section_id, session_id)
        return Response({"is_class_teacher": result})
