"""Abstract base model with UUID PK and timestamps."""

import uuid
from django.db import models
from django.utils import timezone


class BaseModel(models.Model):
    """Base model with UUID primary key and timestamp fields."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    objects = models.Manager()

    class Meta:
        abstract = True
        ordering = ["-created_at"]
