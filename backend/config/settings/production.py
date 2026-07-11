"""Production settings."""

import os
from urllib.parse import urlparse, parse_qsl

from .base import *  # noqa: F401, F403

DEBUG = False

SECRET_KEY = os.environ.get("SECRET_KEY", SECRET_KEY)  # noqa: F405
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "").split(",")

# Database
tmp_postgres = urlparse(os.environ.get("DATABASE_URL", ""))
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": tmp_postgres.path.replace("/", ""),
        "USER": tmp_postgres.username,
        "PASSWORD": tmp_postgres.password,
        "HOST": tmp_postgres.hostname,
        "PORT": 5432,
        "OPTIONS": dict(parse_qsl(tmp_postgres.query)),
        "CONN_MAX_AGE": 600,
        "CONN_HEALTH_CHECKS": True,
    }
}

# Redis
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
        "TIMEOUT": 300,
    }
}

# CORS
CORS_ALLOWED_ORIGINS = os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",")
CORS_ALLOW_CREDENTIALS = True

# Security
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# Celery
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", REDIS_URL)
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE  # noqa: F405
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_TASK_SOFT_TIME_LIMIT = 300
CELERY_TASK_TIME_LIMIT = 600

# R2 Storage
USE_R2_STORAGE = os.environ.get("USE_R2_STORAGE", "False").lower() == "true"
if USE_R2_STORAGE:
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": {
                "access_key": os.environ.get("R2_ACCESS_KEY_ID"),
                "secret_key": os.environ.get("R2_SECRET_ACCESS_KEY"),
                "bucket_name": os.environ.get("R2_BUCKET_NAME", "rms-media"),
                "endpoint_url": os.environ.get("R2_ENDPOINT_URL"),
                "default_acl": None,
                "querystring_auth": True,
                "querystring_expire": 3600,
                "file_overwrite": False,
                "region_name": "auto",
            },
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
    MEDIA_URL = os.environ.get("R2_PUBLIC_URL", "media/")

# Structured logging for production
LOGGING["formatters"]["json"]["processors"] = [  # noqa: F405
    "structlog.stdlib.ProcessorFormatter.remove_processors_meta",
    "structlog.processors.JSONRenderer",
]
LOGGING["handlers"]["console"]["formatter"] = "json"
