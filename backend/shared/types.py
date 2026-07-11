"""Shared type definitions and DTOs."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from uuid import UUID


@dataclass(frozen=True)
class UserDTO:
    id: UUID
    email: str
    role: str
    first_name: str = ""
    last_name: str = ""
    is_active: bool = True


@dataclass(frozen=True)
class TeacherDTO:
    id: UUID
    user_id: UUID
    name: str
    email: str


@dataclass(frozen=True)
class AdminDTO:
    id: UUID
    user_id: UUID
    name: str
    email: str


@dataclass(frozen=True)
class SessionDTO:
    id: UUID
    name: str
    start_date: date
    end_date: date
    is_active: bool
    is_locked: bool


@dataclass(frozen=True)
class ClassDTO:
    id: UUID
    name: str
    level: int


@dataclass(frozen=True)
class SectionDTO:
    id: UUID
    name: str
    class_id: UUID


@dataclass(frozen=True)
class SubjectDTO:
    id: UUID
    name: str
    code: str
    subject_category_id: UUID | None = None
    subject_category_name: str | None = None


@dataclass(frozen=True)
class EnrollmentDTO:
    id: UUID
    student_id: UUID
    session_id: UUID
    class_id: UUID
    section_id: UUID
    roll_no: str
    status: str


@dataclass(frozen=True)
class MarksEntryDTO:
    id: UUID
    enrollment_id: UUID
    subject_id: UUID
    assessment_type_id: UUID
    full_marks: int
    obtained_marks: int
    entered_by_id: UUID | None = None


@dataclass(frozen=True)
class SubjectResultDTO:
    id: UUID
    enrollment_id: UUID
    subject_id: UUID
    total_obtained: int
    total_full: int
    percentage: Decimal
    grade: str
    grade_point: Decimal


@dataclass(frozen=True)
class GradePolicyDTO:
    id: UUID
    grade_label: str
    min_percentage: Decimal
    max_percentage: Decimal
    grade_point: Decimal
    display_order: int


@dataclass(frozen=True)
class ReportCardDTO:
    student_name: str
    student_id: str
    roll_no: str
    class_name: str
    section_name: str
    session_name: str
    results: list[SubjectResultDTO] = field(default_factory=list)
    total_marks: int = 0
    total_full: int = 0
    percentage: Decimal = Decimal("0")
    overall_grade: str = ""
    rank: int | None = None


@dataclass(frozen=True)
class MarksheetDTO:
    student_name: str
    student_id: str
    roll_no: str
    class_name: str
    section_name: str
    session_name: str
    subjects: list[dict] = field(default_factory=list)
    cocurricular: list[dict] = field(default_factory=list)
    total_marks: int = 0
    total_full: int = 0
    percentage: Decimal = Decimal("0")
    overall_grade: str = ""
    rank: int | None = None
