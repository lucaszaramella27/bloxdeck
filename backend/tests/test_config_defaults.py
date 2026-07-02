import unittest

from app.config import Settings


class SettingsDefaultsTest(unittest.TestCase):
    def test_local_dev_database_defaults_are_safe_placeholders(self) -> None:
        settings = Settings()

        self.assertEqual(
            settings.database_url,
            "postgresql://bloxdeck:bloxdeck_dev_password@localhost:5432/bloxdeck?schema=public",
        )


if __name__ == "__main__":
    unittest.main()
