from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Query, Response
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from app.bootstrap import ensure_local_user
from app.dependencies import DbSession
from app.dto import game_to_dto
from app.errors import bad_request, conflict, not_found
from app.models import CollectionGame, Favorite, Game, LaunchHistory
from app.roblox import get_roblox_snapshot_for_place, get_roblox_snapshots_for_places
from app.schemas import CreateGameInput, UpdateGameInput

router = APIRouter()


def get_launch_stats(db: Session, user_id: str, game_ids: list[str]) -> tuple[dict[str, int], dict[str, datetime]]:
    if not game_ids:
        return {}, {}

    count_rows = db.execute(
        select(LaunchHistory.gameId, func.count(LaunchHistory.id))
        .where(LaunchHistory.userId == user_id, LaunchHistory.gameId.in_(game_ids))
        .group_by(LaunchHistory.gameId)
    ).all()
    last_rows = db.execute(
        select(LaunchHistory.gameId, func.max(LaunchHistory.createdAt))
        .where(LaunchHistory.userId == user_id, LaunchHistory.gameId.in_(game_ids))
        .group_by(LaunchHistory.gameId)
    ).all()

    return ({game_id: int(count) for game_id, count in count_rows}, {game_id: last for game_id, last in last_rows})


def create_game_data(body: CreateGameInput, roblox_name: str | None, roblox_description: str | None) -> dict[str, str | None]:
    name = body.name or roblox_name
    description = body.description or roblox_description

    if not name or not description:
        raise bad_request("Nao consegui buscar esse Place ID no Roblox. Confira o ID ou informe os dados manualmente.")

    return {
        "placeId": body.placeId,
        "name": name,
        "description": description,
        "imageUrl": str(body.imageUrl) if body.imageUrl else None,
    }


@router.get("/games")
async def get_games(db: DbSession, q: str | None = Query(default=None)) -> dict[str, list[dict]]:
    user = ensure_local_user(db)
    query = select(Game)

    if q:
        search = f"%{q.strip()}%"
        query = query.where(or_(Game.name.ilike(search), Game.description.ilike(search), Game.placeId.contains(q.strip())))

    games = list(db.scalars(query.order_by(Game.updatedAt.desc(), Game.name.asc())).all())
    game_ids = [game.id for game in games]
    favorite_ids = set(
        db.scalars(select(Favorite.gameId).where(Favorite.userId == user.id, Favorite.gameId.in_(game_ids))).all()
    )
    launch_counts, last_launches = get_launch_stats(db, user.id, game_ids)
    roblox_snapshots = await get_roblox_snapshots_for_places([game.placeId for game in games])

    return {
        "data": [
            game_to_dto(
                game,
                is_favorite=game.id in favorite_ids,
                launch_count=launch_counts.get(game.id, 0),
                last_launched_at=last_launches.get(game.id),
                roblox=roblox_snapshots.get(game.placeId),
            )
            for game in games
        ]
    }


@router.post("/games", status_code=201)
async def create_game(body: CreateGameInput, db: DbSession) -> dict[str, dict]:
    ensure_local_user(db)

    if db.scalar(select(Game).where(Game.placeId == body.placeId)):
        raise conflict("A game with this placeId already exists")

    roblox = await get_roblox_snapshot_for_place(body.placeId)
    data = create_game_data(body, roblox.name if roblox else None, roblox.description if roblox else None)

    if roblox and body.imageUrl is None:
        data["imageUrl"] = roblox.imageUrl

    game = Game(**data)
    db.add(game)
    db.commit()
    db.refresh(game)

    return {"data": game_to_dto(game, roblox=roblox)}


@router.get("/games/{game_id}")
async def get_game(game_id: str, db: DbSession) -> dict[str, dict]:
    user = ensure_local_user(db)
    game = db.get(Game, game_id)

    if game is None:
        raise not_found("Game not found")

    favorite = db.scalar(select(Favorite.id).where(Favorite.userId == user.id, Favorite.gameId == game.id))
    launch_counts, last_launches = get_launch_stats(db, user.id, [game.id])
    roblox = await get_roblox_snapshot_for_place(game.placeId)
    collection_rows = db.execute(
        select(CollectionGame).where(CollectionGame.gameId == game.id).order_by(CollectionGame.createdAt.desc())
    ).scalars()

    dto = game_to_dto(
        game,
        is_favorite=bool(favorite),
        launch_count=launch_counts.get(game.id, 0),
        last_launched_at=last_launches.get(game.id),
        roblox=roblox,
    )
    dto["collections"] = [
        {
            "id": item.collection.id,
            "name": item.collection.name,
            "type": item.collection.type,
            "color": item.collection.color,
        }
        for item in collection_rows
    ]

    return {"data": dto}


@router.patch("/games/{game_id}")
async def update_game(game_id: str, body: UpdateGameInput, db: DbSession) -> dict[str, dict]:
    game = db.get(Game, game_id)

    if game is None:
        raise not_found("Game not found")

    update_data = body.model_dump(exclude_unset=True)

    if "imageUrl" in update_data and update_data["imageUrl"] is not None:
        update_data["imageUrl"] = str(update_data["imageUrl"])

    for key, value in update_data.items():
        setattr(game, key, value)

    db.commit()
    db.refresh(game)

    roblox = await get_roblox_snapshot_for_place(game.placeId)
    return {"data": game_to_dto(game, roblox=roblox)}


@router.delete("/games/{game_id}", status_code=204)
def delete_game(game_id: str, db: DbSession) -> Response:
    game = db.get(Game, game_id)

    if game is None:
        raise not_found("Game not found")

    db.execute(delete(Game).where(Game.id == game_id))
    db.commit()

    return Response(status_code=204)
