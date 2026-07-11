from django.urls import path, include
from rest_framework.routers import DefaultRouter
from attendance.api.views import TermAttendanceViewSet

router = DefaultRouter()
router.register(r"term-attendance", TermAttendanceViewSet, basename="term-attendance")

urlpatterns = [
    path("", include(router.urls)),
]
