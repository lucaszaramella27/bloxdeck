import unittest
from unittest.mock import AsyncMock, patch

import httpx

from app.roblox_social import search_roblox_users


class RobloxUserSearchTest(unittest.IsolatedAsyncioTestCase):
    async def test_search_uses_largest_page_and_returns_cursor(self) -> None:
        users_response = {
            "data": [
                {
                    "id": 10,
                    "name": "player_one",
                    "displayName": "Player One",
                    "hasVerifiedBadge": True,
                    "previousUsernames": ["old_player"],
                },
                {
                    "id": 20,
                    "name": "player_two",
                    "displayName": "Player Two",
                    "hasVerifiedBadge": False,
                },
            ],
            "nextPageCursor": "next-page",
        }

        with (
            patch("app.roblox_social.get_json", new=AsyncMock(return_value=users_response)) as get_json,
            patch(
                "app.roblox_social.get_avatar_images",
                new=AsyncMock(return_value={10: "https://tr.rbxcdn.com/one", 20: None}),
            ),
            patch(
                "app.roblox_social.get_user_presences",
                new=AsyncMock(return_value={10: {"userPresenceType": 2, "placeId": 99}}),
            ),
        ):
            result = await search_roblox_users("player", cursor="cursor-page")

        requested_url = get_json.await_args.args[0]
        self.assertIn("limit=100", requested_url)
        self.assertIn("cursor=cursor-page", requested_url)
        self.assertEqual(result["nextPageCursor"], "next-page")
        self.assertFalse(result["rateLimited"])
        self.assertIsNone(result["retryAfterSeconds"])
        self.assertEqual(len(result["results"]), 2)
        self.assertEqual(result["results"][0]["avatarUrl"], "https://tr.rbxcdn.com/one")
        self.assertEqual(result["results"][0]["presence"]["type"], "in_game")

    async def test_rate_limit_falls_back_to_exact_username(self) -> None:
        request = httpx.Request("GET", "https://users.roblox.com/v1/users/search")
        response = httpx.Response(429, request=request)
        rate_limit_error = httpx.HTTPStatusError(
            "rate limited",
            request=request,
            response=response,
        )
        exact_response = {
            "data": [
                {
                    "id": 30,
                    "name": "exact_player",
                    "displayName": "Exact Player",
                    "hasVerifiedBadge": False,
                }
            ]
        }

        with (
            patch("app.roblox_social.get_json", new=AsyncMock(side_effect=rate_limit_error)),
            patch("app.roblox_social.post_json", new=AsyncMock(return_value=exact_response)) as post_json,
            patch("app.roblox_social.get_avatar_images", new=AsyncMock(return_value={30: None})),
            patch("app.roblox_social.get_user_presences", new=AsyncMock(return_value={})),
        ):
            result = await search_roblox_users("@exact_player")

        self.assertEqual(post_json.await_args.args[1]["usernames"], ["exact_player"])
        self.assertEqual(result["results"][0]["name"], "exact_player")
        self.assertIsNone(result["nextPageCursor"])
        self.assertTrue(result["rateLimited"])
        self.assertEqual(result["retryAfterSeconds"], 60)

    async def test_rate_limited_next_page_keeps_cursor_for_automatic_retry(self) -> None:
        request = httpx.Request("GET", "https://users.roblox.com/v1/users/search")
        response = httpx.Response(
            429,
            headers={"Retry-After": "7", "x-ratelimit-reset": "9"},
            request=request,
        )
        rate_limit_error = httpx.HTTPStatusError(
            "rate limited",
            request=request,
            response=response,
        )

        with (
            patch("app.roblox_social.get_json", new=AsyncMock(side_effect=rate_limit_error)),
            patch("app.roblox_social.post_json", new=AsyncMock()) as post_json,
            patch("app.roblox_social.get_avatar_images", new=AsyncMock(return_value={})),
            patch("app.roblox_social.get_user_presences", new=AsyncMock(return_value={})),
        ):
            result = await search_roblox_users("player", cursor="same-page")

        post_json.assert_not_awaited()
        self.assertEqual(result["results"], [])
        self.assertEqual(result["nextPageCursor"], "same-page")
        self.assertTrue(result["rateLimited"])
        self.assertEqual(result["retryAfterSeconds"], 9)


if __name__ == "__main__":
    unittest.main()
