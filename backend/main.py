#!/usr/bin/env python3
"""
DeepAgent POC - Main entry point
"""

import uvicorn
from app.main import app
from app.config.settings import get_settings
from dotenv import load_dotenv
import os

load_dotenv()  # Load environment variables from .env file
print("langsmith env vars:", {
    "LANGSMITH_TRACING": os.getenv("LANGSMITH_TRACING"),
    "LANGSMITH_ENDPOINT": os.getenv("LANGSMITH_ENDPOINT"),
    "LANGSMITH_API_KEY": os.getenv("LANGSMITH_API_KEY"),
})

if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info" if not settings.debug else "debug",
    )