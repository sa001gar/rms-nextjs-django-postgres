"""DTOs for the new Report Card architecture."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from uuid import UUID


@dataclass
class ComponentMarksData:
    component_id: UUID
    name: str
    code: str
    obtained: Decimal
    full: Decimal
    is_absent: bool
    is_grade_only: bool
    weightage_pct: Decimal = Decimal("100.00")


@dataclass
class ExamGroupData:
    exam_id: UUID
    exam_name: str
    display_order: int
    components: list[ComponentMarksData] = field(default_factory=list)
    total_obtained: Decimal = Decimal("0")
    total_full: Decimal = Decimal("0")
    percentage: Decimal | None = None
    grade: str = ""
    grade_point: Decimal = Decimal("0")


@dataclass
class SubjectResultData:
    subject_id: UUID
    subject_name: str
    subject_code: str
    category_code: str | None = None
    category_name: str | None = None
    exam_groups: list[ExamGroupData] = field(default_factory=list)
    total_obtained: Decimal = Decimal("0")
    total_full: Decimal = Decimal("0")
    overall_percentage: Decimal | None = None
    overall_grade: str = ""
    overall_grade_point: Decimal = Decimal("0")
    is_scholastic: bool = True


@dataclass
class CoScholasticData:
    subject_name: str
    grade: str = ""
    grade_point: Decimal = Decimal("0")
    remarks: str = ""


@dataclass
class AttendanceData:
    exam_name: str | None = None
    present: int = 0
    total: int = 0
    percentage: Decimal = Decimal("0")


@dataclass
class RemarkData:
    remark_type: str
    content: str


@dataclass
class GradingScaleEntry:
    grade: str
    min_percentage: Decimal
    max_percentage: Decimal
    grade_point: Decimal


@dataclass
class SignatureData:
    role: str
    label: str
    name: str = ""


@dataclass
class SchoolInfo:
    name: str = ""


@dataclass
class StudentInfo:
    id: UUID | str = ""
    name: str = ""
    roll_no: str = ""
    registration_number: str = ""
    father_name: str = ""
    mother_name: str = ""
    class_name: str = ""
    section_name: str = ""
    date_of_birth: date | None = None


@dataclass
class SessionInfo:
    id: UUID | str = ""
    name: str = ""


@dataclass
class SummaryData:
    total_marks_obtained: Decimal = Decimal("0")
    total_marks_full: Decimal = Decimal("0")
    overall_percentage: Decimal | None = None
    overall_grade: str = ""
    overall_grade_point: Decimal = Decimal("0")
    promotion_status: str = ""
    rank_value: int | None = None
    rank_total: int | None = None


@dataclass
class ReportCardData:
    school: SchoolInfo = field(default_factory=SchoolInfo)
    student: StudentInfo = field(default_factory=StudentInfo)
    session: SessionInfo = field(default_factory=SessionInfo)
    template_id: str | None = None
    attendance: list[AttendanceData] = field(default_factory=list)
    attendance_overall: AttendanceData | None = None
    subjects: list[SubjectResultData] = field(default_factory=list)
    co_scholastic: list[CoScholasticData] = field(default_factory=list)
    discipline: CoScholasticData | None = None
    summary: SummaryData = field(default_factory=SummaryData)
    remarks: list[RemarkData] = field(default_factory=list)
    signatures: list[SignatureData] = field(default_factory=list)
    grading_scale: list[GradingScaleEntry] = field(default_factory=list)
