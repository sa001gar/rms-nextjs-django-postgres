"""Management command to seed development data."""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


User = get_user_model()


class Command(BaseCommand):
    help = "Seed development database with sample data"

    def handle(self, *args, **options):
        self.stdout.write("Seeding development data...")

        # Create admin user
        admin, created = User.objects.get_or_create(
            email="admin@school.com",
            defaults={
                "username": "admin",
                "role": "admin",
                "is_staff": True,
                "is_superuser": True,
                "first_name": "Admin",
                "last_name": "User",
            },
        )
        if created:
            admin.set_password("admin123")
            admin.save()
            self.stdout.write(self.style.SUCCESS(f"Created admin: admin@school.com / admin123"))  # type: ignore

            from identity.models import AdminProfile
            AdminProfile.objects.get_or_create(
                user=admin, defaults={"name": "School Admin"}
            )

        # Create teacher user
        teacher, created = User.objects.get_or_create(
            email="teacher@school.com",
            defaults={
                "username": "teacher",
                "role": "teacher",
                "first_name": "Teacher",
                "last_name": "User",
            },
        )
        if created:
            teacher.set_password("teacher123")
            teacher.save()
            self.stdout.write(self.style.SUCCESS(f"Created teacher: teacher@school.com / teacher123"))  # type: ignore

            from identity.models import TeacherProfile
            TeacherProfile.objects.get_or_create(
                user=teacher, defaults={"name": "Sample Teacher"}
            )

        # Create academic session
        from academics.models import AcademicSession
        session, created = AcademicSession.objects.get_or_create(
            name="2025-2026",
            defaults={
                "start_date": "2025-04-01",
                "end_date": "2026-03-31",
                "is_active": True,
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created session: 2025-2026"))  # type: ignore

        # Create classes
        from academics.models import Class, Section
        classes_data = [
            ("Class 1", 1), ("Class 2", 2), ("Class 3", 3),
            ("Class 4", 4), ("Class 5", 5), ("Class 6", 6),
            ("Class 7", 7), ("Class 8", 8), ("Class 9", 9), ("Class 10", 10),
        ]
        for name, level in classes_data:
            cls, _ = Class.objects.get_or_create(name=name, defaults={"level": level})
            for section_name in ["A", "B"]:
                Section.objects.get_or_create(
                    name=section_name, class_ref=cls
                )

        # Create subject categories
        from academics.models import SubjectCategory
        cat_scholastic, _ = SubjectCategory.objects.get_or_create(
            code="scholastic",
            defaults={"name": "Scholastic", "is_scholastic": True, "display_order": 1},
        )
        cat_optional, _ = SubjectCategory.objects.get_or_create(
            code="optional",
            defaults={"name": "Optional", "is_scholastic": True, "display_order": 2},
        )
        cat_cocurricular, _ = SubjectCategory.objects.get_or_create(
            code="cocurricular",
            defaults={"name": "Co-Scholastic", "is_scholastic": False, "display_order": 3},
        )

        # Create subjects
        from academics.models import Subject
        subjects_data = [
            ("Mathematics", "MATH", cat_scholastic),
            ("English", "ENG", cat_scholastic),
            ("Science", "SCI", cat_scholastic),
            ("Social Studies", "SST", cat_scholastic),
            ("Hindi", "HIN", cat_scholastic),
            ("Computer Science", "CS", cat_optional),
            ("Physical Education", "PE", cat_cocurricular),
            ("Art", "ART", cat_cocurricular),
        ]
        for name, code, cat in subjects_data:
            Subject.objects.get_or_create(
                code=code,
                defaults={"name": name, "subject_category": cat},
            )

        # Create exams and exam components
        from academics.models import Exam, ExamComponent

        term1_exam, _ = Exam.objects.get_or_create(
            session=session, name="First Term",
            defaults={"display_order": 1},
        )
        term2_exam, _ = Exam.objects.get_or_create(
            session=session, name="Second Term",
            defaults={"display_order": 2},
        )

        for exam, components in [
            (term1_exam, [("MTT1", 20, 1), ("TERM1", 80, 2)]),
            (term2_exam, [("MTT2", 20, 1), ("TERM2", 80, 2)]),
        ]:
            for name, full_marks, order in components:
                ExamComponent.objects.get_or_create(
                    exam=exam, parent=None, name=name,
                    defaults={"code": name, "full_marks": full_marks, "display_order": order},
                )

        # Create grade policy set
        from academics.models import GradePolicySet, GradePolicyGrade
        policy_set, _ = GradePolicySet.objects.get_or_create(
            session=session, name="Default",
            defaults={"is_active": True},
        )
        grades = [
            ("AA", 90, 100, 10.0, 1),
            ("A+", 75, 89.99, 9.0, 2),
            ("A", 60, 74.99, 8.0, 3),
            ("B+", 45, 59.99, 7.0, 4),
            ("B", 33, 44.99, 6.0, 5),
            ("C", 20, 32.99, 4.0, 6),
            ("D", 0, 19.99, 2.0, 7),
        ]
        for label, min_p, max_p, gp, order in grades:
            GradePolicyGrade.objects.get_or_create(
                grade_policy_set=policy_set, grade_label=label,
                defaults={
                    "min_percentage": min_p, "max_percentage": max_p,
                    "grade_point": gp, "display_order": order,
                },
            )

        # Create sample students
        from enrollments.models import Student
        from academics.models import Class, Section

        students_data = [
            ("Rahul Sharma", "2005-03-15", "Rajesh Sharma", "Priya Sharma", "9876543210", "Class 10", "A", "REG2025001", "101"),
            ("Priya Patel", "2005-07-22", "Amit Patel", "Sunita Patel", "9876543211", "Class 10", "A", "REG2025002", "102"),
            ("Amit Kumar", "2005-01-10", "Vijay Kumar", "Meena Kumar", "9876543212", "Class 10", "B", "REG2025003", "101"),
            ("Sneha Singh", "2005-11-05", "Ravi Singh", "Kavita Singh", "9876543213", "Class 10", "B", "REG2025004", "102"),
            ("Rohan Gupta", "2005-09-18", "Anil Gupta", "Ritu Gupta", "9876543214", "Class 9", "A", "REG2025005", "901"),
        ]

        for name, dob, father, mother, phone, class_name, section_name, reg_num, roll_no in students_data:
            user_email = f"{reg_num.lower()}@student.local"

            user, created = User.objects.get_or_create(
                email=user_email,
                defaults={
                    "username": reg_num.lower(),
                    "role": "student",
                    "first_name": name.split()[0],
                    "last_name": " ".join(name.split()[1:]),
                },
            )
            if created or not created: # Proceed whether created or not
                from datetime import datetime
                dob_date = datetime.strptime(dob, "%Y-%m-%d").date()
                default_password = dob_date.strftime("%d%m%Y")
                
                if created:
                    user.set_password(default_password)
                    user.save()

                cls = Class.objects.filter(name=class_name).first()
                section = Section.objects.filter(name=section_name, class_ref=cls).first() if cls else None

                student, student_created = Student.objects.get_or_create(
                    registration_number=reg_num,
                    defaults={
                        "user": user,
                        "student_id": Student.generate_student_id(),
                        "name": name,
                        "date_of_birth": dob,
                        "father_name": father,
                        "mother_name": mother,
                        "phone": phone,
                        "admission_class": cls,
                        "admission_session": session,
                    },
                )

                if student_created and cls and section and session:
                    from enrollments.models import Enrollment
                    Enrollment.objects.get_or_create(
                        student=student,
                        session=session,
                        defaults={
                            "class_field": cls,
                            "section": section,
                            "roll_no": roll_no,
                            "status": "active",
                        }
                    )

                if student_created:
                    self.stdout.write(self.style.SUCCESS(  # type: ignore
                        f"Created student: {name} ({student.student_id}) / {default_password}"
                    ))

        self.stdout.write(self.style.SUCCESS("Development data seeded successfully!"))  # type: ignore
