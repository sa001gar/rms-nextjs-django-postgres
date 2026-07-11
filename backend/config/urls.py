"""URL configuration for RMS project."""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    # API Schema
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    # API v1
    path("api/v1/", include("core.api.urls")),
    path("api/v1/identity/", include("identity.api.urls")),
    path("api/v1/academics/", include("academics.api.urls")),
    path("api/v1/enrollments/", include("enrollments.api.urls")),
    path("api/v1/results/", include("results.api.urls")),
    path("api/v1/reporting/", include("reporting.api.urls")),
    path("api/v1/analytics/", include("analytics.api.urls")),
    path("api/v1/student/", include("student.api.urls")),
    path("api/v1/attendance/", include("attendance.api.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
