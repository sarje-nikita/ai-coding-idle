from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
from datetime import datetime
import json

from app.models.agent import ErrorResponse

logger = logging.getLogger(__name__)


def custom_json_serializer(obj):
    """Custom JSON serializer for datetime objects."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")


async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    error_response = ErrorResponse(
        error=exc.detail,
        detail=f"Request: {request.method} {request.url}"
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=json.loads(error_response.json())
    )


async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle Starlette HTTP exceptions."""
    error_response = ErrorResponse(
        error=exc.detail,
        detail=f"Request: {request.method} {request.url}"
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=json.loads(error_response.json())
    )


async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    error_response = ErrorResponse(
        error="Internal server error",
        detail=f"An unexpected error occurred. Request: {request.method} {request.url}"
    )
    return JSONResponse(
        status_code=500,
        content=json.loads(error_response.json())
    )