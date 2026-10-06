"""Patient may PATCH own chart for PDF intake save from the user portal."""

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from medical.models import Patient


class OwnChartPatientUpdateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="chart-owner", email="owner@example.com", password="pass12345"
        )
        self.other = User.objects.create_user(
            username="chart-other", email="other@example.com", password="pass12345"
        )
        self.patient = Patient.objects.create(
            given_name="Harold",
            family_name="Jennings",
            date_of_birth="1968-05-14",
            portal_user=self.owner,
        )

    def test_owner_can_patch_own_patient(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.patch(
            f"/api/patients/{self.patient.patient_id}/",
            {"phone": "555-0100", "race": "Black or African American"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.patient.refresh_from_db()
        self.assertEqual(self.patient.phone, "555-0100")
        self.assertEqual(self.patient.race, "Black or African American")

    def test_user_can_claim_unlinked_chart_matching_email(self):
        unlinked = Patient.objects.create(
            given_name="Priya",
            family_name="Kapoor",
            date_of_birth="1990-01-01",
            email="priya.kapoor73@example.com",
            portal_user=None,
        )
        claimer = User.objects.create_user(
            username="priya.kapoor73@example.com",
            email="priya.kapoor73@example.com",
            password="pass12345",
        )
        self.client.force_authenticate(user=claimer)
        res = self.client.patch(
            f"/api/patients/{unlinked.patient_id}/",
            {"phone": "555-0200", "emergency_contact_given_name": "Alex"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        unlinked.refresh_from_db()
        self.assertEqual(unlinked.phone, "555-0200")
        self.assertEqual(unlinked.emergency_contact_given_name, "Alex")
        self.assertEqual(unlinked.portal_user_id, claimer.pk)

    def test_other_user_cannot_patch_patient(self):
        self.client.force_authenticate(user=self.other)
        res = self.client.patch(
            f"/api/patients/{self.patient.patient_id}/",
            {"phone": "555-9999"},
            format="json",
        )
        self.assertIn(res.status_code, (403, 404), res.content)

    def test_owner_can_create_lab_panel_and_hospital(self):
        self.client.force_authenticate(user=self.owner)
        hosp = self.client.post(
            "/api/hospitals/",
            {"name": "Riverside Community Hospital"},
            format="json",
        )
        self.assertEqual(hosp.status_code, 201, hosp.content)
        hid = hosp.data["hospital_id"]
        inc = self.client.post(
            "/api/incidents/",
            {
                "patient": str(self.patient.patient_id),
                "hospital": hid,
                "occurred_at": "2024-06-01T12:00:00Z",
                "incident_type": "Visit",
                "summary": "Hypertension follow-up",
            },
            format="json",
        )
        self.assertEqual(inc.status_code, 201, inc.content)
        lab = self.client.post(
            "/api/patient-lab-panels/",
            {
                "patient": str(self.patient.patient_id),
                "test_name": "Basic metabolic panel",
                "collected_on": "2024-06-01",
                "status": "Final",
                "is_new": False,
                "components": [
                    {
                        "name": "Glucose",
                        "value": 98,
                        "unit": "mg/dL",
                        "range": "70-99",
                        "critical": False,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(lab.status_code, 201, lab.content)

    def test_other_user_cannot_create_lab_panel_on_foreign_chart(self):
        self.client.force_authenticate(user=self.other)
        lab = self.client.post(
            "/api/patient-lab-panels/",
            {
                "patient": str(self.patient.patient_id),
                "test_name": "CBC",
                "collected_on": "2024-06-01",
                "status": "Final",
                "is_new": False,
                "components": [
                    {
                        "name": "WBC",
                        "value": 7.2,
                        "unit": "K/uL",
                        "range": "4-11",
                        "critical": False,
                    }
                ],
            },
            format="json",
        )
        self.assertIn(lab.status_code, (403, 404), lab.content)

    def test_owner_can_patch_document_parse_snapshot(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        self.client.force_authenticate(user=self.owner)
        created = self.client.post(
            "/api/patient-documents/",
            {
                "patient": str(self.patient.patient_id),
                "file": SimpleUploadedFile(
                    "chart.pdf", b"%PDF-1.4 test", content_type="application/pdf"
                ),
            },
            format="multipart",
        )
        self.assertEqual(created.status_code, 201, created.content)
        doc_id = created.data["document_id"]
        res = self.client.patch(
            f"/api/patient-documents/{doc_id}/",
            {
                "parse_snapshot": {
                    "extendedSections": {
                        "medicalEquipment": [{"title": "Cane", "detail": "Home use"}]
                    }
                }
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(
            res.data["parse_snapshot"]["extendedSections"]["medicalEquipment"][0]["title"],
            "Cane",
        )

    def test_other_user_cannot_patch_document_parse_snapshot(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from medical.models import PatientDocument

        self.client.force_authenticate(user=self.owner)
        created = self.client.post(
            "/api/patient-documents/",
            {
                "patient": str(self.patient.patient_id),
                "file": SimpleUploadedFile(
                    "chart.pdf", b"%PDF-1.4 test", content_type="application/pdf"
                ),
            },
            format="multipart",
        )
        self.assertEqual(created.status_code, 201, created.content)
        doc_id = created.data["document_id"]
        self.client.force_authenticate(user=self.other)
        res = self.client.patch(
            f"/api/patient-documents/{doc_id}/",
            {"parse_snapshot": {"allergies": []}},
            format="json",
        )
        self.assertIn(res.status_code, (403, 404), res.content)
        doc = PatientDocument.objects.get(document_id=doc_id)
        self.assertEqual(doc.parse_snapshot, {})
