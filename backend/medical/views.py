from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from django.db.models import Q
from django.http import FileResponse
from django.core.exceptions import PermissionDenied
import uuid

from . import models, serializers
from .patient_api_scoping import (
    allowed_patient_ids,
    filter_by_allowed_patients,
    scoped_patient_queryset,
)
from .permissions import IntakeEditorWritePermission
from medapp.admin_ops import log_admin_activity, request_admin_patient_id, user_is_admin_operator


class BaseViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class PatientViewSet(BaseViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = serializers.PatientSerializer

    def get_permissions(self):
        # Patients may create their bootstrap chart once and always read it.
        # Updates/deletes are staff-only (admin portal on-behalf edits).
        if self.request.method in permissions.SAFE_METHODS:
            return [IsAuthenticated()]
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [IsAuthenticated(), IntakeEditorWritePermission()]

    def get_queryset(self):
        qs = scoped_patient_queryset(self.request)
        q = (self.request.query_params.get("q") or "").strip()
        if not q:
            return qs
        filters = (
            Q(given_name__icontains=q)
            | Q(family_name__icontains=q)
            | Q(email__icontains=q)
            | Q(phone__icontains=q)
        )
        try:
            filters = filters | Q(patient_id=uuid.UUID(q))
        except (ValueError, TypeError, AttributeError):
            pass
        return qs.filter(filters)

    def perform_create(self, serializer):
        user = self.request.user
        # Staff creating a chart should not claim it as their own portal profile.
        if user_is_admin_operator(self.request):
            serializer.save()
        else:
            serializer.save(portal_user=user)
        log_admin_activity(
            actor=user if user.is_authenticated else None,
            action="patient.create",
            patient_id=str(serializer.instance.patient_id),
            detail={"source": "api"},
        )

    def perform_update(self, serializer):
        serializer.save()
        log_admin_activity(
            actor=self.request.user if self.request.user.is_authenticated else None,
            action="patient.update",
            patient_id=str(serializer.instance.patient_id),
            detail={"source": "api", "admin_patient_header": request_admin_patient_id(self.request)},
        )


class HospitalViewSet(viewsets.ModelViewSet):
    queryset = models.Hospital.objects.all().order_by("name")
    serializer_class = serializers.HospitalSerializer
    permission_classes = [IsAuthenticated, IntakeEditorWritePermission]

    def perform_create(self, serializer):
        serializer.save()
        log_admin_activity(
            actor=self.request.user if self.request.user.is_authenticated else None,
            action="hospital.create",
            detail={"hospital_id": str(serializer.instance.hospital_id), "name": serializer.instance.name},
        )

    def perform_update(self, serializer):
        serializer.save()
        log_admin_activity(
            actor=self.request.user if self.request.user.is_authenticated else None,
            action="hospital.update",
            detail={"hospital_id": str(serializer.instance.hospital_id), "name": serializer.instance.name},
        )

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


class PatientAppointmentViewSet(viewsets.ModelViewSet):
    """
    Patients may list/retrieve their appointments via ?patient=.
    Creates/updates/deletes require superuser, meditap-record-editor, or staff elevation.
    """

    queryset = models.PatientAppointment.objects.select_related("patient").all()
    serializer_class = serializers.PatientAppointmentSerializer
    permission_classes = [IsAuthenticated, IntakeEditorWritePermission]
    lookup_field = "appointment_id"

    def get_queryset(self):
        qs = filter_by_allowed_patients(
            self.request, super().get_queryset(), "patient_id"
        )
        if self.action == "list":
            patient_id = self.request.query_params.get("patient")
            if patient_id:
                return qs.filter(patient_id=patient_id)
            return qs.none()
        appointment_id = self.kwargs.get("appointment_id")
        if appointment_id:
            return qs.filter(appointment_id=appointment_id)
        return qs.none()


class AdminActivityEventViewSet(viewsets.ModelViewSet):
    """Staff/ops activity feed for the admin portal (create = client-noted events)."""

    http_method_names = ["get", "post", "head", "options"]
    serializer_class = serializers.AdminActivityEventSerializer
    permission_classes = [IsAuthenticated, IntakeEditorWritePermission]
    queryset = models.AdminActivityEvent.objects.select_related("actor", "patient").all()

    def get_queryset(self):
        if not user_is_admin_operator(self.request):
            return models.AdminActivityEvent.objects.none()
        return super().get_queryset()

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(actor=user)


class PatientDocumentViewSet(viewsets.ModelViewSet):
    """
    Document vault v1: patients upload for clinic review; staff list/review/update status.
    Chart field edits remain staff-only elsewhere.
    """

    queryset = models.PatientDocument.objects.select_related("patient", "uploaded_by").all()
    serializer_class = serializers.PatientDocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    lookup_field = "document_id"
    http_method_names = ["get", "post", "patch", "head", "options", "delete"]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [IsAuthenticated()]
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [IsAuthenticated(), IntakeEditorWritePermission()]

    def get_queryset(self):
        qs = filter_by_allowed_patients(
            self.request, super().get_queryset(), "patient_id"
        )
        if self.action == "list":
            patient_id = self.request.query_params.get("patient")
            if patient_id:
                return qs.filter(patient_id=patient_id)
            # Patients: scoped qs is already their own charts. Staff may list all.
            return qs
        document_id = self.kwargs.get("document_id")
        if document_id:
            return qs.filter(document_id=document_id)
        return qs.none()

    def perform_create(self, serializer):
        patient = serializer.validated_data["patient"]
        allowed = allowed_patient_ids(self.request)
        if allowed is not None and str(patient.patient_id) not in allowed:
            raise PermissionDenied("You may only upload documents for your own chart.")

        upload = serializer.validated_data.get("file")
        filename = getattr(upload, "name", None) or "upload.bin"
        content_type = getattr(upload, "content_type", None) or ""
        size = int(getattr(upload, "size", 0) or 0)
        user = self.request.user if self.request.user.is_authenticated else None
        doc = serializer.save(
            uploaded_by=user,
            original_filename=filename[:255],
            content_type=(content_type or "")[:128],
            size_bytes=max(size, 0),
            status=models.PatientDocument.STATUS_PENDING,
        )
        log_admin_activity(
            actor=user,
            action="document.upload",
            patient_id=str(doc.patient_id),
            detail={
                "document_id": str(doc.document_id),
                "filename": doc.original_filename,
                "size_bytes": doc.size_bytes,
            },
        )

    def perform_update(self, serializer):
        doc = serializer.save()
        log_admin_activity(
            actor=self.request.user if self.request.user.is_authenticated else None,
            action="document.update",
            patient_id=str(doc.patient_id),
            detail={
                "document_id": str(doc.document_id),
                "status": doc.status,
            },
        )

    def perform_destroy(self, instance):
        patient_id = str(instance.patient_id)
        document_id = str(instance.document_id)
        filename = instance.original_filename
        instance.file.delete(save=False)
        instance.delete()
        log_admin_activity(
            actor=self.request.user if self.request.user.is_authenticated else None,
            action="document.delete",
            patient_id=patient_id,
            detail={"document_id": document_id, "filename": filename},
        )

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, document_id=None):
        doc = self.get_object()
        if not doc.file:
            return Response({"detail": "File missing."}, status=status.HTTP_404_NOT_FOUND)
        return FileResponse(
            doc.file.open("rb"),
            as_attachment=True,
            filename=doc.original_filename or "document",
            content_type=doc.content_type or "application/octet-stream",
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="apply-demographics",
        permission_classes=[IsAuthenticated, IntakeEditorWritePermission],
    )
    def apply_demographics(self, request, document_id=None):
        """
        Apply parse_snapshot.patientFields onto the linked Patient chart.
        Blocks on identity mismatch unless force=true.
        """
        from datetime import datetime

        doc = self.get_object()
        patient = doc.patient
        snapshot = doc.parse_snapshot or {}
        fields = snapshot.get("patientFields") or {}
        if not isinstance(fields, dict) or not fields:
            return Response(
                {"detail": "No parse snapshot demographics to apply."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        def norm(s):
            return " ".join(str(s or "").casefold().split())

        parsed_given = (doc.parsed_given_name or fields.get("givenName") or "").strip()
        parsed_family = (doc.parsed_family_name or fields.get("familyName") or "").strip()
        force = bool(request.data.get("force"))

        identity_ok = (
            norm(parsed_given) == norm(patient.given_name)
            and norm(parsed_family) == norm(patient.family_name)
        )
        if not identity_ok and not force:
            return Response(
                {
                    "detail": "Parsed name does not match chart patient.",
                    "identity_match": False,
                    "parsed_name": f"{parsed_given} {parsed_family}".strip(),
                    "chart_name": f"{patient.given_name} {patient.family_name}".strip(),
                },
                status=status.HTTP_409_CONFLICT,
            )

        updated = []
        mapping = [
            ("givenName", "given_name"),
            ("familyName", "family_name"),
            ("email", "email"),
            ("phone", "phone"),
            ("address", "address"),
            ("bloodType", "blood_type"),
            ("sex", "sex_at_birth"),
            ("preferredLanguage", "preferred_language"),
            ("race", "race"),
            ("ethnicity", "ethnicity"),
            ("maritalStatus", "marital_status"),
        ]
        for src, dest in mapping:
            val = fields.get(src)
            if val is None:
                continue
            text = str(val).strip()
            if not text:
                continue
            if dest == "blood_type":
                text = text[:3]
            setattr(patient, dest, text)
            updated.append(dest)

        dob_raw = fields.get("dateOfBirth")
        if dob_raw:
            dob_text = str(dob_raw).strip()
            parsed_dob = None
            for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y", "%d/%m/%Y"):
                try:
                    parsed_dob = datetime.strptime(dob_text[:10], fmt).date()
                    break
                except ValueError:
                    continue
            if parsed_dob:
                patient.date_of_birth = parsed_dob
                updated.append("date_of_birth")

        if not updated:
            return Response(
                {"detail": "Snapshot had no applicable demographic fields."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        patient.save(update_fields=list(dict.fromkeys(updated + ["updated_at"])))
        doc.status = models.PatientDocument.STATUS_APPLIED
        doc.parsed_given_name = parsed_given[:100]
        doc.parsed_family_name = parsed_family[:100]
        doc.save(
            update_fields=[
                "status",
                "parsed_given_name",
                "parsed_family_name",
                "updated_at",
            ]
        )
        log_admin_activity(
            actor=request.user if request.user.is_authenticated else None,
            action="document.apply_demographics",
            patient_id=str(patient.patient_id),
            detail={
                "document_id": str(doc.document_id),
                "fields": updated,
                "forced": force and not identity_ok,
                "identity_match": identity_ok,
            },
        )
        return Response(
            {
                "document": serializers.PatientDocumentSerializer(doc).data,
                "updated_fields": updated,
                "identity_match": identity_ok,
            }
        )
