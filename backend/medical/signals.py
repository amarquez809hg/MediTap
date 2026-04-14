from django.db.models.signals import post_save
from django.dispatch import receiver

from medical.lab_seed_data import seed_default_lab_panels_if_empty
from medical.models import Patient


@receiver(post_save, sender=Patient)
def seed_demo_lab_panels_for_new_patient(sender, instance, created, **kwargs):
    if not created:
        return
    seed_default_lab_panels_if_empty(instance)
