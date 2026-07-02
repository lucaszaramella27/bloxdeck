from __future__ import annotations

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class ApiError(Exception):
    def __init__(self, status_code: int, code: str, message: str) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message


def bad_request(message: str) -> ApiError:
    return ApiError(400, "BAD_REQUEST", message)


def not_found(message: str = "Resource not found") -> ApiError:
    return ApiError(404, "NOT_FOUND", message)


def conflict(message: str) -> ApiError:
    return ApiError(409, "CONFLICT", message)


async def api_error_handler(_request: Request, error: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content={"error": {"code": error.code, "message": error.message}},
    )


async def validation_error_handler(_request: Request, error: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request payload",
                "issues": error.errors(),
            },
        },
    )


async def http_error_handler(_request: Request, error: StarletteHTTPException) -> JSONResponse:
    message = str(error.detail) if error.detail else "Route not found"

    return JSONResponse(
        status_code=error.status_code,
        content={"error": {"code": "NOT_FOUND" if error.status_code == 404 else "HTTP_ERROR", "message": message}},
    )
