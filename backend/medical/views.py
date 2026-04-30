from rest_framework import permissions, viewsets
from rest_framework.permissions import IsAuthenticated

from . import models, serializers
from .patient_api_scoping import (
    filter_by_allowed_patients,
    scoped_patient_queryset,
)
from .permissions import IntakeEditorWritePermission


class BaseViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class PatientViewSet(BaseViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = serializers.PatientSerializer

    def get_queryset(self):
        return scoped_patient_queryset(self.request)

    def perform_create(self, serializer):
        serializer.save(portal_user=self.request.user)


class HospitalViewSet(viewsets.ModelViewSet):
    queryset = models.Hospital.objects.all()
    serializer_class = serializers.HospitalSerializer
    permission_classes = [IsAuthenticated, IntakeEditorWritePermission]


class IncidentViewSet(BaseViewSet):
    queryset = models.Incident.objects.select_related("patient", "hospital").all().order_by(
        "-occurred_at"
    )
    serializer_class = serializers.IncidentSerializer

    def get_queryset(self):
        qs = filter_by_allowed_patients(
            self.request, super().get_queryset(), "patient_id"
        )
        patient_id = self.request.query_params.get("patient")
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by_user=self.request.user)


class MedicationCatalogViewSet(BaseViewSet):
    queryset = models.MedicationCatalog.objects.all()
    serializer_class = serializers.MedicationCatalogSerializer


class PatientMedicationViewSet(BaseViewSet):
    queryset = models.PatientMedication.objects.select_related("patient", "medication").all()
    serializer_class = serializers.PatientMedicationSerializer

    def get_queryset(self):
        return filter_by_allowed_patients(self.request, super().get_queryset(), "patient_id")


class AllergyCatalogViewSet(BaseViewSet):
    queryset = models.AllergyCatalog.objects.all()
    serializer_class = serializers.AllergyCatalogSerializer


class PatientAllergyViewSet(BaseViewSet):
    queryset = models.PatientAllergy.objects.select_related("patient", "allergy").all()
    serializer_class = serializers.PatientAllergySerializer

    def get_queryset(self):
        return filter_by_allowed_patients(self.request, super().get_queryset(), "patient_id")

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)


class InsuranceProviderViewSet(viewsets.ModelViewSet):
    queryset = models.InsuranceProvider.objects.all()
    serializer_class = serializers.InsuranceProviderSerializer
    permission_classes = [IsAuthenticated, IntakeEditorWritePermission]


class InsurancePolicyViewSet(viewsets.ModelViewSet):
    queryset = models.InsurancePolicy.objects.select_related("provider").all()
    serializer_class = serializers.InsurancePolicySerializer
    permission_classes = [IsAuthenticated, IntakeEditorWritePermission]


class PatientInsuranceViewSet(viewsets.ModelViewSet):
    queryset = models.PatientInsurance.objects.select_related("patient", "policy").all()
    serializer_class = serializers.PatientInsuranceSerializer
    permission_classes = [IsAuthenticated, IntakeEditorWritePermission]

    def get_queryset(self):
        return filter_by_allowed_patients(self.request, super().get_queryset(), "patient_id")


class ChronicDiseaseCatalogViewSet(BaseViewSet):
    queryset = models.ChronicDiseaseCatalog.objects.all()
    serializer_class = serializers.ChronicDiseaseCatalogSerializer


class PatientChronicDiseaseViewSet(BaseViewSet):
    queryset = models.PatientChronicDisease.objects.select_related(
        "patient", "disease", "medication"
    ).all()
    serializer_class = serializers.PatientChronicDiseaseSerializer

    def get_queryset(self):
        return filter_by_allowed_patients(self.request, super().get_queryset(), "patient_id")


class LabResultViewSet(BaseViewSet):
    queryset = models.LabResult.objects.select_related("incident").all()
    serializer_class = serializers.LabResultSerializer

    def get_queryset(self):
        return filter_by_allowed_patients(
            self.request, super().get_queryset(), "incident__patient_id"
        )


class PatientLabPanelViewSet(viewsets.ModelViewSet):
    """
    Patients (authenticated) may list/retrieve their panels via ?patient=.
    Creates/updates/deletes require superuser, Django group meditap-record-editor, or staff elevation.
    """

    queryset = models.PatientLabPanel.objects.select_related("patient").all()
    serializer_class = serializers.PatientLabPanelSerializer
    permission_classes = [IsAuthenticated, IntakeEditorWritePermission]
    lookup_field = "lab_panel_id"

    def get_queryset(self):
        qs = filter_by_allowed_patients(
            self.request, super().get_queryset(), "patient_id"
        )
        if self.action == "list":
            patient_id = self.request.query_params.get("patient")
            if patient_id:
                return qs.filter(patient_id=patient_id)
            return qs.none()
        panel_id = self.kwargs.get("lab_panel_id")
        if panel_id:
            return qs.filter(lab_panel_id=panel_id)
        return qs.none()
