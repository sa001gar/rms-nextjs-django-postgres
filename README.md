# RMS - Result Management System : By Sagar Kundu

A production-grade Result Management System built with Django 6+ and Next.js 16+.

## Architecture

- **Backend**: Django Modular Monolith with Service-Repository architecture
- **Frontend**: Next.js with App Router, React Query, shadcn/ui
- **Database**: PostgreSQL 17+
- **Cache**: Redis 7+
- **Tasks**: Celery with Redis broker
- **Deployment**: Docker + Dokploy

## Modules

| Module | Purpose |
|--------|---------|
| `core` | Authentication, JWT, User model |
| `identity` | Admin and Teacher profiles |
| `academics` | Sessions, Classes, Sections, Subjects, Assessments, Grading, Teacher Assignments |
| `enrollments` | Students, Enrollments, Class Teachers |
| `results` | Marks Entry, Subject Results |
| `reporting` | Report Cards, Marksheets, Rankings |

## Quick Start

### Development

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data
python manage.py runserver

# Frontend
cd frontend
pnpm install
pnpm dev
```

### Docker Development

```bash
docker-compose up -d
```

### Production (Dokploy)

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Environment Variables

See `.env.example` for required environment variables.

## API Documentation

Once running, visit `/api/docs/` for Swagger UI documentation.

## Default Users (Development)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@school.com | admin123 |
| Teacher | teacher@school.com | teacher123 |
