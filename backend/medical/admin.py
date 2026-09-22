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
admin.site.register(models.EpicPatientLink)
admin.site.register(models.PatientAppointment)
admin.site.register(models.AdminActivityEvent)
admin.site.register(models.PatientDocument)


@admin.register(models.PatientCard)
class PatientCardAdmin(admin.ModelAdmin):
    exclude = ("sdm_meta_key", "sdm_file_key")
    readonly_fields = ("sdm_read_counter",)
