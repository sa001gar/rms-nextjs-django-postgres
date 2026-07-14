"""DRF views for result publication workflow."""

from uuid import UUID

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from core.permissions import IsAdmin
from results.services.publication_service import ResultPublicationService
from results.api.serializers import ResultPublicationSerializer


class ResultPublicationListView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        session_id = request.query_params.get("session_id")
        if not session_id:
            return Response(
                {"error": "session_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = ResultPublicationService()
        publications = service.list_by_session(UUID(session_id))
        return Response(ResultPublicationSerializer(publications, many=True).data)

    def post(self, request):
        service = ResultPublicationService()
        publication = service.create_publication(
            session_id=UUID(request.data["session_id"]),
            class_id=UUID(request.data["class_id"]),
            section_id=UUID(request.data["section_id"]),
            remarks=request.data.get("remarks", ""),
        )
        return Response(
            ResultPublicationSerializer(publication).data,
            status=status.HTTP_201_CREATED,
        )


class ResultPublicationDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, pk):
        from results.models import ResultPublication
        publication = ResultPublication.objects.filter(id=pk).first()
        if not publication:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(ResultPublicationSerializer(publication).data)


class ResultPublicationSubmitView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        service = ResultPublicationService()
        publication = service.submit_for_review(pk)
        if not publication:
            return Response(
                {"error": "Publication not found or cannot be submitted"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(ResultPublicationSerializer(publication).data)


class ResultPublicationPublishView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        service = ResultPublicationService()
        publication = service.publish(pk, request.user)
        if not publication:
            return Response(
                {"error": "Publication not found or cannot be published"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(ResultPublicationSerializer(publication).data)


class ResultPublicationUnpublishView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        service = ResultPublicationService()
        publication = service.unpublish(pk)
        if not publication:
            return Response(
                {"error": "Publication not found or cannot be unpublished"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(ResultPublicationSerializer(publication).data)


class ResultPublicationSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        session_id = request.query_params.get("session_id")
        if not session_id:
            return Response(
                {"error": "session_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = ResultPublicationService()
        summary = service.get_publication_status_summary(UUID(session_id))
        return Response(summary)
