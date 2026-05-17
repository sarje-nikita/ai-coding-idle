from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache
from pathlib import Path
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Azure OpenAI Configuration
    azure_openai_endpoint: str = os.getenv("AZURE_ENDPOINT", "https://platformalphaip-dev.openai.azure.com")
    azure_openai_deployment: str = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o")
    azure_openai_api_version: str = os.getenv("AZURE_API_VERSION", "2025-01-01-preview")
    azure_openai_api_key: str = os.getenv("AZURE_API_KEY", "")

    # Docker Configuration
    docker_image: str = "python:3.11-slim"
    docker_command_timeout: float = 300.0
    docker_network_enabled: bool = True

    # Application Configuration
    app_name: str = "DeepAgent POC"
    app_version: str = "0.1.0"
    debug: bool = False

    # Workspace Configuration - User workspaces for code
    workspace_base_path: str = "/tmp/workspaces"
    
    # DeepAgents Configuration - Global shared resources
    deepagents_home: str = str(Path.home() / ".deepagents")
    skills_path: str = str(Path.home() / ".deepagents" / "skills")
    memories_path: str = str(Path.home() / ".deepagents" / "memories")

    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra environment variables


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()