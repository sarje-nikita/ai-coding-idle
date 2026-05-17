from fastapi import APIRouter, HTTPException, Depends
from pathlib import Path

from app.models.memory import (
    MemoryReadRequest,
    MemoryWriteRequest,
    MemoryListResponse,
    MemoryContentResponse,
)
from app.services.memory_service import AgentMemory
from app.config.settings import get_settings, Settings

router = APIRouter(prefix="/api/v1/memory", tags=["memory"])


def get_agent_memory(userid: str, settings: Settings = Depends(get_settings)) -> AgentMemory:
    """Create AgentMemory instance for the user."""
    workspace_path = Path(settings.workspace_base_path) / userid
    workspace_path.mkdir(parents=True, exist_ok=True)
    return AgentMemory(userid=userid, workspace_path=workspace_path)


@router.post("/list")
async def list_memory_files(
    userid: str,
    settings: Settings = Depends(get_settings),
) -> MemoryListResponse:
    """
    List all memory files for a user.
    
    - **userid**: User identifier
    """
    memory = get_agent_memory(userid, settings)
    
    return MemoryListResponse(
        user_files=memory.list_user_memory_files(),
        project_files=memory.list_project_memory_files(),
        user_memory_path=str(memory.user_memory_dir),
        project_memory_path=str(memory.project_memory_dir),
    )


@router.post("/read")
async def read_memory(
    request: MemoryReadRequest,
    settings: Settings = Depends(get_settings),
) -> MemoryContentResponse:
    """
    Read a memory file.
    
    - **userid**: User identifier
    - **memory_type**: 'user' or 'project'
    - **filename**: Filename to read (default: agent.md)
    """
    memory = get_agent_memory(request.userid, settings)
    
    if request.memory_type == "user":
        filepath = memory.get_user_memory_path(request.filename)
    elif request.memory_type == "project":
        filepath = memory.get_project_memory_path(request.filename)
    else:
        raise HTTPException(
            status_code=400,
            detail="memory_type must be 'user' or 'project'"
        )
    
    if not filepath.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Memory file not found: {filepath}"
        )
    
    try:
        content = filepath.read_text()
        return MemoryContentResponse(content=content, filepath=str(filepath))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read memory file: {str(e)}"
        )


@router.post("/write")
async def write_memory(
    request: MemoryWriteRequest,
    settings: Settings = Depends(get_settings),
) -> dict:
    """
    Write to a memory file.
    
    - **userid**: User identifier
    - **memory_type**: 'user' or 'project'
    - **content**: Content to write
    - **filename**: Filename to write (default: agent.md)
    """
    memory = get_agent_memory(request.userid, settings)
    
    try:
        if request.memory_type == "user":
            memory.save_user_memory(request.content, request.filename)
            filepath = memory.get_user_memory_path(request.filename)
        elif request.memory_type == "project":
            memory.save_project_memory(request.content, request.filename)
            filepath = memory.get_project_memory_path(request.filename)
        else:
            raise HTTPException(
                status_code=400,
                detail="memory_type must be 'user' or 'project'"
            )
        
        return {
            "status": "success",
            "message": f"Memory file written successfully",
            "filepath": str(filepath)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to write memory file: {str(e)}"
        )


@router.get("/context/{userid}")
async def get_memory_context(
    userid: str,
    settings: Settings = Depends(get_settings),
) -> dict:
    """
    Get the complete memory context for a user (what gets injected into system prompt).
    
    - **userid**: User identifier
    """
    memory = get_agent_memory(userid, settings)
    
    return {
        "memory_context": memory.build_memory_context(),
        "user_memory": memory.load_user_memory(),
        "project_memory": memory.load_project_memory(),
    }