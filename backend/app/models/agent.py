from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class AgentRequest(BaseModel):
    """Request model for running the agent."""
    prompt: str = Field(..., description="The user prompt to send to the agent")
    userid: str = Field(..., description="Unique identifier for the user session")
    files: Optional[List[str]] = Field(None, description="Optional list of file paths to preload")


class AgentResponse(BaseModel):
    """Response model for agent execution."""
    response: str = Field(..., description="The agent's response content")
    userid: str = Field(..., description="User identifier for the session")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
    workspace_path: str = Field(..., description="Path to the user's workspace")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ErrorResponse(BaseModel):
    """Error response model."""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }