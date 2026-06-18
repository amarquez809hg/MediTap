from datetime import date
from decimal import Decimal

from django.test import TestCase

from medical.models import Patient
from medapp.epic_fhir_sync import apply_patient_resource, apply_vital_observations


class EpicFhirSyncMapperTests(TestCase):
    def setUp(self):
        self.patient = Patient.objects.create(
            given_name="Old",
            family_name="Name",
            date_of_birth=date(1980, 5, 1),
            email="old@example.com",
        )

    def test_apply_patient_resource_maps_demographics(self):
        resource = {
            "resourceType": "Patient",
            "name": [{"use": "official", "given": ["Jane"], "family": "Doe"}],
            "birthDate": "1992-03-15",
            "gender": "female",
            "telecom": [
                {"system": "phone", "value": "+1-555-0100"},
                {"system": "email", "value": "jane.doe@example.com"},
            ],
            "address": [
                {
                    "line": ["123 Main St"],
                    "city": "Madison",
                    "state": "WI",
                    "postalCode": "53703",
                }
            ],
        }
        updated = apply_patient_resource(self.patient, resource)
        self.patient.refresh_from_db()

        self.assertIn("given_name", updated)
        self.assertIn("family_name", updated)
        self.assertEqual(self.patient.given_name, "Jane")
        self.assertEqual(self.patient.family_name, "Doe")
        self.assertEqual(self.patient.date_of_birth, date(1992, 3, 15))
        self.assertEqual(self.patient.sex_at_birth, "Female")
        self.assertEqual(self.patient.phone, "+1-555-0100")
        self.assertEqual(self.patient.email, "jane.doe@example.com")
        self.assertIn("Madison", self.patient.address)

    def test_apply_vital_observations_picks_latest_and_converts_units(self):
        observations = [
            {
                "code": {"coding": [{"system": "http://loinc.org", "code": "8302-2"}]},
                "effectiveDateTime": "2024-01-01T10:00:00Z",
                "valueQuantity": {"value": 70, "unit": "[in_i]"},
            },
            {
                "code": {"coding": [{"system": "http://loinc.org", "code": "8302-2"}]},
                "effectiveDateTime": "2024-06-01T10:00:00Z",
                "valueQuantity": {"value": 175, "unit": "cm"},
            },
            {
                "code": {"coding": [{"system": "http://loinc.org", "code": "29463-7"}]},
                "effectiveDateTime": "2024-06-01T10:00:00Z",
                "valueQuantity": {"value": 154, "unit": "lb"},
            },
            {
                "code": {"coding": [{"system": "http://loinc.org", "code": "8867-4"}]},
                "effectiveDateTime": "2024-06-01T10:00:00Z",
                "valueQuantity": {"value": 72, "unit": "/min"},
            },
            {
                "code": {"coding": [{"system": "http://loinc.org", "code": "85354-9"}]},
                "effectiveDateTime": "2024-06-01T10:00:00Z",
                "component": [
                    {
                        "code": {"coding": [{"code": "8480-6"}]},
                        "valueQuantity": {"value": 120},
                    },
                    {
                        "code": {"coding": [{"code": "8462-4"}]},
                        "valueQuantity": {"value": 80},
                    },
                ],
            },
        ]
        updated = apply_vital_observations(self.patient, observations)
        self.patient.refresh_from_db()

        self.assertIn("height_cm", updated)
        self.assertEqual(self.patient.height_cm, Decimal("175.00"))
        self.assertIn("weight_kg", updated)
        self.assertAlmostEqual(float(self.patient.weight_kg), 69.85, places=1)
        self.assertEqual(self.patient.systolic_bp, 120)
        self.assertEqual(self.patient.diastolic_bp, 80)
        self.assertEqual(self.patient.heart_rate_bpm, 72)
        self.assertIsNotNone(self.patient.vitals_recorded_at)
