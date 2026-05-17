import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
import httpx

from app.models.database import get_db, Workspace, User
from app.models.schemas import WorkspaceCreate, WorkspaceResponse


router = APIRouter(prefix="/workspaces", tags=["workspaces"])


async def verify_clerk_token(authorization: str = Header(None)) -> str:
    """Verify Clerk JWT token and return user ID"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    try:
        # Extract token from "Bearer <token>"
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authorization scheme")

        # Verify token with Clerk
        clerk_secret = os.getenv("CLERK_SECRET_KEY")
        if not clerk_secret:
            # For development, just extract user ID from token claims
            # In production, verify with Clerk API
            import json
            import base64
            parts = token.split(".")
            if len(parts) != 3:
                raise HTTPException(status_code=401, detail="Invalid token format")
            
            # Decode payload (without verification for now)
            payload = parts[1]
            # Add padding if needed
            padding = 4 - len(payload) % 4
            if padding != 4:
                payload += "=" * padding
            
            decoded = json.loads(base64.urlsafe_b64decode(payload))
            return decoded.get("sub")  # Clerk user ID is in 'sub' claim
        else:
            # TODO: Implement proper Clerk token verification with secret
            # For now, extract from token
            import json
            import base64
            parts = token.split(".")
            payload = parts[1]
            padding = 4 - len(payload) % 4
            if padding != 4:
                payload += "=" * padding
            decoded = json.loads(base64.urlsafe_b64decode(payload))
            return decoded.get("sub")

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


@router.get("/", response_model=list[WorkspaceResponse])
async def list_workspaces(
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_clerk_token)
):
    """List all workspaces for the authenticated user"""
    workspaces = db.query(Workspace).filter(Workspace.user_id == user_id).all()
    return workspaces


@router.post("/", response_model=WorkspaceResponse)
async def create_workspace(
    workspace: WorkspaceCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_clerk_token)
):
    """Create a new workspace"""
    # Generate URL-friendly space_id
    space_id = f"{workspace.name.lower().replace(' ', '-')}-{str(uuid.uuid4())[:8]}"
    
    db_workspace = Workspace(
        user_id=user_id,
        name=workspace.name,
        space_id=space_id
    )
    db.add(db_workspace)
    db.commit()
    db.refresh(db_workspace)
    return db_workspace


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_clerk_token)
):
    """Get a specific workspace"""
    workspace = db.query(Workspace).filter(
        Workspace.id == workspace_id,
        Workspace.user_id == user_id
    ).first()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    return workspace


@router.delete("/{workspace_id}")
async def delete_workspace(
    workspace_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_clerk_token)
):
    """Delete a workspace"""
    workspace = db.query(Workspace).filter(
        Workspace.id == workspace_id,
        Workspace.user_id == user_id
    ).first()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    db.delete(workspace)
    db.commit()
    
    return {"message": "Workspace deleted successfully"}
