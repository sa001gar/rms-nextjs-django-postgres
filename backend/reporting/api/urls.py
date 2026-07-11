"""URL configuration for reporting API."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from reporting.api.views import MarksheetViewSet, RankingViewSet
from reporting.api.report_card_views import ReportCardViewSet
from reporting.api.export_views import (
    PDFReportCardView,
    PDFClassReportCardsView,
    ExcelMarksheetView,
    ExcelClassMarksheetView,
)

router = DefaultRouter()
router.register(r"report-cards", ReportCardViewSet, basename="report-cards")
router.register(r"marksheets", MarksheetViewSet, basename="marksheets")
router.register(r"rankings", RankingViewSet, basename="rankings")

urlpatterns = [
    path("", include(router.urls)),
    # Export endpoints
    path("export/pdf/student/<uuid:enrollment_id>/", PDFReportCardView.as_view(), name="pdf-report-card"),
    path("export/pdf/class/", PDFClassReportCardsView.as_view(), name="pdf-class-report-cards"),
    path("export/excel/student/<uuid:enrollment_id>/", ExcelMarksheetView.as_view(), name="excel-marksheet"),
    path("export/excel/class/", ExcelClassMarksheetView.as_view(), name="excel-class-marksheet"),
]
