from __future__ import annotations

from fastapi import APIRouter, Response
from sqlalchemy import delete, select

from app.bootstrap import ensure_local_user
from app.dependencies import DbSession
from app.dto import game_to_dto, iso
from app.errors import not_found
from app.models import Favorite, Game

router = APIRouter()


def favorite_to_dto(favorite: Favorite) -> dict:
    return {
        "id": favorite.id,
        "createdAt": iso(favorite.createdAt),
        "game": game_to_dto(favorite.game, is_favorite=True),
    }


@router.get("/favorites")
def get_favorites(db: DbSession) -> dict[str, list[dict]]:
    user = ensure_local_user(db)
    favorites = list(
        db.scalars(select(Favorite).where(Favorite.userId == user.id).order_by(Favorite.createdAt.desc())).all()
    )

    return {"data": [favorite_to_dto(favorite) for favorite in favorites]}


@router.post("/favorites/{game_id}", status_code=201)
def favorite_game(game_id: str, db: DbSession) -> dict[str, dict]:
    user = ensure_local_user(db)
    game = db.get(Game, game_id)

    if game is None:
        raise not_found("Game not found")

    favorite = db.scalar(select(Favorite).where(Favorite.userId == user.id, Favorite.gameId == game_id))

    if favorite is None:
        favorite = Favorite(userId=user.id, gameId=game_id)
        db.add(favorite)
        db.commit()
        db.refresh(favorite)

    return {"data": favorite_to_dto(favorite)}


@router.delete("/favorites/{game_id}", status_code=204)
def unfavorite_game(game_id: str, db: DbSession) -> Response:
    user = ensure_local_user(db)
    db.execute(delete(Favorite).where(Favorite.userId == user.id, Favorite.gameId == game_id))
    db.commit()

    return Response(status_code=204)
