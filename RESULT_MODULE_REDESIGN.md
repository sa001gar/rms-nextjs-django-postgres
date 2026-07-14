# Result Management Module — Complete Architectural Redesign (v2)

## Table of Contents

1. [Review of the Current Schema](#1-review-of-the-current-schema)
2. [Problems in the Existing Architecture](#2-problems-in-the-existing-architecture)
3. [Recommended Architecture](#3-recommended-architecture)
4. [Improved Database Schema](#4-improved-database-schema)
5. [Entity Relationships](#5-entity-relationships)
6. [Django Models](#6-django-models)
7. [Service Layer](#7-service-layer)
8. [REST API Design](#8-rest-api-design)
9. [Frontend Route Structure](#9-frontend-route-structure)
10. [Sidebar Redesign](#10-sidebar-redesign)
11. [Page-by-Page Redesign](#11-page-by-page-redesign)
12. [Unified Result Configuration Page](#12-unified-result-configuration-page)
13. [Marks Entry Page](#13-marks-entry-page)
14. [Result Generation Workflow](#14-result-generation-workflow)
15. [Result Publication Workflow](#15-result-publication-workflow)
16. [Grade Calculation Workflow](#16-grade-calculation-workflow)
17. [Promotion Workflow](#17-promotion-workflow)
18. [Database Optimization](#18-database-optimization)
19. [API Optimization](#19-api-optimization)
20. [Frontend Component Architecture](#20-frontend-component-architecture)
21. [Reusable Components](#21-reusable-components)
22. [State Management](#22-state-management)
23. [Performance Optimization](#23-performance-optimization)
24. [Security Considerations](#24-security-considerations)
25. [Migration Strategy](#25-migration-strategy)

---

## 1. Review of the Current Schema

### Existing Tables (26 total)

| # | Table | Status | Verdict |
|---|-------|--------|---------|
| 1 | `academic_sessions` | Keep | Clean |
| 2 | `classes` | Keep | Clean |
| 3 | `sections` | Keep | Clean |
| 4 | `subject_categories` | Keep | Clean, add `SubjectGroup` model |
| 5 | `subjects` | Keep | Clean, add FK to `SubjectGroup` |
| 6 | `class_subjects` | Keep | Rename FK to `subject_group` |
| 7 | `terms` | **Keep** | Valuable domain hierarchy — keep Term → Exam → AssessmentComponent |
| 8 | `exams` | **Keep** | Valuable domain hierarchy |
| 9 | `exam_components` | **Rename** | Rename to `assessment_components` for clarity |
| 10 | `subject_assessment_schemes` | **Rename** | Rename to `assessment_component_configs` |
| 11 | `grade_policy_sets` | **Rename** | Rename to `grade_scales` |
| 12 | `grade_policy_grades` | **Rename** | Rename to `grade_rules` |
| 13 | `promotion_rules` | **Keep** | Valuable domain entity — keep as separate model |
| 14 | `teacher_assignments` | **Keep** | Keep section FK — teaching is section-aware |
| 15 | `report_card_templates` | **Remove** | One template, maintained by developers |
| 16 | `report_card_template_assignments` | **Remove** | Not needed |
| 17 | `report_card_sections` | **Remove** | Not needed |
| 18 | `report_card_section_subject_groups` | **Remove** | Not needed |
| 19 | `marks_entries` | **Keep** | Clean model — stores raw values only |
| 20 | `result_publications` | **Keep** | Keep section FK — publication can be section-aware |
| 21 | `subject_results` | **Remove** | Computed on demand |
| 22 | `student_remarks` | **Keep** | Simple, useful |
| 23 | `term_attendances` | **Keep** | Simple, useful |
| 24-28 | 5 deprecated models | **Remove** | Drop after data migration |

### New Models

| # | Table | Replaces |
|---|-------|----------|
| 1 | `subject_groups` | Formalizes the subject-grouping concept |
| 2 | `assessment_component_configs` | `subject_assessment_schemes` (renamed) |

### Entity Count

- **Current:** 26 tables
- **Proposed:** 20 tables (23% reduction — less aggressive than v1, preserving domain hierarchy)

---

## 2. Problems in the Existing Architecture

### Configuration Problems

**P1. Configuration scatter across 8+ pages**
Subjects, categories, terms, exams, exam components, assessment schemes, grading, promotion rules — each on its own page. Admin must navigate constantly.

**P2. No aggregate API for class configuration**
Frontend makes 10+ API calls just to render a configuration view.

**P3. Marks entry requires 5 cascading filters**
Session → Class → Section → Subject → Exam Component. The user selects 5 dropdowns before entering one mark.

**P4. Report card template overengineering**
`ReportCardTemplate` + `ReportCardTemplateAssignment` + `ReportCardSection` + `ReportCardSectionSubjectGroup` = 4 tables for what amounts to one HTML template. The drag-and-drop builder (487 lines of code) maintains something that should be static.

**P5. Cached computed values (`SubjectResult`)**
Storing percentages, grades, and totals creates cache invalidation problems. Computation is pure arithmetic — simpler to compute on read.

**P6. Deprecated models clutter the codebase**
Five deprecated models still exist as live models with migration comments. Either migrate or remove.

### Architectural Problems

**P7. No clear separation between master data and operational configuration**
Subjects are master data (exist once), but the current UI makes them feel like class-specific configuration.

**P8. Sidebar is overcrowded**
17 nav items for admin is too many.

### What Is NOT Broken (keep)

- The `Term → Exam → ExamComponent` hierarchy models the real domain well
- `GradePolicySet` + `GradePolicyGrade` is a reasonable pattern (just rename for clarity)
- `PromotionRule` as a separate model is correct
- `TeacherAssignment` per section is correct (teachers teach sections, not classes)
- `ResultPublication` per section is correct (publication can be staggered by section)
- `MarksEntry` is clean — stores only raw values
- Service/Repository/Selector pattern
- JWT auth with auto-refresh

---

## 3. Recommended Architecture

### Guiding Principles

1. **Configuration is class-based** — Sections only separate students.
2. **Master data is separate** — Subjects, Categories, Groups are defined once, assigned to classes.
3. **Preserve the academic hierarchy** — Term → Exam → AssessmentComponent models the real domain.
4. **Grade scales and promotion rules are domain entities** — Deserve their own models, not JSON blobs.
5. **Teaching is section-aware** — Teacher assignments need sections.
6. **Publication can be section-aware** — Schools may stagger publication.
7. **Aggregate APIs** — One endpoint returns the full class configuration.
8. **Computation, not caching** — Calculate totals, percentages, grades on every read.
9. **One page to configure a class** — Everything scrolls vertically, no tabs, no sub-pages.

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT (Next.js)                         │
├──────────────────────────────────────────────────────────────────┤
│  /admin/result-config    /admin/marks-entry    /admin/results    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │ ConfigPage        │  │ MarksGrid        │  │ ResultsPage   │ │
│  │ (vertical scroll) │  │ (spreadsheet)    │  │ (publications)│ │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬────────┘ │
│           │                     │                      │         │
│           └─────────┬───────────┴──────────┬───────────┘         │
│                     │                      │                     │
│              ┌──────▼──────┐       ┌───────▼───────┐            │
│              │ React Query │       │ Zustand (Auth)│            │
│              └──────┬──────┘       └───────────────┘            │
│                     │                                            │
│              ┌──────▼──────┐                                     │
│              │ API Client  │                                     │
│              └──────┬──────┘                                     │
└─────────────────────┼────────────────────────────────────────────┘
                      │ HTTP REST
┌─────────────────────▼────────────────────────────────────────────┐
│                       DJANGO API                                  │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Config Views │  │ Marks Views  │  │ Publication Views    │   │
│  │ (aggregate)  │  │ (bulk grid)  │  │ (workflow)           │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                 │                      │               │
│  ┌──────▼──────────────────▼─────────────────────▼──────────┐   │
│  │                    SERVICE LAYER                          │   │
│  │  ConfigService  MarksService  ResultService              │   │
│  │  GradeService   PromotionService  PublicationService     │   │
│  └──────┬──────────────────┬─────────────────────┬──────────┘   │
│         │                  │                     │               │
│  ┌──────▼──────────────────▼─────────────────────▼──────────┐   │
│  │                    DATA LAYER                              │   │
│  │  Django ORM + PostgreSQL + Redis Cache                    │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Improved Database Schema

### Preserved Hierarchy (Term → Exam → AssessmentComponent)

```
AcademicSession (2025-26)
  └── Term (First Term)
        └── Exam (Mid Term)
              └── AssessmentComponent (Theory)
              └── AssessmentComponent (Practical)
        └── Exam (Terminal)
              └── AssessmentComponent (Theory)
              └── AssessmentComponent (Project)
  └── Term (Second Term)
        └── Exam (Annual)
              └── AssessmentComponent (Theory)
              └── AssessmentComponent (Viva)
```

### New: `SubjectGroup`

Adds a grouping layer between `SubjectCategory` and `Subject`.

```sql
CREATE TABLE subject_groups (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(100) NOT NULL,
    code                VARCHAR(30) NOT NULL UNIQUE,
    category_id         UUID NOT NULL REFERENCES subject_categories(id),
    display_order       INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Updates to `ClassSubject`:
```sql
-- Add subject_group FK to ClassSubject
ALTER TABLE class_subjects ADD COLUMN subject_group_id UUID REFERENCES subject_groups(id);
-- The display_order for report rendering per class
ALTER TABLE class_subjects ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
```

### Renamed: `AssessmentComponent` (was `ExamComponent`)

```sql
CREATE TABLE assessment_components (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id         UUID NOT NULL REFERENCES exams(id),
    parent_id       UUID REFERENCES assessment_components(id),  -- hierarchical components
    name            VARCHAR(100) NOT NULL,
    code            VARCHAR(30) NOT NULL DEFAULT '',
    value_type      VARCHAR(20) NOT NULL DEFAULT 'numeric'
                    CHECK (value_type IN ('numeric', 'grade', 'descriptive')),
    full_marks      DECIMAL(6,2),  -- default full marks, can be overridden
    display_order   INTEGER NOT NULL DEFAULT 0,
    is_optional     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (exam_id, parent_id, name)
);
```

### Renamed: `AssessmentComponentConfig` (was `SubjectAssessmentScheme`)

```sql
CREATE TABLE assessment_component_configs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id                UUID NOT NULL REFERENCES classes(id),
    subject_id              UUID NOT NULL REFERENCES subjects(id),
    assessment_component_id UUID NOT NULL REFERENCES assessment_components(id),
    session_id              UUID NOT NULL REFERENCES academic_sessions(id),
    full_marks              DECIMAL(6,2) NOT NULL,
    weightage_pct           DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    is_applicable           BOOLEAN NOT NULL DEFAULT TRUE,
    display_order           INTEGER NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (class_id, subject_id, session_id, assessment_component_id)
);
```

**Why keep session on the config**: Historical report cards must remain valid. If a component's full_marks changes next session, old results should not change.

### Renamed: `GradeScale` (was `GradePolicySet`)

```sql
CREATE TABLE grade_scales (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID REFERENCES academic_sessions(id),
    name            VARCHAR(100) NOT NULL DEFAULT 'Default',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (session_id, name)
);
```

### Renamed: `GradeRule` (was `GradePolicyGrade`)

```sql
CREATE TABLE grade_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_scale_id  UUID NOT NULL REFERENCES grade_scales(id),
    label           VARCHAR(10) NOT NULL,
    min_percentage  DECIMAL(5,2) NOT NULL,
    max_percentage  DECIMAL(5,2) NOT NULL,
    grade_point     DECIMAL(3,1) NOT NULL,
    display_order   INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (min_percentage <= max_percentage)
);
```

### `PromotionRule` (keep as separate model — already clean)

```sql
CREATE TABLE promotion_rules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES academic_sessions(id),
    from_class_id       UUID NOT NULL REFERENCES classes(id),
    to_class_id         UUID NOT NULL REFERENCES classes(id),
    min_percentage      DECIMAL(5,2) NOT NULL DEFAULT 33.00,
    max_subjects_fail   INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (session_id, from_class_id)
);
```

### `TeacherAssignment` (keep section FK — teaching is section-aware)

```sql
CREATE TABLE teacher_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id      UUID NOT NULL REFERENCES teacher_profiles(id),
    class_id        UUID NOT NULL REFERENCES classes(id),
    section_id      UUID NOT NULL REFERENCES sections(id),
    subject_id      UUID NOT NULL REFERENCES subjects(id),
    session_id      UUID NOT NULL REFERENCES academic_sessions(id),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (teacher_id, class_id, section_id, subject_id, session_id)
);
```

### `ResultPublication` (keep section FK — staggered publication)

```sql
CREATE TABLE result_publications (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id        UUID NOT NULL REFERENCES academic_sessions(id),
    class_id          UUID NOT NULL REFERENCES classes(id),
    section_id        UUID NOT NULL REFERENCES sections(id),
    status            VARCHAR(20) NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'under_review', 'published', 'unpublished')),
    published_by_id   UUID REFERENCES users(id),
    published_at      TIMESTAMPTZ,
    remarks           TEXT NOT NULL DEFAULT '',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (session_id, class_id, section_id)
);
```

### Models Removed

| Model | Migration |
|-------|-----------|
| `report_card_templates` | Delete — not needed |
| `report_card_template_assignments` | Delete — not needed |
| `report_card_sections` | Delete — not needed |
| `report_card_section_subject_groups` | Delete — not needed |
| `subject_results` | Delete — compute on demand |
| `exam_component_mappings` (deprecated) | Drop after migration |
| `assessment_types` (deprecated) | Drop after migration |
| `assessment_weightages` (deprecated) | Drop after migration |
| `marks_distributions` (deprecated) | Drop after migration |
| `grade_policies` (deprecated) | Drop after migration |

---

## 5. Entity Relationships

```
AcademicSession 1──* Term                 Session-level (defines academic calendar)
             1──* TeacherAssignment        Per-section teacher assignments
             1──* Enrollment
             1──* ResultPublication        Per-section publications
             1──* GradeScale               Optional session-specific grading
             1──* PromotionRule            Per-class promotion criteria

Term 1──* Exam                            Term groups exams
Exam 1──* AssessmentComponent             Exam groups components

Class 1──* Section                        Sections separate students only
     1──* ClassSubject                    Subjects assigned to this class
     1──* AssessmentComponentConfig       Component → subject mapping
     1──* PromotionRule (from_class)      Promotion from this class
     1──* Enrollment
     1──* ResultPublication

Section 1──* Enrollment
        1──* TeacherAssignment
        1──* ResultPublication

SubjectCategory 1──* SubjectGroup          Category groups subject groups
SubjectGroup 1──* Subject                  Group contains subjects
Subject 1──* ClassSubject                 Assigned to classes via bridge
       1──* AssessmentComponentConfig
       1──* MarksEntry

AssessmentComponent 1──* AssessmentComponentConfig  Config per class-subject
                   1──* MarksEntry

Enrollment 1──* MarksEntry
          1──* StudentRemarks
          1──* TermAttendance
          1── Student
          1── Session
          1── Class
          1── Section

GradeScale 1──* GradeRule                 Scale contains rules
```

---

## 6. Django Models

### `SubjectGroup` (new)

```python
class SubjectGroup(BaseModel):
    """Grouping layer between SubjectCategory and Subject.

    Example: SubjectCategory "Scholastic" → SubjectGroup "Languages" → Subject "English"
             SubjectCategory "Scholastic" → SubjectGroup "Sciences" → Subject "Physics"
             SubjectCategory "Co-Scholastic" → SubjectGroup "Activities" → Subject "Games"
    """

    name = CharField(max_length=100)
    code = CharField(max_length=30, unique=True)
    category = ForeignKey(SubjectCategory, on_delete=CASCADE, related_name="groups")
    display_order = PositiveIntegerField(default=0)

    class Meta:
        db_table = "subject_groups"
        ordering = ["category", "display_order"]
```

### `Subject` (updated — add FK to SubjectGroup)

```python
class Subject(BaseModel):
    name = CharField(max_length=200)
    code = CharField(max_length=20, unique=True)
    category = ForeignKey(SubjectCategory, on_delete=SET_NULL, null=True, related_name="subjects")
    group = ForeignKey(SubjectGroup, on_delete=SET_NULL, null=True, blank=True, related_name="subjects")

    class Meta:
        db_table = "subjects"
        ordering = ["code"]
```

### `ClassSubject` (updated — add SubjectGroup FK)

```python
class ClassSubject(BaseModel):
    """Subject assigned to a class, with group override and display order."""

    class_ref = ForeignKey(Class, on_delete=CASCADE, related_name="class_subjects", db_column="class_id")
    subject = ForeignKey(Subject, on_delete=CASCADE, related_name="class_subjects")
    group = ForeignKey(SubjectGroup, on_delete=SET_NULL, null=True, blank=True, related_name="class_subjects")
    is_required = BooleanField(default=True)
    display_order = PositiveIntegerField(default=0)

    class Meta:
        db_table = "class_subjects"
        ordering = ["class_ref", "display_order"]
        unique_together = [("class_ref", "subject")]
```

### `AssessmentComponent` (renamed from ExamComponent)

```python
class AssessmentComponent(BaseModel):
    """An assessable unit within an exam.

    Examples:
      Exam "Mid Term"
        → Component "Theory" (numeric, 80 marks)
        → Component "Practical" (numeric, 20 marks)
      Exam "Annual"
        → Component "Written" (numeric, 100 marks)
        → Component "Project" (grade)
        → Component "Viva" (descriptive)

    Supports hierarchical components via parent FK (e.g., Theory → Part A, Part B).
    """

    VALUE_TYPES = [
        ("numeric", "Numeric Marks"),
        ("grade", "Grade Only"),
        ("descriptive", "Descriptive"),
    ]

    exam = ForeignKey(Exam, on_delete=CASCADE, related_name="components")
    parent = ForeignKey("self", on_delete=CASCADE, null=True, blank=True, related_name="children")
    name = CharField(max_length=100)
    code = CharField(max_length=30, blank=True, default="")
    value_type = CharField(max_length=20, choices=VALUE_TYPES, default="numeric")
    full_marks = DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    display_order = PositiveIntegerField(default=0)
    is_optional = BooleanField(default=False)

    class Meta:
        db_table = "assessment_components"
        ordering = ["exam", "parent__id", "display_order"]
        unique_together = [("exam", "parent", "name")]
```

### `AssessmentComponentConfig` (renamed from SubjectAssessmentScheme)

```python
class AssessmentComponentConfig(BaseModel):
    """Maps an assessment component to a class-subject with overridable marks/weightage.

    This is the core of the configuration matrix. For each (class, subject, component),
    defines full_marks, weightage, and whether the component applies.
    """

    class_ref = ForeignKey(Class, on_delete=CASCADE, related_name="component_configs", db_column="class_id")
    subject = ForeignKey(Subject, on_delete=CASCADE, related_name="component_configs")
    assessment_component = ForeignKey(AssessmentComponent, on_delete=CASCADE, related_name="class_configs")
    session = ForeignKey(AcademicSession, on_delete=CASCADE, related_name="component_configs")
    full_marks = DecimalField(max_digits=6, decimal_places=2)
    weightage_pct = DecimalField(max_digits=5, decimal_places=2, default=Decimal("100.00"))
    is_applicable = BooleanField(default=True)
    display_order = PositiveIntegerField(default=0)

    class Meta:
        db_table = "assessment_component_configs"
        unique_together = [("class_ref", "subject", "session", "assessment_component")]
```

### `GradeScale` (renamed from GradePolicySet)

```python
class GradeScale(BaseModel):
    """Named grading scheme, optionally scoped to a session."""

    session = ForeignKey(AcademicSession, on_delete=CASCADE, null=True, blank=True, related_name="grade_scales")
    name = CharField(max_length=100, default="Default")
    is_active = BooleanField(default=True)

    class Meta:
        db_table = "grade_scales"
        unique_together = [("session", "name")]
```

### `GradeRule` (renamed from GradePolicyGrade)

```python
class GradeRule(BaseModel):
    """Single grade row within a GradeScale."""

    grade_scale = ForeignKey(GradeScale, on_delete=CASCADE, related_name="rules")
    label = CharField(max_length=10)  # "A1", "A2", "B1", etc.
    min_percentage = DecimalField(max_digits=5, decimal_places=2)
    max_percentage = DecimalField(max_digits=5, decimal_places=2)
    grade_point = DecimalField(max_digits=3, decimal_places=1)  # 10.0, 9.0, etc.
    display_order = PositiveIntegerField()

    class Meta:
        db_table = "grade_rules"
        ordering = ["grade_scale", "display_order"]
```

### `PromotionRule` (unchanged — keep as separate model)

```python
class PromotionRule(BaseModel):
    """Configurable promotion criteria for a class in a session."""

    session = ForeignKey(AcademicSession, on_delete=CASCADE, related_name="promotion_rules")
    from_class = ForeignKey(Class, on_delete=CASCADE, related_name="promotion_rules_from")
    to_class = ForeignKey(Class, on_delete=CASCADE, related_name="promotion_rules_to")
    min_percentage = DecimalField(max_digits=5, decimal_places=2, default=Decimal("33.00"))
    max_subjects_fail = PositiveIntegerField(default=0)

    class Meta:
        db_table = "promotion_rules"
        unique_together = [("session", "from_class")]
```

### `TeacherAssignment` (unchanged — keep section FK)

```python
class TeacherAssignment(BaseModel):
    """Teacher → Class + Section + Subject + Session mapping."""

    teacher = ForeignKey(TeacherProfile, on_delete=CASCADE, related_name="assignments")
    class_ref = ForeignKey(Class, on_delete=CASCADE, related_name="teacher_assignments", db_column="class_id")
    section = ForeignKey(Section, on_delete=CASCADE, related_name="teacher_assignments")
    subject = ForeignKey(Subject, on_delete=CASCADE, related_name="teacher_assignments")
    session = ForeignKey(AcademicSession, on_delete=CASCADE, related_name="teacher_assignments")
    is_active = BooleanField(default=True)

    class Meta:
        db_table = "teacher_assignments"
        unique_together = [("teacher", "class_ref", "section", "subject", "session")]
```

### `ResultPublication` (unchanged — keep section FK)

```python
class ResultPublication(BaseModel):
    """Publication workflow per class + section."""

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("under_review", "Under Review"),
        ("published", "Published"),
        ("unpublished", "Unpublished"),
    ]

    session = ForeignKey(AcademicSession, on_delete=CASCADE, related_name="result_publications")
    class_ref = ForeignKey(Class, on_delete=CASCADE, related_name="result_publications", db_column="class_id")
    section = ForeignKey(Section, on_delete=CASCADE, related_name="result_publications")
    status = CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    published_by = ForeignKey(User, on_delete=SET_NULL, null=True, related_name="published_results")
    published_at = DateTimeField(null=True, blank=True)
    remarks = TextField(blank=True, default="")

    class Meta:
        db_table = "result_publications"
        unique_together = [("session", "class_ref", "section")]
```

---

## 7. Service Layer

### `ConfigService`

```python
class ConfigService:
    """Aggregate service for class-level result configuration."""

    def get_full_config(self, session_id: UUID, class_id: UUID) -> dict:
        """Returns complete configuration:
        - Subjects assigned to class (with groups and categories)
        - Term → Exam → AssessmentComponent hierarchy
        - Component → Subject config matrix (full_marks, weightage)
        - Active grade scale with rules
        - Promotion rule for this class
        """
        class_subjects = ClassSubject.objects.filter(
            class_ref_id=class_id
        ).select_related(
            "subject",
            "subject__category",
            "group",
            "subject__group",
        ).order_by("display_order")

        terms = Term.objects.filter(
            session_id=session_id
        ).prefetch_related(
            Prefetch("exams", queryset=Exam.objects.prefetch_related("components").order_by("display_order"))
        ).order_by("display_order")

        configs = AssessmentComponentConfig.objects.filter(
            class_ref_id=class_id, session_id=session_id
        ).select_related("assessment_component", "subject")

        grade_scale = GradeScale.objects.filter(
            models.Q(session_id=session_id) | models.Q(session__isnull=True),
            is_active=True,
        ).prefetch_related("rules").first()

        promotion_rule = PromotionRule.objects.filter(
            session_id=session_id, from_class_id=class_id
        ).first()

        return self._serialize(class_subjects, terms, configs, grade_scale, promotion_rule)

    def save_full_config(self, session_id: UUID, class_id: UUID, config: dict):
        """Saves complete configuration in one transaction."""
        with transaction.atomic():
            # 1. Update subject assignments
            # 2. Update component configs
            # 3. Update grade scale
            # 4. Update promotion rule
            ...

    def add_component_config(self, component_id: UUID, class_id: UUID,
                              subject_ids: list[UUID], full_marks: Decimal):
        """Add a component to selected subjects for a class."""
        with transaction.atomic():
            for subject_id in subject_ids:
                AssessmentComponentConfig.objects.create(
                    class_ref_id=class_id,
                    subject_id=subject_id,
                    assessment_component_id=component_id,
                    full_marks=full_marks,
                )
```

### `MarksService`

```python
class MarksService:
    """Bulk marks entry operations."""

    def get_entry_grid(self, session_id: UUID, class_id: UUID,
                       section_id: UUID | None = None) -> dict:
        """Returns complete marks grid: students, subjects, components, existing marks."""
        ...

    def bulk_save(self, session_id: UUID, class_id: UUID,
                  entries: list[MarksEntryInput]) -> BulkSaveResult:
        """Bulk create/update marks entries using ON CONFLICT."""
        ...

    def update_cell(self, enrollment_id: UUID, subject_id: UUID,
                     component_id: UUID, data: CellInput):
        """Single cell upsert for auto-save."""
        ...
```

### `ResultService`

```python
class ResultService:
    """Result computation and publication."""

    def compute_class_results(self, session_id: UUID, class_id: UUID,
                               grade_scale: GradeScale | None = None) -> list[StudentResult]:
        """Computes results for all students in a class."""
        ...

    def compute_student_result(self, enrollment_id: UUID) -> StudentResult:
        """Computes result for one student."""
        ...

    def get_publication(self, session_id: UUID, class_id: UUID,
                        section_id: UUID) -> ResultPublication | None:
        """Get existing publication or None."""
        ...

    def create_publication(self, session_id: UUID, class_id: UUID,
                           section_id: UUID) -> ResultPublication:
        """Create a new draft publication."""
        ...

    def publish(self, publication_id: UUID, user: User):
        """Publish results."""
        ...

    def unpublish(self, publication_id: UUID):
        """Unpublish results."""
        ...
```

### `GradeService`

```python
class GradeService:
    """Grade scale management."""

    def get_active_scale(self, session_id: UUID) -> GradeScale | None:
        """Get active grade scale for a session, or fallback to global."""
        ...

    def get_grade(self, percentage: Decimal, grade_scale: GradeScale) -> tuple[str, Decimal]:
        """Look up grade label and grade point from percentage."""
        ...

    def upsert_scale(self, session_id: UUID, name: str,
                      rules: list[GradeRuleInput]) -> GradeScale:
        """Create or update a grade scale with its rules."""
        ...
```

### `PromotionService`

```python
class PromotionService:
    """Bulk promotion workflow."""

    def preview(self, session_id: UUID, class_id: UUID) -> list[PromotionPreview]:
        """Preview promotion decisions without executing."""
        ...

    def execute(self, session_id: UUID, from_class_id: UUID,
                 new_session_id: UUID, section_map: dict[UUID, UUID]) -> PromotionResult:
        """Execute promotion — creates new enrollments in one transaction."""
        ...
```

---

## 8. REST API Design

### Configuration (aggregate)

```
GET    /api/v1/result-config/{session_id}/{class_id}/
       → Full configuration object
       Response: {
           subjects: [{ id, name, code, category, group, is_required, display_order }],
           academic_structure: [{ term, exams: [{ name, components: [...] }] }],
           configs: [{ component_id, subject_id, full_marks, weightage_pct, is_applicable }],
           grade_scale: { id, name, rules: [{ label, min_pct, max_pct, grade_point }] },
           promotion_rule: { from_class_id, to_class_id, min_percentage, max_subjects_fail }
       }

PUT    /api/v1/result-config/{session_id}/{class_id}/
       → Replace full configuration atomically
       Request: same structure as GET response

PATCH  /api/v1/result-config/{session_id}/{class_id}/
       → Partial update (any subset of fields)
```

### Marks Entry

```
GET    /api/v1/marks-entry/{session_id}/{class_id}/?section_id=xxx
       → Full marks grid
       Response: {
           students: [{ id, name, roll_no, section_name }],
           subjects: [{ id, name, code, category }],
           components: [{ id, name, exam_name, value_type, full_marks }],
           entries: [{ enrollment_id, subject_id, component_id, marks_value, grade_value, ... }]
       }

POST   /api/v1/marks-entry/{session_id}/{class_id}/bulk/
       → Bulk save (create or update)
       Request: { entries: [{ enrollment_id, subject_id, component_id, marks_value, ... }] }
       Response: { saved: int, errors: [...] }

PATCH  /api/v1/marks-entry/{session_id}/{class_id}/cell/
       → Single cell auto-save
       Request: { enrollment_id, subject_id, component_id, marks_value, is_absent }
```

### Results & Publication

```
GET    /api/v1/results/{session_id}/{class_id}/?section_id=xxx
       → Computed results for all students in a section/class

POST   /api/v1/results/{session_id}/{class_id}/compute/
       → (Re-)compute results synchronously for small classes
       → Returns computed results

GET    /api/v1/results/{session_id}/{class_id}/{section_id}/publication/
       → Current publication status

POST   /api/v1/results/{session_id}/{class_id}/{section_id}/publication/
       → Create new draft publication

POST   /api/v1/results/{session_id}/{class_id}/{section_id}/publication/{id}/
       Body: { action: "submit" | "publish" | "unpublish" }
```

### Promotion

```
POST   /api/v1/results/{session_id}/{class_id}/promotion/preview/
       → Preview promotion decisions

POST   /api/v1/results/{session_id}/{class_id}/promotion/execute/
       Request: { new_session_id, section_map: { student_id: section_id } }
       → Execute promotion in one transaction
```

---

## 9. Frontend Route Structure

### Admin Routes

```
/admin                          Dashboard
/admin/sessions                 Academic Sessions
/admin/classes                  Classes & Sections

/admin/subjects                 Subjects Master Data
/admin/subject-categories       Subject Categories & Groups

/admin/students                 Students List
/admin/enrollments              Enrollment Management

/admin/assignments              Teacher Assignments

/admin/result-config            RESULT CONFIGURATION (unified page)
/admin/marks-entry              MARKS ENTRY (spreadsheet)
/admin/results                  RESULT GENERATION & PUBLICATION

/admin/attendance               Term Attendance
/admin/reports                  Reports & Analytics
/admin/users                    User Management
/admin/audit                    Audit Logs
```

### Teacher Routes

```
/teacher                        Dashboard
/teacher/marks                  Marks Entry (filtered to assigned subjects)
/teacher/reports                Reports & Marksheets
/teacher/students               My Students
```

### Student Routes

```
/student                        Dashboard
/student/results                My Results
/student/report-card            Report Card
/student/profile                Profile
```

---

## 10. Sidebar Redesign

### Current: 17 flat items

### New: Grouped sidebar (~12 items in groups)

```typescript
const navItems = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },

  // Academic master data group
  { section: 'Academic', items: [
    { title: 'Sessions', href: '/admin/sessions', icon: Calendar },
    { title: 'Classes', href: '/admin/classes', icon: GraduationCap },
    { title: 'Subjects', href: '/admin/subjects', icon: BookOpen },
  ]},

  // Students group
  { section: 'Students', items: [
    { title: 'Students', href: '/admin/students', icon: Users },
    { title: 'Enrollments', href: '/admin/enrollments', icon: ClipboardList },
  ]},

  // Teachers group
  { section: 'Teachers', items: [
    { title: 'Teachers', href: '/admin/teachers', icon: UserCheck },
    { title: 'Assignments', href: '/admin/assignments', icon: GitBranch },
  ]},

  // Results group (core operational section)
  { section: 'Results', items: [
    { title: 'Result Config', href: '/admin/result-config', icon: Settings2 },
    { title: 'Marks Entry', href: '/admin/marks-entry', icon: ClipboardCheck },
    { title: 'Results', href: '/admin/results', icon: ScrollText },
  ]},

  // Other
  { title: 'Attendance', href: '/admin/attendance', icon: CalendarDays },
  { title: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { title: 'Users', href: '/admin/users', icon: Shield },
  { title: 'Audit Logs', href: '/admin/audit', icon: FileSearch },
];
```

**What changed from the original:**
- `Subjects` restored as master data (not absorbed into result config)
- `Teachers` restored as a separate nav item
- `Assignments` kept as a separate page
- Items grouped by function for visual clarity
- "Academic" group: sessions, classes, subjects (master data)
- "Students" group: students, enrollments
- "Teachers" group: teachers, assignments
- "Results" group: result config, marks entry, results (the three operational pages)

---

## 11. Page-by-Page Redesign

### Pages Kept (with minimal changes)

| Page | Change |
|------|--------|
| Dashboard | Unchanged |
| Sessions | Unchanged |
| Classes & Sections | Unchanged |
| Subjects | Unchanged (master data) |
| Subject Categories | Add SubjectGroup management |
| Students | Unchanged |
| Enrollments | Unchanged |
| Teachers | Unchanged |
| Attendance | Unchanged |
| Users | Unchanged |
| Audit Logs | Unchanged |

### Pages Redesigned

| Page | Change |
|------|--------|
| **Result Configuration** | New unified page (replaces assessment-schemes, exams, grading, promotion-rules pages) |
| **Marks Entry** | Full spreadsheet grid — no cascading filters |
| **Results** | Merged with publications — compute, preview, publish in one page |
| **Assignments** | Minor — already clean, no changes needed |

### Pages Removed

| Page | Reason |
|------|--------|
| Assessment Schemes | Absorbed into Result Configuration (config matrix) |
| Exams / Terms | Absorbed into Result Configuration (assessment components) |
| Grading | Absorbed into Result Configuration (grade scale section) |
| Promotion Rules | Absorbed into Result Configuration (promotion section) |
| Report Card Templates | Removed entirely — one template, maintained by devs |
| Template Builder | Removed entirely |
| Publications | Absorbed into Results page |
| Analytics | Merged into Reports |

---

## 12. Unified Result Configuration Page

### Layout (vertical scroll, no tabs, no sub-pages)

```
┌────────────────────────────────────────────────────────────┐
│  Result Configuration                                      │
│  ────────────────────────────────────────                  │
│  [Session: 2025-26 ▼]  [Class: Class VIII ▼]              │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ── Subjects ──────────────────────────────────────────    │
│                                                            │
│  ┌────┬──────────┬──────────┬──────────┬─────────┬──────┐ │
│  │ #  │ Subject  │ Category │ Group    │ Required│ Ord. │ │
│  ├────┼──────────┼──────────┼──────────┼─────────┼──────┤ │
│  │ 1  │ English  │ Scholast │ Language │   ✓     │  1   │ │
│  │ 2  │ Maths    │ Scholast │ Core     │   ✓     │  2   │ │
│  │ 3  │ Physics  │ Scholast │ Sciences │   ✓     │  3   │ │
│  │ 4  │ Chemistry│ Scholast │ Sciences │   ✓     │  4   │ │
│  │ 5  │ Games    │ Co-Schol │ Activity │         │  5   │ │
│  │ 6  │ Art      │ Co-Schol │ Activity │         │  6   │ │
│  │    │          │          │          │         │      │ │
│  │    │  [+ Add Subject]   │          │         │      │ │
│  └────┴──────────┴──────────┴──────────┴─────────┴──────┘ │
│                                                            │
│  ── Academic Structure ────────────────────────────────    │
│                                                            │
│  First Term                                                │
│    ┌──────────────────────────────────────────────────┐    │
│    │ Mid Term    [Theory: 80]  [Practical: 20]        │    │
│    │ Terminal    [Theory: 80]  [Project: 20]          │    │
│    │ [+ Add Exam]                                      │    │
│    └──────────────────────────────────────────────────┘    │
│                                                            │
│  Second Term                                               │
│    ┌──────────────────────────────────────────────────┐    │
│    │ Annual       [Theory: 80]  [Viva: 20]           │    │
│    │ [+ Add Exam]                                      │    │
│    └──────────────────────────────────────────────────┘    │
│                                                            │
│  [+ Add Term]                                              │
│                                                            │
│  ── Configuration Matrix ───────────────────────────── │   │
│                                                            │
│               │ First Term          │ Second Term          │
│               │ Mid Term│Terminal   │ Annual               │
│ Subject       │Thry|Prac│Thry|Proj  │Thry|Viva             │
│ ──────────────┼────┼────┼────┼──────┼────┼────             │
│ English       │ 20 │  - │ 30 │  20  │ 80 │  -              │
│ Maths         │ 20 │  - │ 30 │  20  │ 80 │  -              │
│ Physics       │ 20 │ 20 │  - │  20  │ 60 │ 20              │
│ Chemistry     │ 20 │ 20 │  - │  20  │ 60 │ 20              │
│ Games         │  - │  - │Grade│  -  │Grade│  -             │
│ Art           │  - │  - │Grade│  -  │Grade│  -             │
│                                                            │
│  ── Grade Scale ──────────────────────────────────────     │
│                                                            │
│  Scale: [Default Grade Scale ▼]                            │
│  ┌───────┬────────────┬────────────┬─────────────┐        │
│  │ Grade │ Min %      │ Max %      │ Grade Point │        │
│  ├───────┼────────────┼────────────┼─────────────┤        │
│  │ A1    │ 91         │ 100        │ 10.0        │        │
│  │ A2    │ 81         │ 90         │ 9.0         │        │
│  │ B1    │ 71         │ 80         │ 8.0         │        │
│  │ B2    │ 61         │ 70         │ 7.0         │        │
│  │ C1    │ 51         │ 60         │ 6.0         │        │
│  │ C2    │ 41         │ 50         │ 5.0         │        │
│  │ D     │ 33         │ 40         │ 4.0         │        │
│  │ E     │ 0          │ 32         │ 0.0         │        │
│  └───────┴────────────┴────────────┴─────────────┘        │
│  [Edit Scale] [Create New Scale]                           │
│                                                            │
│  ── Promotion Rules ──────────────────────────────────     │
│                                                            │
│  Promote to Class: [Class IX ▼]                            │
│  Min Percentage:    [33.00]                                 │
│  Max Subjects Fail: [2]                                     │
│                                                            │
│  ────────────────                                           │
│  [ Save Configuration ]                                     │
└────────────────────────────────────────────────────────────┘
```

### Interaction Design

- **Subjects section**: Inline editable table. Click a cell to edit. Add Subject opens a search-and-select modal from the master Subjects list.
- **Academic Structure**: Hierarchical view collapsed by default. Expand term to see exams, expand exam to see components. Add Term / Add Exam / Add Component buttons inline.
- **Configuration Matrix**: The column headers are dynamically generated from the academic structure. Editable cells. Grade-type components show "Grade" text automatically. Non-applicable cells show "—".
- **Grade Scale**: Dropdown to select from existing scales. Edit opens the grade rules in an editable table. Create New opens a dialog.
- **Promotion Rules**: Simple form inline.
- **Save**: Single button saves everything — subjects, component configs, grade scale selection, promotion rules — in one transaction.

---

## 13. Marks Entry Page

### Layout

```
┌───────────────────────────────────────────────────────────────────┐
│  Marks Entry                                                      │
│  ──────────────────────────────                                   │
│  [Session: 2025-26 ▼]  [Class: VIII ▼]  [Section: All ▼]        │
│                                                                    │
│  [Auto Save: ON]  Last saved: 2 min ago    [Save All]             │
│                                                                    │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────┬──────────┬────────┬──────────────────────┬────────────┐   │
│  │ #  │ Roll No  │ Name   │ English     │ Maths  │ ... │ Tot  │   │
│  │    │          │        │ MTT│Term│Ann│ MTT│Trm│     │      │   │
│  ├────┼──────────┼────────┼────┼────┼───┼────┼───┼     ┼──────┤   │
│  │  1 │ VIII-01  │ Ram    │ 15 │ 60 │ 75│ 18 │ 72│     │  -   │   │
│  │  2 │ VIII-02  │ Sam    │ 12 │ 55 │ 68│ 14 │ 68│     │  -   │   │
│  │  3 │ VIII-03  │ Raj    │ABS │ 58 │ 70│ 20 │ 75│     │  -   │   │
│  │  4 │ VIII-04  │ Priya  │ 18 │ 62 │ 80│ 16 │ 70│     │  -   │   │
│  │ ...│          │        │    │    │   │    │   │     │      │   │
│  │ 30 │ VIII-30  │ Zara   │ 10 │ 50 │ 65│ 12 │ 60│     │  -   │   │
│  └────┴──────────┴────────┴────┴────┴───┴────┴───┴─────┴──────┘   │
│                                                                    │
│  Status: 30 students | 6 subjects | 12 components | 360 cells      │
│  Filled: 340 | Empty: 20 | Absent: 2                              │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **No cascading filters for components** — Session + Class (+ optional Section) is all the admin needs. The grid shows all subjects and all components at once.

2. **Column header grouping** — Components are grouped under their subject. Subject name spans across its components.

3. **Virtual scrolling** — Only render visible rows. For a class of 40 students × 15 columns = 600 cells, render ~50 visible.

4. **Keyboard navigation** — Arrow keys move between cells. Enter saves and moves to next row. Tab moves to next column.

5. **Auto-save** — Each cell auto-saves after 500ms debounce. Visual feedback (green checkmark, spinner, red error).

6. **Validation** — Red border on invalid values. Tooltip shows "Expected 0-80". Row highlights for incomplete entries.

7. **Bulk paste** — Select multiple cells, copy from Excel, paste into grid.

8. **Absent toggle** — Press `A` key or right-click → Mark Absent.

9. **Header display** — Components show their full_marks in the header (e.g., "MTT(20)").

---

## 14. Result Generation Workflow

```
Step 1: Select Session + Class + Section
        → Shows current publication status (or "No publication")

Step 2: Click "Compute Results"
        POST /api/v1/results/{session}/{class}/compute/?section_id=xxx
        → Computation is synchronous (<100ms for typical class)
        → Returns computed results for preview

Step 3: Preview Results Table
        Student Name | Roll No | Subject Results | Total %
        | Grade | Rank | Promotion Status
        Expand any row to see subject-wise component breakdown

Step 4: Create / Update Publication
        If no publication: "Create Publication" (POST → draft)
        If draft exists: "Submit for Review" or "Publish"

Step 5: Publish
        POST .../publication/{id}/ with action: "publish"
        → status = "published"
        → Students can now view results
        → Report cards become available for PDF download

Step 6: Unpublish (if needed)
        POST .../publication/{id}/ with action: "unpublish"
        → status = "unpublished"
        → Results hidden from students
        → Marks become editable again
```

### Key Decisions

- **No separate SubjectResult cache** — Results computed from raw marks on every compute request. Computation is pure arithmetic. For a class of 40 students × 8 subjects = 320 subject-computations, takes ~50ms.
- **Publication per (session, class, section)** — Schools publish VIII A today, VIII B tomorrow. Configuration stays class-based.
- **Computation is synchronous** for typical class sizes. Celery task only for very large classes (>100 students) or batch PDF generation.

---

## 15. Result Publication Workflow

```
                    ┌──────────┐
                    │  DRAFT   │  ← Marks editable, results not visible to students
                    └────┬─────┘
                         │ Submit for Review
                         ▼
                 ┌───────────────┐
                 │ UNDER REVIEW  │  ← Marks locked (read-only), admin preview only
                 └───────┬───────┘
                         │ Publish
                         ▼
                ┌─────────────────┐
                │   PUBLISHED     │  ← Students view results, PDF exports active
                └────────┬────────┘
                         │ Unpublish
                         ▼
                ┌─────────────────┐
                │  UNPUBLISHED    │  ← Reverts to draft-like state
                └─────────────────┘
```

### API

```typescript
// Get status
GET /api/v1/results/{session}/{class}/{section}/publication/
→ { id: "...", status: "draft", published_at: null, ... }

// Create
POST /api/v1/results/{session}/{class}/{section}/publication/
→ { id: "...", status: "draft", ... }

// Action
POST /api/v1/results/{session}/{class}/{section}/publication/{id}/
{ action: "submit" | "publish" | "unpublish" }
```

---

## 16. Grade Calculation Workflow

### Data Flow

```
MarksEntry (raw values)           AssessmentComponentConfig
        │                                   │
        │           ┌───────────────────────┘
        ▼           ▼
┌─────────────────────────────────────┐
│      ResultComputationService       │
│                                     │
│  1. Group marks by enrollment       │
│  2. For each enrollment:            │
│     a. Group marks by subject       │
│     b. For each subject:            │
│        - Group by exam              │
│        - Sum obtained per exam      │
│        - Sum full per exam          │
│        - Calculate exam %           │
│        - Sum all exams = subject    │
│        - Calculate subject %        │
│        - Look up grade from scale   │
│     c. Sum all subjects = total     │
│     d. Overall % = total/totalFull  │
│     e. Look up overall grade        │
│  3. Apply promotion rules           │
│     - Count subjects below min %    │
│     - Compare to max_subjects_fail  │
│     - Decision: promoted/retained   │
│                                     │
│  Output: StudentResult[]            │
└─────────────────────────────────────┘
```

### Grade Lookup

```python
def get_grade(self, percentage: Decimal, rules: list[GradeRule]) -> tuple[str, Decimal]:
    if percentage is None:
        return ("", Decimal("0"))
    for rule in rules.order_by("-min_percentage"):
        if rule.min_percentage <= percentage <= rule.max_percentage:
            return (rule.label, rule.grade_point)
    return ("", Decimal("0"))
```

### No Stored Computed Values

The computation service outputs DTOs, not database rows. This eliminates:
- Cache invalidation when marks change
- Stale computed data
- The `SubjectResult` table entirely

---

## 17. Promotion Workflow

```
1. TAB: "Promotion" within Results page (separate from publication tab)

2. Select Session + Class + (optional) Section

3. Click "Preview Promotion"
   POST /api/v1/results/{session}/{class}/promotion/preview/
   → For each student: { name, percentage, subjects_failed, decision }

4. Review table:
   Student Name | Percentage | Subjects Below Min | Decision
   Ram         | 85%        | 0                  | PROMOTED → IX
   Sam         | 28%        | 4                  | RETAINED → VIII
   Raj         | 62%        | 1                  | PROMOTED → IX

5. Configure:
   New Session: [2026-27 ▼]
   Section Mapping: [Auto ▼] or Manual per student

6. Execute:
   POST /api/v1/results/{session}/{class}/promotion/execute/
   { "new_session_id": "...", "section_map": { "student_id": "section_id" } }
   → Wrapped in transaction.atomic()
   → Creates new Enrollment records
   → Updates old enrollment status to "promoted" or "retained"
   → Returns { promoted: N, retained: N, errors: [...] }
```

---

## 18. Database Optimization

### Indexes

```sql
-- AssessmentComponentConfig (THE critical join table)
CREATE INDEX idx_acc_lookup
    ON assessment_component_configs(class_id, subject_id, session_id, assessment_component_id);

-- MarksEntry (THE critical data table)
CREATE INDEX idx_marks_lookup
    ON marks_entries(enrollment_id, subject_id, assessment_component_id);
CREATE INDEX idx_marks_class_session
    ON marks_entries(enrollment_id)  -- enrollment → session/class via join
    -- Better: just use select_related, but add this for direct lookups
    ;

-- GradeRule
CREATE INDEX idx_grade_rules_scale ON grade_rules(grade_scale_id, display_order);

-- TeacherAssignment
CREATE INDEX idx_ta_teacher ON teacher_assignments(teacher_id, session_id);
CREATE INDEX idx_ta_class ON teacher_assignments(class_id, section_id, session_id);

-- ResultPublication
CREATE INDEX idx_pub_status ON result_publications(status);
CREATE INDEX idx_pub_session_class_section ON result_publications(session_id, class_id, section_id);
```

### Query Optimization Examples

**Marks Grid Query (3 queries total):**
```python
# 1. Students
Enrollment.objects.filter(session_id=sid, class_field_id=cid).select_related("student").only(
    "id", "roll_no", "student__name", "student__student_id"
)

# 2. Components (with exam/term hierarchy)
AssessmentComponent.objects.filter(
    exam__term__session_id=sid,
    id__in=configs.values_list("assessment_component_id")
).select_related("exam__term")

# 3. Existing marks
MarksEntry.objects.filter(enrollment__session_id=sid, enrollment__class_field_id=cid)
```

**Result Computation Query (2 queries total):**
```python
# 1. All marks with relationships
MarksEntry.objects.filter(
    enrollment__session_id=sid,
    enrollment__class_field_id=cid,
).select_related(
    "assessment_component", "subject", "enrollment",
    "assessment_component__exam__term",
    "subject__category",
)

# 2. Component configs
AssessmentComponentConfig.objects.filter(
    class_id=cid, session_id=sid
).select_related("assessment_component", "subject")
```

---

## 19. API Optimization

### Caching Strategy

| Pattern | Cache | TTL | Invalidation |
|---------|-------|-----|--------------|
| Class subject list | Redis | 1 hour | On class subject change |
| Term/Exam/Component structure | Redis | 1 hour | On academic structure change |
| Component configs matrix | Redis | 1 hour | On config change |
| Grade scales | Redis | 1 hour | On grade scale change |
| Marks grid | **Not cached** | — | Always fresh |
| Computed results | Memory (per request) | — | Fresh per compute call |
| Student report cards | Redis | 10 min | On marks or config change |

### Batch Operations

```python
# Bulk marks save using PostgreSQL 15+ ON CONFLICT
from django.db.models import F, Value

def bulk_save_marks(entries: list[MarksEntryInput]):
    objs = [MarksEntry(**e) for e in entries]
    MarksEntry.objects.bulk_create(
        objs,
        update_conflicts=True,
        update_fields=["marks_value", "grade_value", "descriptive_value", "is_absent", "remarks"],
        unique_fields=["enrollment_id", "subject_id", "assessment_component_id"],
    )
```

### Response Compression

Enable `GZipMiddleware` for all API responses. A marks grid response with 360 cells compresses from ~50KB to ~8KB.

---

## 20. Frontend Component Architecture

### Component Tree

```
App
├── QueryProvider
├── AuthProvider
└── Router
    ├── AdminLayout
    │   ├── Sidebar (with grouped nav items)
    │   ├── Header
    │   └── Page Content
    │       ├── ResultConfigPage           ← UNIFIED CONFIG PAGE
    │       │   ├── SessionClassFilter
    │       │   ├── SubjectsSection
    │       │   │   ├── InlineSubjectTable
    │       │   │   └── AddSubjectModal
    │       │   ├── AcademicStructureSection
    │       │   │   ├── TermAccordion
    │       │   │   │   ├── ExamAccordion
    │       │   │   │   │   └── ComponentChip
    │       │   │   │   └── AddExamButton
    │       │   │   └── AddTermButton
    │       │   ├── ConfigMatrixSection
    │       │   │   └── ConfigMatrix (spreadsheet)
    │       │   ├── GradeScaleSection
    │       │   │   ├── GradeScaleSelector
    │       │   │   └── GradeRuleTable (editable)
    │       │   ├── PromotionSection
    │       │   │   └── PromotionForm
    │       │   └── SaveButton
    │       │
    │       ├── MarksEntryPage             ← SPREADSHEET MARKS ENTRY
    │       │   ├── SessionClassSectionFilter
    │       │   ├── AutoSaveIndicator
    │       │   └── MarksGrid
    │       │       ├── GridHeader (grouped columns)
    │       │       ├── GridBody (virtualized)
    │       │       │   └── MarksRow
    │       │       │       ├── StudentInfoCell
    │       │       │       ├── NumericCell
    │       │       │       ├── GradeCell (dropdown)
    │       │       │       ├── DescriptiveCell (popup)
    │       │       │       └── AbsentToggle
    │       │       └── GridFooter (status bar)
    │       │
    │       └── ResultsPage                ← RESULT GENERATION + PUBLICATION
    │           ├── SessionClassSectionFilter
    │           ├── PublicationStatusCard
    │           ├── ResultsTable
    │           │   └── ResultRow (expandable)
    │           └── PromotionTab
    │               ├── PromotionPreviewTable
    │               └── ExecutePromotionDialog
    │
    ├── TeacherLayout
    │   └── MarksPage (reuses MarksGrid with teacher filter)
    │
    └── StudentLayout
        └── ResultsPage (read-only)
```

---

## 21. Reusable Components

### New Shared Components

| Component | Props | Description |
|-----------|-------|-------------|
| `SpreadsheetGrid` | `columns, rows, cellRenderer, onCellChange, keyboardNav` | Base spreadsheet with keyboard navigation, virtual scrolling, auto-save hooks |
| `EditableCell` | `value, type, options, onChange, validation, isActive` | Single editable cell. Type: 'number', 'select', 'text', 'grade', 'absent' |
| `SessionClassFilter` | `sessionId, classId, onChange, showSection?` | Reusable pair/triple of cascading filter selects |
| `SessionClassSectionFilter` | `sessionId, classId, sectionId, onChange` | Triple filter with section |
| `AutoSaveIndicator` | `status, lastSaved, onSaveAll` | Shows save state with debounce |
| `StatusBar` | `stats: { total, filled, empty, errors, absent }` | Grid completion statistics |
| `AccordionGroup` | `title, children, defaultOpen` | Collapsible section (used for terms/exams) |
| `InlineTable` | `columns, rows, onAddRow, onDeleteRow, onCellChange` | Editable table with add/remove |
| `ColumnGroup` | `title, colSpan, children` | Groups columns under a spanned header |

### Existing Components (keep)

- `Sidebar` — Add section/group support
- `Header` — Unchanged
- `Button`, `Input`, `Select`, `Modal` — Unchanged
- `Badge`, `Card`, `Table`, `Tabs` — Unchanged
- `SearchSelect` — Keep (used in AddSubjectModal)
- `ConfirmDialog` — Keep (used for destructive actions)

---

## 22. State Management

### Three Layers

```
┌─────────────────────────────────────────────┐
│  Zustand (Auth)                              │
│  user, tokens, isAuthenticated, login/logout │
│  Persisted to localStorage                   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  React Query (Server State)                  │
│  All API data cached and synchronized        │
│  Query key conventions (below)               │
│  Optimistic updates for marks grid           │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  React State (UI State)                      │
│  Active filters, editing cell, keyboard pos  │
│  Modal open/close states                     │
│  Unsaved changes tracking                    │
└─────────────────────────────────────────────┘
```

### Query Key Convention

```typescript
// Master data (rarely changes)
['sessions']
['classes']
['subjects']
['subject-categories']
['subject-groups']

// Result Configuration
['result-config', sessionId, classId]
['grade-scales', sessionId]
['promotion-rules', sessionId, classId]

// Marks Entry
['marks-grid', sessionId, classId, sectionId]

// Results
['results', sessionId, classId, sectionId]
['publication', sessionId, classId, sectionId]

// Student-facing
['report-card', enrollmentId]
['student-results', userId]
```

### Optimistic Updates for Marks

```typescript
const useUpdateCell = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CellUpdate) => marksApi.updateCell(data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['marks-grid', ...] });
      const previous = queryClient.getQueryData(['marks-grid', ...]);
      queryClient.setQueryData(['marks-grid', ...], (old) =>
        applyCellUpdate(old, newData)
      );
      return { previous };
    },
    onError: (err, newData, context) => {
      queryClient.setQueryData(['marks-grid', ...], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['marks-grid', ...] });
    },
  });
};
```

---

## 23. Performance Optimization

### Frontend

| Technique | Where | Why |
|-----------|-------|-----|
| Virtual scrolling (`react-window`) | MarksGrid body | 40+ rows × 15 cols = 600 cells; render only visible |
| Debounced auto-save (500ms) | MarksGrid cell edit | Prevents API flood during fast typing |
| Memoized column headers | ConfigMatrix, MarksGrid | Header structure derived from terms/exams/components |
| Memoized sorted rows | MarksGrid rows | Students sorted by roll_no, stable reference |
| Lazy section loading | ResultConfig page | Grade scale and promotion rules load after subjects + matrix |
| React.memo on row components | MarksRow, MatrixRow | Prevents re-render of unchanged rows |
| Image lazy loading | Student list | Profile pictures not critical for data entry |

### Backend

| Technique | Where | Why |
|-----------|-------|-----|
| `bulk_create(update_conflicts=True)` | Marks bulk save | 1-2 queries instead of hundreds of individual saves |
| `.only()` / `.defer()` | All read queries | Fetch only columns needed for response |
| `select_related()` / `prefetch_related()` | All queries | Eliminate N+1 queries |
| `GZipMiddleware` | All API responses | Marks grid compresses 50KB → 8KB |
| Redis cache | Grade scales, component structure | Read-heavy, write-rare data |
| Synchronous computation | Result calculation | <100ms for typical class; no Celery overhead needed |
| Celery for batch PDF | PDF generation | PDF rendering is CPU-intensive |

### Data Transfer Size

| Endpoint | Uncompressed | Compressed (gzip) |
|----------|-------------|-------------------|
| GET /result-config/ | ~15KB | ~3KB |
| GET /marks-grid/ (30 students, 6 subjects, 12 components) | ~50KB | ~8KB |
| GET /results/ (30 students) | ~40KB | ~6KB |

---

## 24. Security Considerations

### Role-Based Access

| Feature | Admin | Teacher | Student |
|---------|-------|---------|---------|
| Result Configuration | Full CRUD | Read-only | None |
| Subjects / Categories | Full CRUD | Read-only | None |
| Marks Entry | All subjects | Assigned subjects only | None |
| Compute Results | All classes | Own classes | None |
| Publish Results | All classes | None | None |
| View Own Results | All students | N/A | Self only |
| View Report Card | All students | Own classes | Self only |
| Grade Scales | Full CRUD | Read-only | None |
| Promotion Rules | Full CRUD | Read-only | None |

### API Security

1. **All endpoints require authentication** (DRF default: `IsAuthenticated`)
2. **View-level permissions**: Custom `IsAdmin`, `IsTeacher`, `IsAdminOrTeacher`, `IsStudent`
3. **Object-level permissions** for marks entry:
   - Teacher can only save marks for their assigned `(class, section, subject, session)`
   - Enforced in `MarksService.bulk_save()` via teacher assignment lookup
4. **Publication lock**: When `status = "published"`, marks entry API rejects all writes
5. **Input validation**:
   - `marks_value`: `0 <= value <= component_config.full_marks`
   - `grade_value`: Must exist in the class's selected grade scale
   - `is_absent`: If true, all value fields must be null
6. **Rate limiting**: 100 req/min on marks bulk save endpoint
7. **Audit logging**: Every config change, marks change, and publication action logged via `AuditLog`

### Data Isolation

- Student users can only access their own data via the student portal API
- `StudentPortalView` filters by `request.user.student_profile`
- Teacher users can only access data for their assigned classes/sections/subjects

---

## 25. Migration Strategy

### Phase 1: Create New Tables (backward compatible)

1. Create `subject_groups` table
2. Add `group_id` FK to `subjects` (nullable)
3. Add `group_id` FK to `class_subjects` (nullable)
4. Add `display_order` to `class_subjects`
5. Rename `exam_components` → `assessment_components` (via DB migration with proxy model)
6. Rename `subject_assessment_schemes` → `assessment_component_configs`
7. Rename `grade_policy_sets` → `grade_scales`
8. Rename `grade_policy_grades` → `grade_rules`

### Phase 2: Data Migration

```python
def migrate_subject_groups(apps, schema_editor):
    """Create SubjectGroups from existing ClassSubject groups."""
    SubjectCategory = apps.get_model('academics', 'SubjectCategory')
    SubjectGroup = apps.get_model('academics', 'SubjectGroup')
    ClassSubject = apps.get_model('academics', 'ClassSubject')

    # Create default groups for each category
    for category in SubjectCategory.objects.all():
        for group_name in ['Languages', 'Sciences', 'Mathematics', 'Social Sciences',
                            'Activities', 'Skills']:
            SubjectGroup.objects.get_or_create(
                name=group_name,
                category=category,
                defaults={'code': f"{category.code}_{group_name.upper()}", 'display_order': 0}
            )

def migrate_table_renames(apps, schema_editor):
    """All renamed tables use db_table change — data stays in place."""
    pass  # Only db_table meta changes needed
```

### Phase 3: Build New API Layer

1. Implement `GET/PUT /api/v1/result-config/{session}/{class}/`
2. Implement `GET/POST /api/v1/marks-entry/{session}/{class}/`
3. Implement new results and publication endpoints
4. All new endpoints coexist with old ones

### Phase 4: Frontend Migration

1. Build new pages at new routes:
   - `/admin/result-config` (new)
   - `/admin/marks-entry` (redesigned)
   - `/admin/results` (redesigned)
2. Keep old pages accessible via direct URL
3. Update sidebar to point to new pages
4. Add deprecation notice to old pages

### Phase 5: Remove Old Code

1. Mark old API endpoints as `deprecated` in drf-spectacular
2. After one release cycle, remove old endpoints
3. Remove old tables (see list in section 4)
4. Remove deprecated model classes

### Phase 6: Cleanup

1. Remove unused frontend pages (template builder, old assessment schemes, etc.)
2. Remove unused frontend API modules
3. Remove unused backend serializer/view files
4. Run full test suite
5. Verify with real data

### Safety Guarantees

- **Each migration is reversible** — every migration has a `migrate_back` function
- **No data loss** — old tables dropped only after data verified in new tables
- **Rollback window** — old and new APIs coexist for one full release cycle
- **Testing requirement** — all migrations tested against anonymized production data in staging
- **Monitoring** — every migration step logs progress and errors; failed steps abort without side effects
