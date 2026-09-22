from datetime import date

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from medical.models import AllergyCatalog, Patient, PatientAllergy, PatientCard
from medical.sun_crypto import seal_picc, sun_cmac


class PatientCardApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="card-owner", email="owner@example.com", password="pass12345"
        )
        self.other = User.objects.create_user(
            username="card-other", email="other@example.com", password="pass12345"
        )
        self.patient = Patient.objects.create(
            given_name="Riley",
            family_name="Moore",
            date_of_birth=date(1990, 4, 2),
            blood_type="O+",
            email="owner@example.com",
            address="123 Hidden Street",
            emergency_contact_given_name="Sam",
            emergency_contact_family_name="Moore",
            emergency_contact_relationship="Sibling",
            emergency_contact_phone="555-0100",
            portal_user=self.owner,
        )
        allergen = AllergyCatalog.objects.create(name="Penicillin")
        PatientAllergy.objects.create(patient=self.patient, allergy=allergen, severity="severe")
        self.staff = User.objects.create_user(
            username="card-staff",
            email="staff@example.com",
            password="pass12345",
            is_staff=True,
        )
        self.stranger = Patient.objects.create(
            given_name="Casey",
            family_name="Lee",
            date_of_birth=date(1985, 1, 1),
            email="other@example.com",
            portal_user=self.other,
        )

    def test_owner_cannot_issue_a_card(self):
        self.client.force_authenticate(user=self.owner)
        created = self.client.post(
            "/api/patient-cards/",
            {"patient": str(self.patient.patient_id)},
            format="json",
        )
        self.assertEqual(created.status_code, 403)

    def test_staff_issues_link_and_static_page_hides_address(self):
        self.client.force_authenticate(user=self.staff)
        created = self.client.post(
            "/api/patient-cards/",
            {"patient": str(self.patient.patient_id), "label": "wristband"},
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        token = created.data["token"]
        self.assertIn(f"/card/{token}", created.data["url"])
        self.assertNotIn("address", created.data)

        self.client.force_authenticate(user=None)
        opened = self.client.get(f"/api/card-profile/{token}/")
        self.assertEqual(opened.status_code, 200)
        self.assertEqual(opened.data["given_name"], "Riley")
        self.assertEqual(opened.data["family_name"], "Moore")
        self.assertEqual(opened.data["date_of_birth"], "1990-04-02")
        self.assertEqual(opened.data["blood_type"], "O+")
        self.assertEqual(opened.data["allergies"], [{"name": "Penicillin", "severity": "severe"}])
        self.assertEqual(opened.data["emergency_contact"]["phone"], "555-0100")
        self.assertNotIn("address", opened.data)
        self.assertNotIn("email", opened.data)

    def test_other_patient_cannot_issue(self):
        self.client.force_authenticate(user=self.other)
        res = self.client.post(
            "/api/patient-cards/",
            {"patient": str(self.patient.patient_id)},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_revoked_link_stops_opening(self):
        self.client.force_authenticate(user=self.staff)
        created = self.client.post(
            "/api/patient-cards/",
            {"patient": str(self.patient.patient_id)},
            format="json",
        )
        token = created.data["token"]
        card_id = created.data["card_id"]
        bound = self.client.post(
            f"/api/patient-cards/{card_id}/bind-uid/",
            {"card_uid": "04:86:0C:FA:0B:21:90"},
            format="json",
        )
        self.assertEqual(bound.status_code, 200)
        self.assertEqual(bound.data["card_uid"], "04860CFA0B2190")

        revoked = self.client.post(f"/api/patient-cards/{card_id}/revoke/")
        self.assertEqual(revoked.status_code, 200)
        self.assertIsNotNone(revoked.data["revoked_at"])

        self.client.force_authenticate(user=None)
        opened = self.client.get(f"/api/card-profile/{token}/")
        self.assertEqual(opened.status_code, 404)
        self.assertIsNotNone(PatientCard.objects.get(card_id=card_id).revoked_at)

    def test_unknown_token_is_not_active(self):
        res = self.client.get("/api/card-profile/not-a-real-token/")
        self.assertEqual(res.status_code, 404)

    def test_chart_edits_show_on_the_same_link(self):
        self.client.force_authenticate(user=self.staff)
        created = self.client.post(
            "/api/patient-cards/",
            {"patient": str(self.patient.patient_id)},
            format="json",
        )
        token = created.data["token"]
        self.patient.blood_type = "A-"
        self.patient.save(update_fields=["blood_type"])
        self.client.force_authenticate(user=None)
        opened = self.client.get(f"/api/card-profile/{token}/")
        self.assertEqual(opened.data["blood_type"], "A-")

    def test_sun_tap_works_once_and_static_token_stops(self):
        self.client.force_authenticate(user=self.staff)
        created = self.client.post(
            "/api/patient-cards/",
            {"patient": str(self.patient.patient_id)},
            format="json",
        )
        token = created.data["token"]
        card = PatientCard.objects.get(card_id=created.data["card_id"])
        meta = bytes(range(16))
        uid = bytes.fromhex("04860CFA0B2190")
        card.sdm_meta_key = meta.hex()
        card.sdm_file_key = meta.hex()
        card.card_uid = uid.hex().upper()
        card.save(update_fields=["sdm_meta_key", "sdm_file_key", "card_uid"])
        self.client.force_authenticate(user=None)

        static = self.client.get(f"/api/card-profile/{token}/")
        self.assertEqual(static.status_code, 404)

        first = self._sun_get(card.card_id, meta, uid, 1)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.data["given_name"], "Riley")
        self.assertEqual(first.data["address"], "123 Hidden Street")
        self.assertEqual(first.data["email"], "owner@example.com")
        self.assertIn("medications", first.data)
        self.assertIn("visits", first.data)

        replay = self._sun_get(card.card_id, meta, uid, 1)
        self.assertEqual(replay.status_code, 404)

        second = self._sun_get(card.card_id, meta, uid, 2)
        self.assertEqual(second.status_code, 200)
        card.refresh_from_db()
        self.assertEqual(card.sdm_read_counter, 2)

        bad_mac = self.client.get(
            f"/api/card-profile/s/{card.card_id}/",
            {"picc_data": seal_picc(meta, uid, 3), "cmac": "00" * 8},
        )
        self.assertEqual(bad_mac.status_code, 404)
        card.refresh_from_db()
        self.assertEqual(card.sdm_read_counter, 2)

        other_uid = bytes.fromhex("04DE5F1EACC040")
        mismatch = self._sun_get(card.card_id, meta, other_uid, 4)
        self.assertEqual(mismatch.status_code, 404)
        card.refresh_from_db()
        self.assertEqual(card.sdm_read_counter, 2)

    def test_staff_assigns_the_card_to_another_patient(self):
        self.client.force_authenticate(user=self.staff)
        created = self.client.post(
            "/api/patient-cards/",
            {"patient": str(self.patient.patient_id)},
            format="json",
        )
        card = PatientCard.objects.get(card_id=created.data["card_id"])
        meta = bytes(range(16))
        uid = bytes.fromhex("04860CFA0B2190")
        card.sdm_meta_key = meta.hex()
        card.sdm_file_key = meta.hex()
        card.card_uid = uid.hex().upper()
        card.save(update_fields=["sdm_meta_key", "sdm_file_key", "card_uid"])

        self.client.force_authenticate(user=self.owner)
        denied = self.client.get("/api/patient-cards/directory/")
        self.assertEqual(denied.status_code, 403)

        self.client.force_authenticate(user=self.staff)
        directory = self.client.get("/api/patient-cards/directory/")
        self.assertEqual(directory.status_code, 200)
        names = {row["family_name"] for row in directory.data}
        self.assertIn("Moore", names)
        self.assertIn("Lee", names)

        assigned = self.client.post(
            "/api/patient-cards/assign/",
            {"patient": str(self.stranger.patient_id)},
            format="json",
        )
        self.assertEqual(assigned.status_code, 200)
        self.assertEqual(assigned.data["patient_id"], str(self.stranger.patient_id))
        card.refresh_from_db()
        self.assertEqual(card.patient_id, self.stranger.patient_id)

        self.client.force_authenticate(user=None)
        opened = self._sun_get(card.card_id, meta, uid, 1)
        self.assertEqual(opened.status_code, 200)
        self.assertEqual(opened.data["given_name"], "Casey")
        self.assertEqual(opened.data["address"], None)

    def _sun_get(self, card_id, key: bytes, uid: bytes, counter: int):
        picc = seal_picc(key, uid, counter)
        cmac = sun_cmac(key, uid, counter.to_bytes(3, "little")).hex()
        return self.client.get(
            f"/api/card-profile/s/{card_id}/",
            {"picc_data": picc, "cmac": cmac},
        )
