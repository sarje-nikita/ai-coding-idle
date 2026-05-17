from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class WorkspaceBase(BaseModel):
    name: str


class WorkspaceCreate(WorkspaceBase):
    pass


class WorkspaceResponse(WorkspaceBase):
    id: str
    space_id: str
    created_at: datetime
    user_id: str

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    email: str
    name: Optional[str] = None


class UserCreate(UserBase):
    clerk_id: str


class UserResponse(UserBase):
    id: str
    clerk_id: str
    created_at: datetime

    class Config:
        from_attributes = True
