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

    def test_other_user_cannot_patch_patient(self):
        self.client.force_authenticate(user=self.other)
        res = self.client.patch(
            f"/api/patients/{self.patient.patient_id}/",
            {"phone": "555-9999"},
            format="json",
        )
        self.assertIn(res.status_code, (403, 404), res.content)
