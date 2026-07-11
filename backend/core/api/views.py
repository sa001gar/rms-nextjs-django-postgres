"""API views for authentication."""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from rest_framework import status

from core.services.auth_service import AuthService
from core.api.serializers import (
    LoginSerializer,
    LogoutSerializer,
    UserResponseSerializer,
)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from django.contrib.auth import get_user_model
        User = get_user_model()

        service = AuthService()
        result = service.login(
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )

        user = User.objects.get(id=result.user_id)
        user_data = UserResponseSerializer(user).data

        # Build role-specific profile data
        profile_data = None
        if result.role == "teacher":
            from identity.services.teacher_service import TeacherService
            svc = TeacherService()
            profile = svc.get_by_user_id(user.id)
            if profile:
                profile_data = {"id": str(profile.id), "name": profile.name, "email": user.email}
        elif result.role == "admin":
            from identity.services.admin_service import AdminService
            svc = AdminService()
            profile = svc.get_by_user_id(user.id)
            if profile:
                profile_data = {"id": str(profile.id), "name": profile.name, "email": user.email}
        elif result.role == "student":
            from enrollments.models import Student
            profile = Student.objects.filter(user=user).first()
            if profile:
                profile_data = {"id": str(profile.id), "student_id": profile.student_id, "name": profile.name}

        return Response({
            "access": result.access,
            "refresh": result.refresh,
            "user": user_data,
            "teacher": profile_data if result.role == "teacher" else None,
            "admin": profile_data if result.role == "admin" else None,
            "student": profile_data if result.role == "student" else None,
        })


class StudentLoginView(APIView):
    """Student login using student_id and password (DOB-based default)."""
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        student_id = request.data.get("student_id", "")
        password = request.data.get("password", "")

        if not student_id or not password:
            return Response(
                {"detail": "student_id and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from enrollments.models import Student
        student = Student.objects.filter(student_id=student_id).select_related("user").first()
        if not student or not student.user:
            return Response(
                {"detail": "Invalid student ID."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        from django.contrib.auth import authenticate
        user = authenticate(email=student.user.email, password=password)
        if user is None:
            return Response(
                {"detail": "Invalid password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"detail": "Account is disabled."},
                status=status.HTTP_403_FORBIDDEN,
            )

        service = AuthService()
        tokens = service.get_tokens_for_user(user)

        return Response({
            "access": tokens["access"],
            "refresh": tokens["refresh"],
            "student": {
                "id": str(student.id),
                "student_id": student.student_id,
                "name": student.name,
                "email": user.email,
            },
            "user": UserResponseSerializer(user).data,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AuthService()
        service.logout(serializer.validated_data["refresh"])

        return Response({"detail": "Logged out successfully."})


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        from identity.services.teacher_service import TeacherService
        from identity.services.admin_service import AdminService
        from enrollments.models import Student

        teacher = None
        admin = None
        student = None

        if user.role == "teacher":
            svc = TeacherService()
            teacher_profile = svc.get_by_user_id(user.id)
            if teacher_profile:
                teacher = {
                    "id": str(teacher_profile.id),
                    "name": teacher_profile.name,
                    "email": user.email,
                }
        elif user.role == "admin":
            svc = AdminService()
            admin_profile = svc.get_by_user_id(user.id)
            if admin_profile:
                admin = {
                    "id": str(admin_profile.id),
                    "name": admin_profile.name,
                    "email": user.email,
                }
        elif user.role == "student":
            student_profile = Student.objects.filter(user=user).first()
            if student_profile:
                student = {
                    "id": str(student_profile.id),
                    "student_id": student_profile.student_id,
                    "name": student_profile.name,
                    "email": user.email,
                }

        return Response({
            "user": UserResponseSerializer(user).data,
            "teacher": teacher,
            "admin": admin,
            "student": student,
        })


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "healthy", "version": "2.0.0"})
