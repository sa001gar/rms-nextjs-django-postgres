"""URL configuration for academics API."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from academics.api.views import (
    AcademicSessionViewSet,
    ClassViewSet,
    SubjectViewSet,
    TeacherAssignmentViewSet,
    ExamViewSet,
    ExamComponentViewSet,
    AssessmentComponentConfigViewSet,
    GradeScaleViewSet,
    GradeRuleViewSet,
    PromotionRuleViewSet,
    ReportCardTemplateViewSet,
    TermViewSet,
    SubjectCategoryViewSet,
    ReportCardSectionViewSet,
    ReportCardSectionSubjectGroupViewSet,
    ReportCardTemplateAssignmentViewSet,
)
from academics.api.config_views import ResultConfigView, SubjectGroupListView

router = DefaultRouter()
router.register(r"sessions", AcademicSessionViewSet, basename="sessions")
router.register(r"terms", TermViewSet, basename="terms")
router.register(r"classes", ClassViewSet, basename="classes")
router.register(r"subjects", SubjectViewSet, basename="subjects")
router.register(r"subject-categories", SubjectCategoryViewSet, basename="subject-categories")
router.register(r"teacher-assignments", TeacherAssignmentViewSet, basename="teacher-assignments")
router.register(r"exams", ExamViewSet, basename="exams")
router.register(r"exam-components", ExamComponentViewSet, basename="exam-components")
router.register(r"assessment-component-configs", AssessmentComponentConfigViewSet, basename="assessment-component-configs")
router.register(r"grade-scales", GradeScaleViewSet, basename="grade-scales")
router.register(r"grade-rules", GradeRuleViewSet, basename="grade-rules")
router.register(r"promotion-rules", PromotionRuleViewSet, basename="promotion-rules")
router.register(r"report-card-templates", ReportCardTemplateViewSet, basename="report-card-templates")
router.register(r"report-card-sections", ReportCardSectionViewSet, basename="report-card-sections")
router.register(r"report-card-section-subject-groups", ReportCardSectionSubjectGroupViewSet, basename="report-card-section-subject-groups")
router.register(r"report-card-template-assignments", ReportCardTemplateAssignmentViewSet, basename="report-card-template-assignments")

urlpatterns = [
    path("", include(router.urls)),
    # ── New aggregate endpoints ──
    path("result-config/<uuid:session_id>/<uuid:class_id>/", ResultConfigView.as_view(), name="result-config"),
    path("subject-groups/", SubjectGroupListView.as_view(), name="subject-groups"),
]
