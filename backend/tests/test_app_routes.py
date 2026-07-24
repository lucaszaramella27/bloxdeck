import unittest

from fastapi.testclient import TestClient

from app.main import create_app


class AppRoutesTest(unittest.TestCase):
    def test_health_route_responds(self) -> None:
        client = TestClient(create_app())

        response = client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["service"], "bloxdeck-api")

    def test_browser_oauth_callback_renders_cancellation_page(self) -> None:
        client = TestClient(create_app())

        response = client.get(
            "/auth/roblox/callback",
            params={"error": "access_denied", "error_description": "Autorização cancelada"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("text/html", response.headers["content-type"])
        self.assertIn("Autorização cancelada", response.text)
        self.assertIn("BloxDeck", response.text)


if __name__ == "__main__":
    unittest.main()
