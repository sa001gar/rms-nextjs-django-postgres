"""Dashboard API views for admin, teacher, and student dashboards."""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsAdmin, IsTeacher, IsStudent


class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from django.contrib.auth import get_user_model
        from enrollments.models import Student, Enrollment
        from academics.models import AcademicSession, Class, Section, TeacherAssignment
        from identity.models import TeacherProfile
        from django.db.models import Count, Q

        User = get_user_model()
        active_session = AcademicSession.objects.filter(is_active=True).first()

        stats = {
            "total_students": Student.objects.filter(is_active=True).count(),
            "total_teachers": TeacherProfile.objects.count(),
            "total_classes": Class.objects.count(),
            "total_sections": Section.objects.count(),
            "total_sessions": AcademicSession.objects.count(),
            "active_session": {
                "id": str(active_session.id),
                "name": active_session.name,
                "start_date": str(active_session.start_date),
                "end_date": str(active_session.end_date),
            } if active_session else None,
        }

        # Enrollment stats for active session
        if active_session:
            enrollment_stats = Enrollment.objects.filter(
                session=active_session, status="active"
            ).aggregate(
                total=Count("id"),
                promoted=Count("id", filter=Q(status="promoted")),
                retained=Count("id", filter=Q(status="retained")),
                transferred=Count("id", filter=Q(status="transferred")),
            )
            stats["enrollment_stats"] = enrollment_stats

            # Class-wise student distribution
            class_distribution = (
                Enrollment.objects.filter(session=active_session, status="active")
                .values("class_field__name")
                .annotate(student_count=Count("id"))
                .order_by("class_field__name")
            )
            stats["class_distribution"] = list(class_distribution)

        # Recent activity
        from core.models_audit import AuditLog
        recent_logs = AuditLog.objects.all()[:10]
        stats["recent_activity"] = [
            {
                "action": log.action,
                "entity_type": log.entity_type,
                "created_at": str(log.created_at),
                "user": str(log.user) if log.user else None,
            }
            for log in recent_logs
        ]

        return Response(stats)


class TeacherDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request):
        from academics.models import TeacherAssignment, AcademicSession
        from enrollments.models import Enrollment, ClassTeacher
        from results.models import MarksEntry
        from django.db.models import Count

        active_session = AcademicSession.objects.filter(is_active=True).first()
        teacher_profile = request.user.teacher_profile

        if not teacher_profile:
            return Response({"error": "Teacher profile not found"}, status=404)

        stats = {}

        # Assigned subjects and classes
        assignments = TeacherAssignment.objects.filter(
            teacher=teacher_profile,
            session=active_session,
            is_active=True,
        ) if active_session else TeacherAssignment.objects.none()

        # Dedicated lists for select filters
        teachers_sessions_map = {}
        teachers_classes = {}
        teachers_sections = {}
        teachers_subjects = {}

        for a in assignments:
            if a.session_id:
                teachers_sessions_map[str(a.session_id)] = a.session.name if a.session else ""
            if a.class_ref_id:
                teachers_classes[str(a.class_ref_id)] = a.class_ref.name if a.class_ref else ""
            if a.section_id:
                teachers_sections[str(a.section_id)] = a.section.name if a.section else ""
            if a.subject_id:
                teachers_subjects[str(a.subject_id)] = a.subject.name if a.subject else ""

        stats["teachers_sessions"] = [
            {"id": k, "name": v} for k, v in teachers_sessions_map.items()
        ]
        stats["teachers_classes"] = [
            {"id": k, "name": v} for k, v in teachers_classes.items()
        ]
        stats["teachers_sections"] = [
            {"id": k, "name": v} for k, v in teachers_sections.items()
        ]
        stats["teachers_subjects"] = [
            {"id": k, "name": v} for k, v in teachers_subjects.items()
        ]

        # Also add ids to the assigned_subjects list
        assigned_subjects_with_ids = [
            {
                "id": str(a.id),
                "class_id": str(a.class_ref_id) if a.class_ref_id else None,
                "class_name": a.class_ref.name if a.class_ref else "",
                "section_id": str(a.section_id) if a.section_id else None,
                "section_name": a.section.name if a.section else "",
                "subject_id": str(a.subject_id) if a.subject_id else None,
                "subject_name": a.subject.name if a.subject else "",
                "session_id": str(a.session_id) if a.session_id else None,
                "session_name": a.session.name if a.session else "",
            }
            for a in assignments
        ]
        stats["assigned_subjects"] = assigned_subjects_with_ids
        stats["total_assigned_subjects"] = len(assigned_subjects_with_ids)

        # Classes where teacher is class teacher
        class_teacher_of = ClassTeacher.objects.filter(
            teacher=teacher_profile,
            session=active_session,
            is_active=True,
        ) if active_session else ClassTeacher.objects.none()

        stats["class_teacher_of"] = [
            {
                "id": str(ct.id),
                "class_name": ct.class_field.name if ct.class_field else "",
                "section_name": ct.section.name if ct.section else "",
            }
            for ct in class_teacher_of
        ]

        # Marks entered this session
        if active_session:
            marks_count = MarksEntry.objects.filter(
                entered_by=teacher_profile.user,
                enrollment__session=active_session,
            ).distinct().count()
        else:
            marks_count = 0

        stats["marks_entered"] = marks_count

        return Response(stats)


class StudentDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        from enrollments.models import Student, Enrollment
        from academics.models import AcademicSession
        from reporting.services.ranking_service import RankingService

        active_session = AcademicSession.objects.filter(is_active=True).first()
        student = Student.objects.filter(user=request.user).first()

        if not student:
            return Response({"error": "Student profile not found"}, status=404)

        stats = {}

        # Current enrollment
        current_enrollment = None
        if active_session:
            current_enrollment = Enrollment.objects.filter(
                student=student,
                session=active_session,
                status="active",
            ).select_related("class_field", "section").first()

        if current_enrollment:
            stats["current_class"] = current_enrollment.class_field.name
            stats["current_section"] = current_enrollment.section.name if current_enrollment.section else ""
            stats["roll_no"] = current_enrollment.roll_no

        # Percentage and grade
        ranking_svc = RankingService()
        if current_enrollment and active_session:
            rank_data = ranking_svc.get_student_rank(
                student_id=student.id,
                session_id=active_session.id,
            )
            stats["percentage"] = rank_data.get("percentage")
            stats["grade"] = rank_data.get("grade")
            stats["rank"] = rank_data.get("rank")
            stats["total_students"] = rank_data.get("total_students")
        else:
            stats["percentage"] = None
            stats["grade"] = None
            stats["rank"] = None
            stats["total_students"] = None

        # Subject-wise performance
        from results.models import SubjectResult
        if active_session:
            subject_results = SubjectResult.objects.filter(
                enrollment__student=student,
                enrollment__session=active_session,
            ).select_related("subject")
            stats["subject_performance"] = [
                {
                    "subject": sr.subject.name if sr.subject else "",
                    "marks_obtained": sr.total_obtained,
                    "max_marks": sr.total_full,
                    "percentage": sr.percentage,
                    "grade": sr.grade,
                }
                for sr in subject_results
            ]
        else:
            stats["subject_performance"] = []

        return Response(stats)
