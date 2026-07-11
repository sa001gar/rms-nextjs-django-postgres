"""URL configuration for academics API."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from academics.api.views import (
    AcademicSessionViewSet,
    ClassViewSet,
    SubjectViewSet,
    AssessmentTypeViewSet,
    GradePolicyViewSet,
    TeacherAssignmentViewSet,
    TermViewSet,
    MarksDistributionViewSet,
)

router = DefaultRouter()
router.register(r"sessions", AcademicSessionViewSet, basename="sessions")
router.register(r"terms", TermViewSet, basename="terms")
router.register(r"classes", ClassViewSet, basename="classes")
router.register(r"subjects", SubjectViewSet, basename="subjects")
router.register(r"assessment-types", AssessmentTypeViewSet, basename="assessment-types")
router.register(r"grade-policies", GradePolicyViewSet, basename="grade-policies")
router.register(r"teacher-assignments", TeacherAssignmentViewSet, basename="teacher-assignments")
router.register(r"marks-distribution", MarksDistributionViewSet, basename="marks-distribution")

urlpatterns = [
    path("", include(router.urls)),
]
