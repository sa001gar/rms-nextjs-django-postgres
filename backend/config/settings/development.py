"""Development settings."""

from .base import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ["*"]

# CORS
CORS_ALLOW_ALL_ORIGINS = True

import os
from urllib.parse import urlparse, parse_qsl

# Database
if "DATABASE_URL" in os.environ:
    tmp_postgres = urlparse(os.environ["DATABASE_URL"])
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": tmp_postgres.path.replace("/", ""),
            "USER": tmp_postgres.username,
            "PASSWORD": tmp_postgres.password,
            "HOST": tmp_postgres.hostname,
            "PORT": tmp_postgres.port or 5432,
            "OPTIONS": dict(parse_qsl(tmp_postgres.query)),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# Cache and Celery
if "REDIS_URL" in os.environ:
    REDIS_URL = os.environ["REDIS_URL"]
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
            "TIMEOUT": 300,
        }
    }
    CELERY_BROKER_URL = REDIS_URL
    CELERY_RESULT_BACKEND = REDIS_URL
    CELERY_ACCEPT_CONTENT = ["json"]
    CELERY_TASK_SERIALIZER = "json"
    CELERY_RESULT_SERIALIZER = "json"
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "unique-snowflake",
            "TIMEOUT": 300,
            "OPTIONS": {"MAX_ENTRIES": 1000},
        }
    }


# JWT - longer for dev
SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"] = timedelta(hours=12)  # noqa: F405
