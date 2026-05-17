from pydantic import BaseModel, Field
from typing import Optional, List


class MemoryReadRequest(BaseModel):
    """Request to read memory."""
    userid: str = Field(..., description="User identifier")
    memory_type: str = Field(..., description="Memory type: 'user' or 'project'")
    filename: str = Field(default="agent.md", description="Memory filename to read")


class MemoryWriteRequest(BaseModel):
    """Request to write memory."""
    userid: str = Field(..., description="User identifier")
    memory_type: str = Field(..., description="Memory type: 'user' or 'project'")
    content: str = Field(..., description="Memory content to write")
    filename: str = Field(default="agent.md", description="Memory filename to write")


class MemoryListResponse(BaseModel):
    """Response listing memory files."""
    user_files: List[str] = Field(..., description="List of user memory files")
    project_files: List[str] = Field(..., description="List of project memory files")
    user_memory_path: str = Field(..., description="Path to user memory directory")
    project_memory_path: str = Field(..., description="Path to project memory directory")


class MemoryContentResponse(BaseModel):
    """Response with memory content."""
    content: str = Field(..., description="Memory file content")
    filepath: str = Field(..., description="Full path to the memory file")