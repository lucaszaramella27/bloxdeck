import unittest
from datetime import datetime, timedelta, timezone

from app.roblox import get_discover_rotation, rotate_discover_items


class DiscoverRotationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.items = [{"universeId": index} for index in range(1, 51)]

    def test_rotation_is_stable_inside_the_same_five_hour_window(self) -> None:
        now = datetime(2026, 7, 11, 12, 0, tzinfo=timezone.utc)
        rotation_id, rotates_at = get_discover_rotation(now)
        later = rotates_at - timedelta(seconds=1)
        later_rotation_id, later_rotates_at = get_discover_rotation(later)

        self.assertEqual(rotation_id, later_rotation_id)
        self.assertEqual(rotates_at, later_rotates_at)

    def test_next_rotation_keeps_leaders_and_changes_the_catalog(self) -> None:
        rotation_id, _ = get_discover_rotation(
            datetime(2026, 7, 11, 12, 0, tzinfo=timezone.utc)
        )
        current = rotate_discover_items(
            self.items,
            sort_id="top-playing-now",
            limit=30,
            rotation_id=rotation_id,
        )
        following = rotate_discover_items(
            self.items,
            sort_id="top-playing-now",
            limit=30,
            rotation_id=rotation_id + 1,
        )

        self.assertEqual(len(current), 30)
        self.assertEqual(len(following), 30)
        self.assertEqual(current[:6], self.items[:6])
        self.assertEqual(following[:6], self.items[:6])
        self.assertNotEqual(current, following)
        self.assertGreaterEqual(
            len({item["universeId"] for item in current} ^ {item["universeId"] for item in following}),
            30,
        )


if __name__ == "__main__":
    unittest.main()
