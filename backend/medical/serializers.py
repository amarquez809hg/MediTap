from rest_framework import serializers
from . import models

class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Patient
        fields = "__all__"
        read_only_fields = ("portal_user",)

class HospitalSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Hospital
        fields = "__all__"

class IncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Incident
        fields = "__all__"
        extra_kwargs = {"created_by_user": {"required": False}}

class MedicationCatalogSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.MedicationCatalog
        fields = "__all__"

class PatientMedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.PatientMedication
        fields = "__all__"

class AllergyCatalogSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.AllergyCatalog
        fields = "__all__"

class PatientAllergySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.PatientAllergy
        fields = "__all__"
        extra_kwargs = {"recorded_by": {"required": False}}

class InsuranceProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.InsuranceProvider
        fields = "__all__"

class InsurancePolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.InsurancePolicy
        fields = "__all__"

class PatientInsuranceSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.PatientInsurance
        fields = "__all__"

class ChronicDiseaseCatalogSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ChronicDiseaseCatalog
        fields = "__all__"

class PatientChronicDiseaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.PatientChronicDisease
        fields = "__all__"

class LabResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.LabResult
        fields = "__all__"


class PatientLabPanelSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.PatientLabPanel
        fields = "__all__"

    def validate_components(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("components must be a JSON array.")
        required = ("name", "unit", "range", "critical")
        for i, item in enumerate(value):
            if not isinstance(item, dict):
                raise serializers.ValidationError(f"components[{i}] must be an object.")
            for k in required:
                if k not in item:
                    raise serializers.ValidationError(
                        f"components[{i}] missing required key {k!r}."
                    )
            if not isinstance(item["critical"], bool):
                raise serializers.ValidationError(
                    f"components[{i}].critical must be a boolean."
                )
            v = item.get("value", None)
            text_value = item.get("textValue", item.get("text_value", None))
            if v is not None:
                if isinstance(v, bool) or not isinstance(v, (int, float)):
                    raise serializers.ValidationError(
                        f"components[{i}].value must be a number when provided."
                    )
            if text_value is not None and not isinstance(text_value, str):
                raise serializers.ValidationError(
                    f"components[{i}].textValue must be a string or omitted."
                )
            if v is None and not (isinstance(text_value, str) and text_value.strip()):
                raise serializers.ValidationError(
                    f"components[{i}] requires value or textValue."
                )
            interp = item.get("interpretation")
            if interp is not None and not isinstance(interp, str):
                raise serializers.ValidationError(
                    f"components[{i}].interpretation must be a string or omitted."
                )
        return value


class EpicPatientLinkSerializer(serializers.ModelSerializer):
    patient = serializers.UUIDField(source="patient_id", read_only=True)

    class Meta:
        model = models.EpicPatientLink
        fields = (
            "patient",
            "status",
            "epic_patient_fhir_id",
            "fhir_server_base_url",
            "last_error",
            "last_sync_at",
            "last_sync_summary",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "patient",
            "last_error",
            "last_sync_at",
            "last_sync_summary",
            "created_at",
            "updated_at",
        )


class PatientAppointmentSerializer(serializers.ModelSerializer):
    """JSON shape matches Tab4 Appointment fields (camelCase mapped in the SPA)."""

    date = serializers.CharField(source="date_label")
    time = serializers.CharField(source="time_label")
    type = serializers.CharField(source="visit_type")
    reasonForVisit = serializers.CharField(
        source="reason_for_visit", required=False, allow_blank=True
    )
    appointmentId = serializers.CharField(
        source="display_code", required=False, allow_blank=True
    )
    patientInstructions = serializers.CharField(
        source="patient_instructions", required=False, allow_blank=True
    )
    clinicalNotes = serializers.CharField(
        source="clinical_notes", required=False, allow_blank=True
    )

    class Meta:
        model = models.PatientAppointment
        fields = (
            "appointment_id",
            "patient",
            "appointmentId",
            "date",
            "time",
            "specialist",
            "department",
            "type",
            "status",
            "reasonForVisit",
            "location",
            "duration",
            "patientInstructions",
            "clinicalNotes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("appointment_id", "created_at", "updated_at")
        extra_kwargs = {"created_by": {"write_only": True, "required": False}}

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data.setdefault("created_by", request.user)
        return super().create(validated_data)


class PortalUserPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.PortalUserPreferences
        fields = (
            "locale",
            "dark_mode",
            "push_notifications",
            "card_status",
            "card_reported_at",
            "updated_at",
        )
        read_only_fields = ("updated_at",)


class AdminActivityEventSerializer(serializers.ModelSerializer):
    actor_username = serializers.SerializerMethodField()
    patient_label = serializers.SerializerMethodField()

    class Meta:
        model = models.AdminActivityEvent
        fields = (
            "event_id",
            "action",
            "actor",
            "actor_username",
            "patient",
            "patient_label",
            "detail",
            "created_at",
        )
        read_only_fields = (
            "event_id",
            "actor",
            "actor_username",
            "patient_label",
            "created_at",
        )

    def get_actor_username(self, obj):
        if obj.actor_id and obj.actor:
            return obj.actor.get_username()
        return None

    def get_patient_label(self, obj):
        if not obj.patient_id or not obj.patient:
            return None
        p = obj.patient
        return f"{p.family_name}, {p.given_name}".strip(", ")
