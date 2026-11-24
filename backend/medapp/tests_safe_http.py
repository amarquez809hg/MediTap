from django.test import SimpleTestCase

from medapp.safe_http import require_https_url


class SafeHttpTests(SimpleTestCase):
    def test_accepts_https(self):
        self.assertEqual(
            require_https_url("https://fhir.epic.com/oauth2/token"),
            "https://fhir.epic.com/oauth2/token",
        )

    def test_rejects_http_and_file(self):
        with self.assertRaises(ValueError):
            require_https_url("http://evil.example/token")
        with self.assertRaises(ValueError):
            require_https_url("file:///etc/passwd")
        with self.assertRaises(ValueError):
            require_https_url("")
