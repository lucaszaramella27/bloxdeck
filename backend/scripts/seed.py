from __future__ import annotations

from sqlalchemy import func, select

from app.database import SessionLocal
from app.models import AppSettings, Collection, CollectionGame, Favorite, Game, LaunchHistory, User

GAMES = [
    {
        "placeId": "4924922222",
        "name": "Brookhaven",
        "description": "A relaxed social sandbox for roleplay sessions, house tours, and quick hangouts.",
        "imageUrl": "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
    },
    {
        "placeId": "2753915549",
        "name": "Blox Fruits",
        "description": "A sea adventure tracker for grind routes, crews, raids, and fruit goals.",
        "imageUrl": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    },
    {
        "placeId": "13772394625",
        "name": "Blade Ball",
        "description": "Fast rounds, reaction training, ranked notes, and clutch replay bookmarks.",
        "imageUrl": "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
    },
    {
        "placeId": "15101393044",
        "name": "Dress To Impress",
        "description": "Theme ideas, outfit prompts, and runway favorites for your next session.",
        "imageUrl": "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80",
    },
    {
        "placeId": "6284583030",
        "name": "Pet Simulator",
        "description": "Collection goals, trade reminders, egg notes, and cozy progression planning.",
        "imageUrl": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80",
    },
]

COLLECTIONS = [
    {"name": "Jogar depois", "type": "PLAY_LATER", "description": "Backlog pessoal.", "color": "#38bdf8"},
    {"name": "Com amigos", "type": "WITH_FRIENDS", "description": "Experiencias boas para squad.", "color": "#84cc16"},
    {"name": "Grind", "type": "GRIND", "description": "Rotina de progresso.", "color": "#f59e0b"},
    {"name": "Competitivo", "type": "COMPETITIVE", "description": "Jogos de foco e rank.", "color": "#fb7185"},
]


def main() -> None:
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.handle == "local-player"))

        if user is None:
            user = User(handle="local-player", displayName="Local Player")
            user.settings = AppSettings(theme="DARK", accentColor="#38bdf8")
            db.add(user)
            db.commit()
            db.refresh(user)

        saved_games: list[Game] = []

        for item in GAMES:
            game = db.scalar(select(Game).where(Game.placeId == item["placeId"]))

            if game is None:
                game = Game(**item)
                db.add(game)
            else:
                for key, value in item.items():
                    setattr(game, key, value)

            saved_games.append(game)

        db.commit()

        for game in saved_games:
            db.refresh(game)

        for item in COLLECTIONS:
            collection = db.scalar(select(Collection).where(Collection.userId == user.id, Collection.name == item["name"]))

            if collection is None:
                collection = Collection(userId=user.id, **item)
                db.add(collection)
            else:
                for key, value in item.items():
                    setattr(collection, key, value)

        db.commit()

        for game in saved_games[:2]:
            favorite = db.scalar(select(Favorite).where(Favorite.userId == user.id, Favorite.gameId == game.id))

            if favorite is None:
                db.add(Favorite(userId=user.id, gameId=game.id))

        play_later = db.scalar(select(Collection).where(Collection.userId == user.id, Collection.name == "Jogar depois"))

        if play_later is not None:
            for game in saved_games[2:5]:
                item = db.scalar(
                    select(CollectionGame).where(
                        CollectionGame.collectionId == play_later.id,
                        CollectionGame.gameId == game.id,
                    )
                )

                if item is None:
                    db.add(CollectionGame(collectionId=play_later.id, gameId=game.id))

        history_count = db.scalar(select(func.count(LaunchHistory.id)).where(LaunchHistory.userId == user.id))

        if int(history_count or 0) == 0:
            for game in saved_games[:4]:
                db.add(LaunchHistory(userId=user.id, gameId=game.id))

        db.commit()


if __name__ == "__main__":
    main()
