from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from pathlib import Path

from app.models.skills import (
    SkillsListResponse,
    SkillContentResponse,
    SkillMetadataResponse,
)
from app.services.skills_service import SkillsService
from app.config.settings import get_settings

router = APIRouter(prefix="/api/v1/skills", tags=["skills"])


@router.get("/list", response_model=SkillsListResponse)
async def list_skills(
    userid: str = Query(..., description="User identifier"),
):
    """
    List all available skills for a user.

    Returns both user-level skills (~/.deepagents/{userid}/skills)
    and project-level skills ({workspace}/.deepagents/skills).
    """
    settings = get_settings()
    workspace_path = Path(settings.workspace_base_path) / userid
    workspace_path.mkdir(parents=True, exist_ok=True)

    skills_service = SkillsService(userid=userid, workspace_path=workspace_path)
    skills = skills_service.load_skills()

    return SkillsListResponse(
        userid=userid,
        user_skills_dir=str(skills_service.user_skills_dir),
        project_skills_dir=str(skills_service.project_skills_dir),
        skills=[SkillMetadataResponse(**skill) for skill in skills],
        total=len(skills),
    )


@router.get("/read", response_model=SkillContentResponse)
async def read_skill(
    userid: str = Query(..., description="User identifier"),
    skill_name: str = Query(..., description="Name of the skill to read"),
):
    """
    Read the full content of a specific skill's SKILL.md file.

    This endpoint provides access to the complete skill instructions
    including YAML frontmatter and all documentation.
    """
    settings = get_settings()
    workspace_path = Path(settings.workspace_base_path) / userid
    workspace_path.mkdir(parents=True, exist_ok=True)

    skills_service = SkillsService(userid=userid, workspace_path=workspace_path)
    
    # Find the skill
    skills = skills_service.load_skills()
    skill_metadata = None
    for skill in skills:
        if skill["name"] == skill_name:
            skill_metadata = skill
            break

    if not skill_metadata:
        raise HTTPException(
            status_code=404,
            detail=f"Skill '{skill_name}' not found for user '{userid}'"
        )

    # Read skill content
    content = skills_service.get_skill_content(skill_name)
    if content is None:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read skill content for '{skill_name}'"
        )

    return SkillContentResponse(
        name=skill_name,
        content=content,
        path=skill_metadata["path"],
    )


@router.get("/context", response_model=dict)
async def get_skills_context(
    userid: str = Query(..., description="User identifier"),
):
    """
    Get the complete skills context that is injected into the agent's system prompt.

    This shows exactly what the agent sees about available skills.
    """
    settings = get_settings()
    workspace_path = Path(settings.workspace_base_path) / userid
    workspace_path.mkdir(parents=True, exist_ok=True)

    skills_service = SkillsService(userid=userid, workspace_path=workspace_path)
    context = skills_service.build_skills_context()

    return {
        "userid": userid,
        "context": context,
        "user_skills_dir": str(skills_service.user_skills_dir),
        "project_skills_dir": str(skills_service.project_skills_dir),
    }


@router.post("/create")
async def create_skill_directory(
    userid: str = Query(..., description="User identifier"),
    skill_name: str = Query(..., description="Name of the skill to create"),
    skill_type: str = Query("user", description="Type of skill (user/project)"),
):
    """
    Create a new skill directory structure.

    This creates a directory for a new skill in either the user-level
    or project-level skills location.
    """
    settings = get_settings()
    workspace_path = Path(settings.workspace_base_path) / userid
    workspace_path.mkdir(parents=True, exist_ok=True)

    skills_service = SkillsService(userid=userid, workspace_path=workspace_path)

    # Determine target directory
    if skill_type == "user":
        skills_dir = skills_service.user_skills_dir
    elif skill_type == "project":
        skills_dir = skills_service.project_skills_dir
    else:
        raise HTTPException(
            status_code=400,
            detail="skill_type must be 'user' or 'project'"
        )

    skill_dir = skills_dir / skill_name
    
    if skill_dir.exists():
        raise HTTPException(
            status_code=400,
            detail=f"Skill directory already exists: {skill_dir}"
        )

    # Create skill directory
    skill_dir.mkdir(parents=True, exist_ok=True)

    # Create template SKILL.md
    template_content = f"""---
name: {skill_name}
description: Brief description of what this skill does
---

# {skill_name.replace('-', ' ').title()} Skill

## When to Use

Describe when the agent should use this skill.

## Instructions

Step-by-step instructions for using this skill:

1. First step
2. Second step
3. Third step

## Examples

Provide examples of how to use this skill.

## Notes

Any additional notes or considerations.
"""

    skill_md = skill_dir / "SKILL.md"
    skill_md.write_text(template_content, encoding="utf-8")

    return {
        "message": f"Skill '{skill_name}' created successfully",
        "skill_dir": str(skill_dir),
        "skill_md": str(skill_md),
        "skill_type": skill_type,
    }
