"""Pure computation service for report cards — zero DB writes."""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal
from uuid import UUID

import structlog
from django.db.models import Prefetch

from academics.models import (
    Exam,
    ExamComponent,
    AssessmentComponentConfig,
    GradeRule,
    GradeScale,
    PromotionRule,
    ReportCardTemplate,
    SubjectCategory,
)
from enrollments.models import Enrollment
from results.models import MarksEntry, StudentRemarks
from reporting.types import (
    AttendanceData,
    CoScholasticData,
    ComponentMarksData,
    ExamGroupData,
    GradingScaleEntry,
    RemarkData,
    ReportCardData,
    SchoolInfo,
    SessionInfo,
    SignatureData,
    StudentInfo,
    SubjectResultData,
    SummaryData,
)

logger = structlog.get_logger(__name__)


class ReportCardComputationService:
    """Pure computation engine. Takes raw data, returns ReportCardData."""

    def generate(
        self,
        enrollment_id: UUID,
        template_id: UUID | None = None,
    ) -> ReportCardData:
        enrollment = (
            Enrollment.objects.select_related(
                "student", "session", "class_field", "section"
            )
            .get(id=enrollment_id)
        )

        session_id = enrollment.session_id
        class_id = enrollment.class_field_id
        section_id = enrollment.section_id

        # 1. Load template
        template = self._resolve_template(class_id, template_id)

        # 2. Load all marks for this enrollment
        marks_qs = MarksEntry.objects.filter(enrollment=enrollment).select_related(
            "exam_component",
            "exam_component__exam",
            "subject",
            "subject__subject_category",
        )

        # 3. Load exam component mappings for context (full_marks overrides, weightages)
        mappings = self._load_mappings(class_id, marks_qs)

        # 4. Load grade policy
        grade_scale = self._resolve_grade_scale(session_id)

        # 5. Load promotion rule for this class
        promotion_rule = PromotionRule.objects.filter(
            session_id=session_id, from_class_id=class_id
        ).first()

        # 6. Load remarks
        remarks_qs = StudentRemarks.objects.filter(
            enrollment=enrollment, session_id=session_id
        )

        # ─── Computation ───

        # Group marks by subject
        marks_by_subject: dict[UUID, list[MarksEntry]] = defaultdict(list)
        for m in marks_qs:
            marks_by_subject[m.subject_id].append(m)

        # Build subject results
        scholastic_subjects: list[SubjectResultData] = []
        co_scholastic_items: list[CoScholasticData] = []

        for subject_id, subject_marks in marks_by_subject.items():
            if not subject_marks:
                continue
            sample = subject_marks[0]
            subject = sample.subject
            cat = subject.subject_category

            result = self._compute_subject_result(
                subject=subject,
                marks_entries=subject_marks,
                mappings=mappings.get(subject_id, {}),
                grade_scale=grade_scale,
            )

            if cat and not cat.is_scholastic:
                co_scholastic_items.append(CoScholasticData(
                    subject_name=subject.name,
                    grade=result.overall_grade,
                    grade_point=result.overall_grade_point,
                ))
            else:
                scholastic_subjects.append(result)

        # Sort by subject code
        scholastic_subjects.sort(key=lambda s: s.subject_code)
        co_scholastic_items.sort(key=lambda c: c.subject_name)

        # Compute overall summary for scholastic subjects
        summary = self._compute_overall_summary(
            scholastic_subjects, grade_scale, promotion_rule, enrollment.session_id
        )

        # Build attendance summary
        attendance_data = self._compute_attendance(enrollment_id)

        # Build grading scale
        grading_scale = self._build_grading_scale(grade_scale)

        # Build remarks
        remarks = [
            RemarkData(remark_type=r.remark_type, content=r.content)
            for r in remarks_qs
        ]

        return ReportCardData(
            school=SchoolInfo(name=""),
            student=StudentInfo(
                id=enrollment.student.student_id,
                name=enrollment.student.name,
                roll_no=enrollment.roll_no,
                registration_number=enrollment.student.registration_number or "",
                father_name=enrollment.student.father_name or "",
                mother_name=enrollment.student.mother_name or "",
                class_name=enrollment.class_field.name,
                section_name=enrollment.section.name,
                date_of_birth=enrollment.student.date_of_birth,
            ),
            session=SessionInfo(
                id=enrollment.session_id,
                name=enrollment.session.name,
            ),
            template_id=str(template.id) if template else None,
            attendance=attendance_data,
            subjects=scholastic_subjects,
            co_scholastic=co_scholastic_items,
            summary=summary,
            remarks=remarks,
            grading_scale=grading_scale,
            signatures=[
                SignatureData(role="class_teacher", label="Class Teacher"),
                SignatureData(role="principal", label="Principal"),
                SignatureData(role="parent", label="Parent's Signature"),
            ],
        )

    def generate_for_class(
        self,
        class_id: UUID,
        section_id: UUID,
        session_id: UUID,
    ) -> list[ReportCardData]:
        enrollments = list(
            Enrollment.objects.filter(
                class_field_id=class_id,
                section_id=section_id,
                session_id=session_id,
                status="active",
            )
            .select_related("student", "session", "class_field", "section")
            .order_by("roll_no")
        )

        enrollment_ids = [e.id for e in enrollments]

        # Single query for all marks
        all_marks = list(
            MarksEntry.objects.filter(enrollment_id__in=enrollment_ids)
            .select_related(
                "exam_component",
                "exam_component__exam",
                "subject",
                "subject__subject_category",
                "enrollment",
            )
        )

        marks_by_enrollment: dict[UUID, list[MarksEntry]] = defaultdict(list)
        for m in all_marks:
            marks_by_enrollment[m.enrollment_id].append(m)

        results = []
        for enrollment in enrollments:
            data = self._compute_from_loaded(
                enrollment=enrollment,
                marks_list=marks_by_enrollment.get(enrollment.id, []),
                session_id=session_id,
                class_id=class_id,
            )
            results.append(data)

        return results

    # ─── Internal helpers ───

    def _compute_from_loaded(
        self,
        enrollment: Enrollment,
        marks_list: list[MarksEntry],
        session_id: UUID,
        class_id: UUID,
    ) -> ReportCardData:
        mappings = self._load_mappings(class_id, marks_list)
        grade_scale = self._resolve_grade_scale(session_id)
        promotion_rule = PromotionRule.objects.filter(
            session_id=session_id, from_class_id=class_id
        ).first()

        marks_by_subject: dict[UUID, list[MarksEntry]] = defaultdict(list)
        for m in marks_list:
            marks_by_subject[m.subject_id].append(m)

        scholastic_subjects: list[SubjectResultData] = []
        co_scholastic_items: list[CoScholasticData] = []

        for subject_id, subject_marks in marks_by_subject.items():
            if not subject_marks:
                continue
            sample = subject_marks[0]
            subject = sample.subject
            cat = subject.subject_category

            result = self._compute_subject_result(
                subject=subject,
                marks_entries=subject_marks,
                mappings=mappings.get(subject_id, {}),
                grade_scale=grade_scale,
            )

            if cat and not cat.is_scholastic:
                co_scholastic_items.append(CoScholasticData(
                    subject_name=subject.name,
                    grade=result.overall_grade,
                    grade_point=result.overall_grade_point,
                ))
            else:
                scholastic_subjects.append(result)

        scholastic_subjects.sort(key=lambda s: s.subject_code)

        summary = self._compute_overall_summary(
            scholastic_subjects, grade_scale, promotion_rule, session_id
        )

        return ReportCardData(
            school=SchoolInfo(name=""),
            student=StudentInfo(
                id=enrollment.student.student_id,
                name=enrollment.student.name,
                roll_no=enrollment.roll_no,
                registration_number=enrollment.student.registration_number or "",
                class_name=enrollment.class_field.name,
                section_name=enrollment.section.name,
            ),
            session=SessionInfo(id=enrollment.session_id, name=enrollment.session.name),
            subjects=scholastic_subjects,
            co_scholastic=co_scholastic_items,
            summary=summary,
        )

    def _resolve_template(
        self,
        class_id: UUID,
        template_id: UUID | None,
    ) -> ReportCardTemplate | None:
        if template_id:
            return ReportCardTemplate.objects.filter(id=template_id).first()
        return ReportCardTemplate.objects.filter(
            assignments__class_ref_id=class_id, is_default=True
        ).first()

    def _load_mappings(
        self,
        class_id: UUID,
        marks_list: list[MarksEntry],
    ) -> dict[UUID, dict[UUID, AssessmentComponentConfig]]:
        subject_ids = {m.subject_id for m in marks_list}
        qs = AssessmentComponentConfig.objects.filter(
            class_ref_id=class_id,
            subject_id__in=subject_ids,
            is_applicable=True,
        ).select_related("assessment_component")
        mappings: dict[UUID, dict[UUID, AssessmentComponentConfig]] = defaultdict(dict)
        for m in qs:
            mappings[m.subject_id][m.assessment_component_id] = m
        return dict(mappings)

    def _resolve_grade_scale(
        self, session_id: UUID
    ) -> list[GradeRule]:
        scale = GradeScale.objects.filter(
            session_id=session_id, is_active=True
        ).first()
        if not scale:
            scale = GradeScale.objects.filter(
                session_id__isnull=True, is_active=True
            ).first()
        if not scale:
            return []
        return list(
            GradeRule.objects.filter(grade_scale=scale)
            .order_by("-min_percentage")
        )

    def _compute_subject_result(
        self,
        subject,
        marks_entries: list[MarksEntry],
        mappings: dict,
        grade_scale: list[GradeRule],
    ) -> SubjectResultData:
        # Group marks by exam
        by_exam: dict[UUID, list[MarksEntry]] = defaultdict(list)
        for m in marks_entries:
            by_exam[m.exam_component.exam_id].append(m)

        cat = subject.subject_category
        exam_groups: list[ExamGroupData] = []

        for exam_id, exam_marks in by_exam.items():
            sample = exam_marks[0]
            exam = sample.exam_component.exam

            components: list[ComponentMarksData] = []
            for m in exam_marks:
                mapping = mappings.get(m.exam_component_id)
                full = mapping.full_marks if mapping else m.exam_component.full_marks
                weightage = mapping.weightage_pct if mapping else Decimal("100.00")
                components.append(ComponentMarksData(
                    component_id=m.exam_component_id,
                    name=m.exam_component.name,
                    code=m.exam_component.code or m.exam_component.name,
                    obtained=m.obtained_marks if not m.is_absent else Decimal("0"),
                    full=full,
                    is_absent=m.is_absent,
                    is_grade_only=m.is_grade_only,
                    weightage_pct=weightage,
                ))

            total_obtained = sum(c.obtained for c in components)
            total_full = sum(c.full for c in components)
            pct = (
                round((total_obtained / total_full) * Decimal("100"), 2)
                if total_full > 0 else None
            )
            grade_label, grade_point = self._lookup_grade(pct, grade_scale)

            exam_groups.append(ExamGroupData(
                exam_id=exam.id,
                exam_name=exam.name,
                display_order=exam.display_order,
                components=components,
                total_obtained=total_obtained,
                total_full=total_full,
                percentage=pct,
                grade=grade_label,
                grade_point=grade_point,
            ))

        exam_groups.sort(key=lambda g: g.display_order)

        overall_obtained = sum(g.total_obtained for g in exam_groups)
        overall_full = sum(g.total_full for g in exam_groups)
        overall_pct = (
            round((overall_obtained / overall_full) * Decimal("100"), 2)
            if overall_full > 0 else None
        )
        overall_grade, overall_gp = self._lookup_grade(overall_pct, grade_scale)

        return SubjectResultData(
            subject_id=subject.id,
            subject_name=subject.name,
            subject_code=subject.code,
            category_code=cat.code if cat else None,
            category_name=cat.name if cat else None,
            exam_groups=exam_groups,
            total_obtained=overall_obtained,
            total_full=overall_full,
            overall_percentage=overall_pct,
            overall_grade=overall_grade,
            overall_grade_point=overall_gp,
            is_scholastic=cat.is_scholastic if cat else True,
        )

    def _compute_overall_summary(
        self,
        subject_results: list[SubjectResultData],
        grade_scale: list[GradeRule],
        promotion_rule: PromotionRule | None,
        session_id: UUID,
    ) -> SummaryData:
        scholastic = [s for s in subject_results if s.is_scholastic]
        total_obtained = sum(s.total_obtained for s in scholastic)
        total_full = sum(s.total_full for s in scholastic)
        pct = (
            round((total_obtained / total_full) * Decimal("100"), 2)
            if total_full > 0 else None
        )
        grade, gp = self._lookup_grade(pct, grade_scale)

        promotion_status = ""
        if promotion_rule:
            subjects_below_min = sum(
                1 for s in scholastic
                if s.overall_percentage is not None
                and s.overall_percentage < promotion_rule.min_percentage
            )
            if subjects_below_min <= promotion_rule.max_subjects_fail and pct is not None and pct >= promotion_rule.min_percentage:
                promotion_status = "promoted"
            else:
                promotion_status = "retained"

        return SummaryData(
            total_marks_obtained=total_obtained,
            total_marks_full=total_full,
            overall_percentage=pct,
            overall_grade=grade,
            overall_grade_point=gp,
            promotion_status=promotion_status,
        )

    def _compute_attendance(self, enrollment_id: UUID) -> list[AttendanceData]:
        try:
            from attendance.models import TermAttendance
            records = TermAttendance.objects.filter(enrollment_id=enrollment_id).select_related("term")
            data = []
            overall_present = 0
            overall_total = 0
            for r in records:
                data.append(AttendanceData(
                    exam_name=r.term.name if hasattr(r, "term") and r.term else None,
                    present=r.present_days,
                    total=r.total_days,
                    percentage=round((Decimal(str(r.present_days)) / Decimal(str(r.total_days))) * Decimal("100"), 2) if r.total_days > 0 else Decimal("0"),
                ))
                overall_present += r.present_days
                overall_total += r.total_days
            if data:
                data.append(AttendanceData(
                    exam_name="Overall",
                    present=overall_present,
                    total=overall_total,
                    percentage=round((Decimal(str(overall_present)) / Decimal(str(overall_total))) * Decimal("100"), 2) if overall_total > 0 else Decimal("0"),
                ))
            return data
        except Exception:
            return []

    def _build_grading_scale(self, grade_scale: list[GradeRule]) -> list[GradingScaleEntry]:
        return [
            GradingScaleEntry(
                grade=g.label,
                min_percentage=g.min_percentage,
                max_percentage=g.max_percentage,
                grade_point=g.grade_point,
            )
            for g in sorted(grade_scale, key=lambda x: x.display_order)
        ]

    def _lookup_grade(
        self,
        percentage: Decimal | None,
        grade_scale: list[GradeRule],
    ) -> tuple[str, Decimal]:
        if percentage is None:
            return "", Decimal("0")
        for g in grade_scale:
            if g.min_percentage <= percentage <= g.max_percentage:
                return g.label, g.grade_point
        return "", Decimal("0")
