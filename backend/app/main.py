from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi.exceptions import HTTPException
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config.settings import get_settings
from app.routers.agent import router as agent_router
from app.routers.memory import router as memory_router
from app.routers.skills import router as skills_router
from app.routers.workspaces import router as workspaces_router
from app.middleware.logging import LoggingMiddleware
from app.middleware.error_handlers import (
    http_exception_handler,
    starlette_http_exception_handler,
    general_exception_handler,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    # Startup
    settings = get_settings()
    print(f"Starting {settings.app_name} v{settings.app_version}")

    yield

    # Shutdown
    print("Shutting down application")


def create_application() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="DeepAgent POC - AI-powered coding assistant with sandbox execution, memory, and skills",
        lifespan=lifespan,
        debug=settings.debug,
    )

    # Add custom middleware
    app.add_middleware(LoggingMiddleware)

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure appropriately for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add exception handlers
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, starlette_http_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)

    # Include routers
    app.include_router(agent_router)
    app.include_router(memory_router)
    app.include_router(skills_router)
    app.include_router(workspaces_router)

    return app


# Create the FastAPI application instance
app = create_application()