from pydantic import BaseModel, Field
from typing import Optional, List


class SkillMetadataResponse(BaseModel):
    """Response model for skill metadata."""
    name: str = Field(..., description="Skill name")
    description: str = Field(..., description="Skill description")
    path: str = Field(..., description="Path to SKILL.md file")
    source: str = Field(..., description="Source of skill (user/project)")


class SkillContentResponse(BaseModel):
    """Response model for skill content."""
    name: str = Field(..., description="Skill name")
    content: str = Field(..., description="Full SKILL.md content")
    path: str = Field(..., description="Path to SKILL.md file")


class SkillsListResponse(BaseModel):
    """Response model for listing skills."""
    userid: str = Field(..., description="User identifier")
    user_skills_dir: str = Field(..., description="User skills directory path")
    project_skills_dir: str = Field(..., description="Project skills directory path")
    skills: List[SkillMetadataResponse] = Field(..., description="List of available skills")
    total: int = Field(..., description="Total number of skills")