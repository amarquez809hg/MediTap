from django.contrib import admin
from . import models

admin.site.register(models.Patient)
admin.site.register(models.Hospital)
admin.site.register(models.HospitalUser)
admin.site.register(models.AllergyCatalog)
admin.site.register(models.MedicationCatalog)
admin.site.register(models.PatientAllergy)
admin.site.register(models.PatientMedication)
admin.site.register(models.InsuranceProvider)
admin.site.register(models.InsurancePolicy)
admin.site.register(models.PatientInsurance)
admin.site.register(models.Incident)
admin.site.register(models.LabResult)
admin.site.register(models.PatientLabPanel)
admin.site.register(models.ChronicDiseaseCatalog)
admin.site.register(models.PatientChronicDisease)