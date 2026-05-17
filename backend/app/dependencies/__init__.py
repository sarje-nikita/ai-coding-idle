from fastapi import Depends
from app.config.settings import get_settings, Settings
from app.services.agent_service import AgentService


def get_agent_service(settings: Settings = Depends(get_settings)) -> AgentService:
    """Dependency injection for AgentService."""
    return AgentService(settings)