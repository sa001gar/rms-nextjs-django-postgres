"""DRF serializers for the enrollments module."""

from rest_framework import serializers

from enrollments.models import Student, Enrollment, ClassTeacher


class StudentSerializer(serializers.ModelSerializer):
    class_info = serializers.SerializerMethodField()
    section_info = serializers.SerializerMethodField()
    session_info = serializers.SerializerMethodField()
    roll_no = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            "id",
            "student_id",
            "registration_number",
            "name",
            "date_of_birth",
            "father_name",
            "mother_name",
            "guardian_name",
            "guardian_relation",
            "phone",
            "alternate_phone",
            "email",
            "profile_pic",
            "address",
            "admission_date",
            "admission_class",
            "admission_session",
            "is_active",
            "created_at",
            "updated_at",
            "class_info",
            "section_info",
            "session_info",
            "roll_no",
        ]
        read_only_fields = ["id", "student_id", "created_at", "updated_at"]

    def get_latest_enrollment(self, obj):
        if not hasattr(self, "_latest_enrollment_cache"):
            self._latest_enrollment_cache = {}
        if obj.id not in self._latest_enrollment_cache:
            self._latest_enrollment_cache[obj.id] = obj.enrollments.select_related(
                "class_field", "section", "session"
            ).order_by("-session__start_date").first()
        return self._latest_enrollment_cache[obj.id]

    def get_class_info(self, obj):
        enrollment = self.get_latest_enrollment(obj)
        if enrollment and enrollment.class_field:
            return {"id": str(enrollment.class_field.id), "name": enrollment.class_field.name}
        return None

    def get_section_info(self, obj):
        enrollment = self.get_latest_enrollment(obj)
        if enrollment and enrollment.section:
            return {"id": str(enrollment.section.id), "name": enrollment.section.name}
        return None

    def get_session_info(self, obj):
        enrollment = self.get_latest_enrollment(obj)
        if enrollment and enrollment.session:
            return {"id": str(enrollment.session.id), "name": enrollment.session.name}
        return None

    def get_roll_no(self, obj):
        enrollment = self.get_latest_enrollment(obj)
        if enrollment:
            return enrollment.roll_no
        return ""



class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.name", read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "student",
            "student_name",
            "session",
            "class_field",
            "section",
            "roll_no",
            "status",
            "promoted_to",
            "promotion_date",
            "remarks",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "promoted_to", "promotion_date", "created_at", "updated_at"]


class EnrollmentCreateSerializer(serializers.Serializer):
    student = serializers.UUIDField()
    session = serializers.UUIDField()
    class_field = serializers.UUIDField()
    section = serializers.UUIDField()
    roll_no = serializers.CharField(required=False, default="", allow_blank=True)


class EnrollmentBulkCreateSerializer(serializers.Serializer):
    student_ids = serializers.ListField(child=serializers.UUIDField())
    session = serializers.UUIDField()
    class_field = serializers.UUIDField()
    section = serializers.UUIDField()
    roll_nos = serializers.DictField(required=False, default=dict)


class ClassTeacherSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source="teacher.name", read_only=True)

    class Meta:
        model = ClassTeacher
        fields = [
            "id",
            "teacher",
            "teacher_name",
            "class_field",
            "section",
            "session",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
