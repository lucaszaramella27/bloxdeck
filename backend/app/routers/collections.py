from __future__ import annotations

from fastapi import APIRouter, Response
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.bootstrap import ensure_local_user
from app.dependencies import DbSession
from app.dto import collection_to_dto, game_to_dto
from app.errors import conflict, not_found
from app.models import Collection, CollectionGame, Favorite, Game, LaunchHistory
from app.roblox import get_roblox_snapshots_for_places
from app.schemas import CreateCollectionInput
from app.subscriptions import require_plan_capacity

router = APIRouter()


def collection_game_counts(db: Session, collection_ids: list[str]) -> dict[str, int]:
    if not collection_ids:
        return {}

    rows = db.execute(
        select(CollectionGame.collectionId, func.count(CollectionGame.id))
        .where(CollectionGame.collectionId.in_(collection_ids))
        .group_by(CollectionGame.collectionId)
    ).all()

    return {collection_id: int(count) for collection_id, count in rows}


def game_stats(db: Session, user_id: str, game_ids: list[str]) -> tuple[set[str], dict[str, int], dict[str, object]]:
    if not game_ids:
        return set(), {}, {}

    favorite_ids = set(
        db.scalars(select(Favorite.gameId).where(Favorite.userId == user_id, Favorite.gameId.in_(game_ids))).all()
    )
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

    return favorite_ids, {game_id: int(count) for game_id, count in count_rows}, dict(last_rows)


@router.get("/collections")
def get_collections(db: DbSession) -> dict[str, list[dict]]:
    user = ensure_local_user(db)
    collections = list(
        db.scalars(select(Collection).where(Collection.userId == user.id).order_by(Collection.updatedAt.desc(), Collection.name.asc())).all()
    )
    counts = collection_game_counts(db, [collection.id for collection in collections])

    return {"data": [collection_to_dto(collection, counts.get(collection.id, 0)) for collection in collections]}


@router.post("/collections", status_code=201)
def create_collection(body: CreateCollectionInput, db: DbSession) -> dict[str, dict]:
    user = ensure_local_user(db)
    existing = db.scalar(select(Collection).where(Collection.userId == user.id, Collection.name == body.name))

    if existing:
        raise conflict("A collection with this name already exists")

    current_collections = int(db.scalar(select(func.count(Collection.id)).where(Collection.userId == user.id)) or 0)
    require_plan_capacity(user, "collections", current_collections)

    collection = Collection(
        userId=user.id,
        name=body.name,
        type=body.type,
        description=body.description,
        color=body.color,
    )
    db.add(collection)
    db.commit()
    db.refresh(collection)

    return {"data": collection_to_dto(collection, 0)}


@router.get("/collections/{collection_id}")
async def get_collection(collection_id: str, db: DbSession) -> dict[str, dict]:
    user = ensure_local_user(db)
    collection = db.scalar(select(Collection).where(Collection.id == collection_id, Collection.userId == user.id))

    if collection is None:
        raise not_found("Collection not found")

    items = list(
        db.scalars(
            select(CollectionGame)
            .where(CollectionGame.collectionId == collection.id)
            .order_by(CollectionGame.createdAt.desc())
        ).all()
    )
    games = [item.game for item in items]
    favorite_ids, launch_counts, last_launches = game_stats(db, user.id, [game.id for game in games])
    snapshots = await get_roblox_snapshots_for_places([game.placeId for game in games])
    dto = collection_to_dto(collection, len(games))
    dto["games"] = [
        game_to_dto(
            game,
            is_favorite=game.id in favorite_ids,
            launch_count=launch_counts.get(game.id, 0),
            last_launched_at=last_launches.get(game.id),  # type: ignore[arg-type]
            roblox=snapshots.get(game.placeId),
        )
        for game in games
    ]

    return {"data": dto}


@router.post("/collections/{collection_id}/games/{game_id}", status_code=201)
def add_game_to_collection(collection_id: str, game_id: str, db: DbSession) -> dict[str, dict]:
    user = ensure_local_user(db)
    collection = db.scalar(select(Collection).where(Collection.id == collection_id, Collection.userId == user.id))
    game = db.get(Game, game_id)

    if collection is None:
        raise not_found("Collection not found")

    if game is None:
        raise not_found("Game not found")

    item = db.scalar(select(CollectionGame).where(CollectionGame.collectionId == collection_id, CollectionGame.gameId == game_id))

    if item is None:
        item = CollectionGame(collectionId=collection_id, gameId=game_id)
        db.add(item)
        db.commit()
        db.refresh(item)

    return {"data": {"id": item.id, "collectionId": item.collectionId, "gameId": item.gameId}}


@router.delete("/collections/{collection_id}/games/{game_id}", status_code=204)
def remove_game_from_collection(collection_id: str, game_id: str, db: DbSession) -> Response:
    user = ensure_local_user(db)
    collection = db.scalar(select(Collection).where(Collection.id == collection_id, Collection.userId == user.id))

    if collection is None:
        raise not_found("Collection not found")

    db.execute(delete(CollectionGame).where(CollectionGame.collectionId == collection_id, CollectionGame.gameId == game_id))
    db.commit()

    return Response(status_code=204)
