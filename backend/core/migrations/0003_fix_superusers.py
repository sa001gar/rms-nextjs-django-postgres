from django.db import migrations

def fix_existing_superusers(apps, schema_editor):
    User = apps.get_model('core', 'User')
    AdminProfile = apps.get_model('identity', 'AdminProfile')
    
    # Get all superusers
    superusers = User.objects.filter(is_superuser=True)
    for su in superusers:
        if su.role != 'admin':
            su.role = 'admin'
            su.save(update_fields=['role'])
        
        # Ensure AdminProfile exists
        AdminProfile.objects.get_or_create(user=su, defaults={'name': 'Admin'})

class Migration(migrations.Migration):
    dependencies = [
        ('core', '0002_alter_user_managers'),
        ('identity', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(fix_existing_superusers, reverse_code=migrations.RunPython.noop),
    ]
