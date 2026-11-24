from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from medical import models


class PortalMessageApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient_user = User.objects.create_user(
            username="patient.msg", password="pass12345", email="patient.msg@example.com"
        )
        self.staff = User.objects.create_user(
            username="staff.msg",
            password="pass12345",
            email="staff.msg@example.com",
            is_staff=True,
        )
        self.patient = models.Patient.objects.create(
            given_name="Ada",
            family_name="Lovelace",
            date_of_birth="1815-12-10",
            email="patient.msg@example.com",
            portal_user=self.patient_user,
        )

    def test_patient_can_send_and_staff_sees_unread(self):
        self.client.force_authenticate(user=self.patient_user)
        create = self.client.post(
            "/api/portal-messages/",
            {"body": "Hello clinic, I have a question."},
            format="json",
        )
        self.assertEqual(create.status_code, 201, create.content)
        self.assertEqual(create.data["direction"], "patient_to_clinic")
        self.assertIsNone(create.data["read_at"])

        self.client.force_authenticate(user=self.staff)
        summary = self.client.get("/api/portal-messages/unread-summary/")
        self.assertEqual(summary.status_code, 200)
        self.assertEqual(summary.data["role"], "clinic")
        self.assertEqual(summary.data["unread_count"], 1)
        self.assertEqual(len(summary.data["threads"]), 1)

        thread = self.client.get(
            f"/api/portal-messages/?patient={self.patient.patient_id}"
        )
        self.assertEqual(thread.status_code, 200)
        rows = thread.data["results"] if isinstance(thread.data, dict) else thread.data
        self.assertEqual(len(rows), 1)

        reply = self.client.post(
            "/api/portal-messages/",
            {
                "patient": str(self.patient.patient_id),
                "body": "We received your note — a nurse will follow up.",
            },
            format="json",
        )
        self.assertEqual(reply.status_code, 201, reply.content)
        self.assertEqual(reply.data["direction"], "clinic_to_patient")

        mark = self.client.post(
            f"/api/portal-messages/{create.data['message_id']}/mark-read/"
        )
        self.assertEqual(mark.status_code, 200)
        self.assertIsNotNone(mark.data["read_at"])

        summary2 = self.client.get("/api/portal-messages/unread-summary/")
        self.assertEqual(summary2.data["unread_count"], 0)

        self.client.force_authenticate(user=self.patient_user)
        patient_summary = self.client.get("/api/portal-messages/unread-summary/")
        self.assertEqual(patient_summary.data["role"], "patient")
        self.assertEqual(patient_summary.data["unread_count"], 1)

    def test_patient_cannot_message_other_chart(self):
        other = User.objects.create_user(username="other.msg", password="pass12345")
        models.Patient.objects.create(
            given_name="Other",
            family_name="Person",
            date_of_birth="1990-01-01",
            portal_user=other,
        )
        self.client.force_authenticate(user=self.patient_user)
        res = self.client.post(
            "/api/portal-messages/",
            {
                "patient": str(
                    models.Patient.objects.exclude(patient_id=self.patient.patient_id)
                    .first()
                    .patient_id
                ),
                "body": "Trying another chart",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        # Forced onto own chart regardless of payload patient id.
        self.assertEqual(str(res.data["patient"]), str(self.patient.patient_id))
