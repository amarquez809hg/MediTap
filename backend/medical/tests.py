from datetime import date
import uuid

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from medical.models import Patient, PatientAppointment


class PatientAppointmentApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="patient1", email="patient1@example.com", password="pass12345"
        )
        self.patient = Patient.objects.create(
            given_name="Riley",
            family_name="Moore",
            date_of_birth=date(1990, 1, 1),
            email="patient1@example.com",
            portal_user=self.user,
        )
        self.client.force_authenticate(user=self.user)

    def test_list_appointments_for_patient(self):
        PatientAppointment.objects.create(
            patient=self.patient,
            display_code="APPT-00001",
            date_label="Monday, Jan 6",
            time_label="09:00 AM",
            specialist="Dr. Test",
            department="General Practice",
            visit_type="In-Office Visit",
            status="Confirmed",
        )
        url = f"/api/patient-appointments/?patient={self.patient.patient_id}"
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["results"]), 1)
        row = res.data["results"][0]
        self.assertEqual(row["appointmentId"], "APPT-00001")
        self.assertEqual(row["specialist"], "Dr. Test")

    def test_patient_cannot_create_without_elevation(self):
        url = "/api/patient-appointments/"
        res = self.client.post(
            url,
            {
                "patient": str(self.patient.patient_id),
                "date": "Tuesday, Jan 7",
                "time": "10:00 AM",
                "specialist": "Dr. New",
                "type": "Video Consultation",
                "status": "Pending",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 403)
