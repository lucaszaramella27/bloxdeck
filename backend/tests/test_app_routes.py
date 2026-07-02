import unittest

from fastapi.testclient import TestClient

from app.main import create_app


class AppRoutesTest(unittest.TestCase):
    def test_health_route_responds(self) -> None:
        client = TestClient(create_app())

        response = client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["service"], "bloxdeck-api")


if __name__ == "__main__":
    unittest.main()
