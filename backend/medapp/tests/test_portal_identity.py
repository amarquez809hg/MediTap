from django.contrib.auth.models import Group, User
from django.test import TestCase

from medapp.portal_identity import (
    PORTAL_ADMIN,
    PORTAL_USER,
    ROLE_ORG_ADMIN,
    ROLE_PATIENT,
    ROLE_STAFF,
    resolve_portal_identity,
)


class PortalIdentityTests(TestCase):
    def test_patient_default(self):
        user = User.objects.create_user(username="pat", password="x")
        identity = resolve_portal_identity(user)
        self.assertEqual(identity["role"], ROLE_PATIENT)
        self.assertEqual(identity["portal_home"], PORTAL_USER)
        self.assertIn("chart:read", identity["permissions"])
        self.assertNotIn("admin_portal:access", identity["permissions"])

    def test_staff_flag(self):
        user = User.objects.create_user(username="staff1", password="x")
        user.is_staff = True
        user.save()
        identity = resolve_portal_identity(user)
        self.assertEqual(identity["role"], ROLE_STAFF)
        self.assertEqual(identity["portal_home"], PORTAL_ADMIN)
        self.assertIn("admin_portal:access", identity["permissions"])

    def test_superuser_is_org_admin(self):
        user = User.objects.create_superuser(username="boss", email="b@e.com", password="x")
        identity = resolve_portal_identity(user)
        self.assertEqual(identity["role"], ROLE_ORG_ADMIN)
        self.assertEqual(identity["portal_home"], PORTAL_ADMIN)

    def test_record_editor_group(self):
        user = User.objects.create_user(username="editor1", password="x")
        g, _ = Group.objects.get_or_create(name="meditap-record-editor")
        user.groups.add(g)
        identity = resolve_portal_identity(user)
        self.assertEqual(identity["role"], ROLE_STAFF)
        self.assertEqual(identity["portal_home"], PORTAL_ADMIN)
