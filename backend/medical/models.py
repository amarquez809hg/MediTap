from django.db import models
from django.contrib.auth.models import User
import uuid

# ---------- Core ----------
class Patient(models.Model):
    patient_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    given_name = models.CharField(max_length=100)
    family_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    blood_type = models.CharField(max_length=3, blank=True, null=True)
    sex_at_birth = models.CharField(max_length=32, blank=True, null=True)
    email = models.EmailField(blank=True, null=True, unique=True)
    phone = models.CharField(max_length=32, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.family_name}, {self.given_name}"

class Hospital(models.Model):
    hospital_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    address_line1 = models.CharField(max_length=200, blank=True, null=True)
    address_line2 = models.CharField(max_length=200, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    region = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

# Link a Django user to a hospital (staff/admin)
class HospitalUser(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="hospital_user")
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name="users")
    role = models.CharField(max_length=32, choices=[("HOSPITAL_ADMIN","HOSPITAL_ADMIN"),("HOSPITAL_STAFF","HOSPITAL_STAFF")], default="HOSPITAL_STAFF")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} @ {self.hospital.name}"

# ---------- Catalogs ----------
class AllergyCatalog(models.Model):
    allergy_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class MedicationCatalog(models.Model):
    medication_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    generic_name = models.CharField(max_length=120)
    brand_name = models.CharField(max_length=120, blank=True, null=True)
    atc_code = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("generic_name", "brand_name")

    def __str__(self):
        return self.generic_name

# ---------- Patient <-> Catalog relations ----------
class PatientAllergy(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="allergies")
    allergy = models.ForeignKey(AllergyCatalog, on_delete=models.CASCADE)
    severity = models.CharField(max_length=32, blank=True, null=True)
    reaction_notes = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("patient", "allergy")

class PatientMedication(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="medications")
    medication = models.ForeignKey(MedicationCatalog, on_delete=models.CASCADE)
    dosage = models.CharField(max_length=64, blank=True, null=True)          # e.g., "10 mg tablet"
    route = models.CharField(max_length=64, blank=True, null=True)           # oral, injection
    frequency = models.CharField(max_length=64, blank=True, null=True)       # "twice daily"
    dosing_instructions = models.TextField(blank=True, null=True)            # NEW free-form instructions
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    prescribing_hospital = models.ForeignKey(Hospital, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("patient", "medication", "start_date")

# ---------- Insurance ----------
class InsuranceProvider(models.Model):
    provider_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    phone = models.CharField(max_length=64, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    website = models.URLField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class InsurancePolicy(models.Model):
    policy_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.ForeignKey(InsuranceProvider, on_delete=models.CASCADE, related_name="policies")
    policy_number = models.CharField(max_length=120)
    plan_name = models.CharField(max_length=120, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("provider", "policy_number")

class PatientInsurance(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="policies")
    policy = models.ForeignKey(InsurancePolicy, on_delete=models.CASCADE)
    member_id = models.CharField(max_length=120, blank=True, null=True)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    # Tab12 extended display / copay / deductible text (JSON, optional)
    coverage_details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("patient", "policy")

# ---------- Incidents (visits/encounters) ----------
class Incident(models.Model):
    incident_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="incidents")
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name="incidents")
    created_by_user = models.ForeignKey(User, on_delete=models.PROTECT)
    occurred_at = models.DateTimeField()
    incident_type = models.CharField(max_length=120)  # ER Visit, Surgery, Oncology, etc.
    summary = models.TextField()
    clinical_notes = models.TextField(blank=True, null=True)
    diagnosis_code = models.CharField(max_length=40, blank=True, null=True)
    procedure_code = models.CharField(max_length=40, blank=True, null=True)
    related_policy = models.ForeignKey(InsurancePolicy, on_delete=models.SET_NULL, null=True, blank=True)
    insurance_claim_no = models.CharField(max_length=120, blank=True, null=True)

    # NEW fields requested
    amount_due_to_insurance = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True) # patient copay/amount not covered
    lab_results_summary = models.TextField(blank=True, null=True)
    lab_documents_url = models.URLField(blank=True, null=True)  # or GCS path if you prefer
    home_instructions = models.TextField(blank=True, null=True) # discharge plan

    # Patient-facing incident log (Tab6): severity, location, outcome, display code
    severity = models.CharField(max_length=32, blank=True, null=True)
    location = models.CharField(max_length=200, blank=True, null=True)
    outcome = models.TextField(blank=True, null=True)
    record_code = models.CharField(
        max_length=40,
        blank=True,
        null=True,
        help_text="Human-readable id shown in the app, e.g. I-2024-005",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

# Optional: detailed lab results table (multi-per-incident)
class LabResult(models.Model):
    lab_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name="lab_results")
    test_name = models.CharField(max_length=120)                # e.g., "CBC", "MRI Thorax"
    result_summary = models.TextField(blank=True, null=True)
    document_url = models.URLField(blank=True, null=True)       # link to file in storage
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

# ---------- Patient lab panels (Tab7; components JSON matches SPA LabResultLineItem[]) ----------
class PatientLabPanel(models.Model):
    """Structured lab panel for a patient (separate from per-incident LabResult)."""

    lab_panel_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="lab_panels")
    display_code = models.CharField(
        max_length=40,
        blank=True,
        null=True,
        help_text="Optional human-readable id, e.g. L-2024-001",
    )
    test_name = models.CharField(max_length=200)
    collected_on = models.DateField()
    status = models.CharField(max_length=32, default="Reviewed")
    is_new = models.BooleanField(default=False)
    components = models.JSONField(
        default=list,
        blank=True,
        help_text='List of {name, value, unit, range, critical, interpretation?}',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-collected_on", "-created_at"]

    def __str__(self):
        return f"{self.test_name} ({self.collected_on})"

# ---------- Chronic conditions ----------
class ChronicDiseaseCatalog(models.Model):
    disease_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True, null=True)
    icd10_code = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class PatientChronicDisease(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="chronic_conditions")
    disease = models.ForeignKey(ChronicDiseaseCatalog, on_delete=models.CASCADE)
    diagnosis_date = models.DateField(blank=True, null=True)
    severity = models.CharField(max_length=32, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    medication = models.ForeignKey(MedicationCatalog, on_delete=models.SET_NULL, null=True, blank=True)
    pre_existing = models.BooleanField(default=False)   # NEW flag
    notes = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("patient", "disease")


# ---------- External FHIR (Epic sandbox / SMART) ----------
class EpicPatientLink(models.Model):
    """
    Read-only Epic linkage for a MediTap patient (OAuth + FHIR reads; no token persistence).
    """

    STATUS_DISCONNECTED = "disconnected"
    STATUS_PENDING_AUTH = "pending_auth"
    STATUS_CONNECTED = "connected"
    STATUS_ERROR = "error"
    STATUS_CHOICES = (
        (STATUS_DISCONNECTED, "Disconnected"),
        (STATUS_PENDING_AUTH, "Pending authorization"),
        (STATUS_CONNECTED, "Connected"),
        (STATUS_ERROR, "Error"),
    )

    patient = models.OneToOneField(
        Patient,
        on_delete=models.CASCADE,
        related_name="epic_link",
    )
    status = models.CharField(
        max_length=32,
        choices=STATUS_CHOICES,
        default=STATUS_DISCONNECTED,
    )
    epic_patient_fhir_id = models.CharField(
        max_length=128,
        blank=True,
        help_text="Epic FHIR Patient.id after SMART authorize (or manual sandbox id for demos).",
    )
    fhir_server_base_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="FHIR base URL used when this link was established (sandbox issuer).",
    )
    last_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"EpicLink({self.patient_id}, {self.status})"