import unittest

from app.bootstrap import ensure_user_settings
from app.models import AppSettings


class EnsureUserSettingsTest(unittest.TestCase):
    def test_creates_settings_with_user_id_when_missing(self) -> None:
        class DummyUser:
            def __init__(self) -> None:
                self.id = "user-123"
                self.settings = None

        user = DummyUser()

        settings = ensure_user_settings(user)

        self.assertIsInstance(settings, AppSettings)
        self.assertEqual(settings.userId, "user-123")
        self.assertIs(user.settings, settings)


if __name__ == "__main__":
    unittest.main()
