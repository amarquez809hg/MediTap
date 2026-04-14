from rest_framework import serializers
from . import models

class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Patient
        fields = "__all__"

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
        required = ("name", "value", "unit", "range", "critical")
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
            v = item["value"]
            if isinstance(v, bool) or v is None:
                raise serializers.ValidationError(
                    f"components[{i}].value must be a number."
                )
            if not isinstance(v, (int, float)):
                raise serializers.ValidationError(
                    f"components[{i}].value must be a number."
                )
            interp = item.get("interpretation")
            if interp is not None and not isinstance(interp, str):
                raise serializers.ValidationError(
                    f"components[{i}].interpretation must be a string or omitted."
                )
        return value
