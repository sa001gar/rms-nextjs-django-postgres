# ==========================================
# RMS Backend - Production Dockerfile
# Multi-stage build for minimal image size
# ==========================================

# Stage 1: Build dependencies
FROM python:3.14-slim AS builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir uv && uv pip install --system --prefix=/install -r requirements.txt

ENV PATH="/install/bin:$PATH" \
    PYTHONPATH="/install/lib/python3.14/site-packages:$PYTHONPATH"

# Stage 2: Production image
FROM python:3.14-slim AS production

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings.production

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages
COPY --from=builder /install /usr/local

# Create non-root user
RUN groupadd -r rms && useradd -r -g rms -d /app -s /sbin/nologin rms

# Set work directory
WORKDIR /app

# Copy application code
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput --settings=config.settings.production

# Change ownership
RUN chown -R rms:rms /app

# Switch to non-root user
USER rms

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/health/')" || exit 1

# Run with gunicorn
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
