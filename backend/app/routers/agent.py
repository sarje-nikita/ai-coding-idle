from fastapi import APIRouter, HTTPException, Form, Depends, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Optional, List, Any, Dict
import json
import asyncio
import zipfile
from pathlib import Path
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage, SystemMessage

from app.models.agent import AgentRequest, AgentResponse, ErrorResponse
from app.services.agent_service import AgentService
from app.dependencies import get_agent_service

router = APIRouter(prefix="/agent", tags=["agent"])


def serialize_message(msg: Any) -> Dict[str, Any]:
    """Serialize a LangChain message to JSON-serializable dict."""
    if isinstance(msg, AIMessage):
        return {
            "type": "ai",
            "content": msg.content,
            "id": msg.id,
            "tool_calls": [
                {
                    "name": tc.get("name"),
                    "args": tc.get("args"),
                    "id": tc.get("id"),
                    "type": tc.get("type", "tool_call")
                }
                for tc in (msg.tool_calls or [])
            ] if hasattr(msg, "tool_calls") and msg.tool_calls else [],
            "usage_metadata": msg.usage_metadata if hasattr(msg, "usage_metadata") else None
        }
    elif isinstance(msg, ToolMessage):
        return {
            "type": "tool",
            "content": msg.content,
            "id": msg.id,
            "name": msg.name if hasattr(msg, "name") else None,
            "tool_call_id": msg.tool_call_id if hasattr(msg, "tool_call_id") else None
        }
    elif isinstance(msg, HumanMessage):
        return {
            "type": "human",
            "content": msg.content,
            "id": msg.id
        }
    elif isinstance(msg, SystemMessage):
        return {
            "type": "system",
            "content": msg.content,
            "id": msg.id
        }
    else:
        # Fallback for unknown types
        return {
            "type": "unknown",
            "content": str(msg),
            "id": getattr(msg, "id", None)
        }


@router.post("/run-agent-stream")
async def run_agent_stream(
    prompt: str = Form(...),
    userid: str = Form(...),
    zip_file: Optional[UploadFile] = File(None),
    agent_service: AgentService = Depends(get_agent_service),
):
    """
    Run the deep agent with streaming response.

    - **prompt**: The user prompt/instructions to send to the agent
    - **userid**: Unique identifier for the user session
    - **zip_file**: Optional zip file containing code to be unzipped into the workspace
    """
    try:
        # Handle zip file upload if provided
        if zip_file:
            workspace_path = agent_service.create_workspace(userid)
            # Unzip the file to the workspace
            with zipfile.ZipFile(zip_file.file, 'r') as zip_ref:
                zip_ref.extractall(workspace_path)
        
        stream = await agent_service.run_agent_stream(prompt, userid, None)
        
        # Track which subagent is currently active for namespace mapping
        active_subagents = {}  # {namespace_id: subagent_name}
        pending_task_calls = {}  # {tool_call_id: subagent_type}
        
        async def event_generator():
            try:
                async for chunk in stream:
                    print("Chunk received:", chunk)
                    # Handle both regular chunks and namespaced subgraph chunks
                    if isinstance(chunk, tuple) and len(chunk) == 2:
                        # This is a namespaced chunk from subgraphs: ((namespace,), data)
                        namespace, data = chunk
                        namespace_str = ":".join(namespace) if namespace else "main"
                        
                        # Try to identify subagent name from namespace or content
                        subagent_name = active_subagents.get(namespace_str)
                        
                        # If not found, try to extract from step data
                        if not subagent_name and namespace_str.startswith("tools:"):
                            # Check if this is a PatchToolCallsMiddleware event with subagent info
                            for step, step_data in data.items():
                                if "PatchToolCallsMiddleware" in step or "before_agent" in step:
                                    # Try to extract subagent name from the content
                                    if hasattr(step_data, '__iter__') and not isinstance(step_data, (str, bytes, dict)):
                                        for item in step_data:
                                            serialized = serialize_message(item)
                                            content = serialized.get('content', '')
                                            # Look for patterns like "Task 1", "Task 2", "specs", "architect", "developer"
                                            for agent_type in ['specs', 'architect', 'developer', 'reviewer']:
                                                if agent_type in content.lower():
                                                    active_subagents[namespace_str] = agent_type
                                                    subagent_name = agent_type
                                                    break
                                            if subagent_name:
                                                break
                        
                        # Default to namespace if we still can't identify
                        if not subagent_name:
                            subagent_name = namespace_str
                        
                        for step, step_data in data.items():
                            # Serialize messages properly to JSON
                            serialized_content = []
                            
                            # Handle different data types
                            if hasattr(step_data, 'get') and 'messages' in step_data:
                                msgs = step_data['messages']
                            elif hasattr(step_data, '__iter__') and not isinstance(step_data, (str, bytes, dict)):
                                msgs = step_data
                            else:
                                msgs = [step_data]
                            
                            # Serialize each message
                            try:
                                if isinstance(msgs, (list, tuple)):
                                    for msg in msgs:
                                        serialized_content.append(serialize_message(msg))
                                else:
                                    serialized_content.append(serialize_message(msgs))
                            except Exception as e:
                                # Fallback to string if serialization fails
                                serialized_content = [{"type": "error", "content": str(msgs), "error": str(e)}]
                            
                            event_data = {
                                "step": step,
                                "namespace": subagent_name,  # Use mapped subagent name
                                "content": serialized_content
                            }
                            yield f"data: {json.dumps(event_data)}\n\n"
                    else:
                        # Regular chunk format: {step: data}
                        for step, data in chunk.items():
                            # Serialize messages properly to JSON
                            serialized_content = []
                            
                            # Handle different data types
                            if hasattr(data, 'get') and 'messages' in data:
                                msgs = data['messages']
                            elif hasattr(data, '__iter__') and not isinstance(data, (str, bytes, dict)):
                                msgs = data
                            else:
                                msgs = [data]
                            
                            # Serialize each message and detect task tool calls
                            try:
                                if isinstance(msgs, (list, tuple)):
                                    for msg in msgs:
                                        serialized_msg = serialize_message(msg)
                                        serialized_content.append(serialized_msg)
                                        
                                        # Detect task tool calls to prepare for subagent mapping
                                        if serialized_msg.get('tool_calls'):
                                            for tool_call in serialized_msg['tool_calls']:
                                                if tool_call.get('name') == 'task' and tool_call.get('args'):
                                                    subagent_type = tool_call['args'].get('subagent_type', '')
                                                    if subagent_type:
                                                        # Store for future namespace matching
                                                        pending_task_calls[tool_call['id']] = subagent_type
                                else:
                                    serialized_content.append(serialize_message(msgs))
                            except Exception as e:
                                # Fallback to string if serialization fails
                                serialized_content = [{"type": "error", "content": str(msgs), "error": str(e)}]
                            
                            event_data = {
                                "step": step,
                                "namespace": "main",  # Main agent namespace
                                "content": serialized_content
                            }
                            yield f"data: {json.dumps(event_data)}\n\n"
                yield "data: [DONE]\n\n"
            except asyncio.CancelledError:
                # Handle graceful cancellation
                yield f"data: {json.dumps({'error': 'Stream cancelled'})}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                # Handle any other streaming errors
                yield f"data: {json.dumps({'error': f'Stream error: {str(e)}'})}\n\n"
                yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent streaming failed: {str(e)}"
        )


@router.post("/upload-zip")
async def upload_zip(
    userid: str = Form(...),
    zip_file: UploadFile = File(...),
    agent_service: AgentService = Depends(get_agent_service),
):
    """
    Upload and unzip a zip file to the user's workspace.

    - **userid**: Unique identifier for the user session
    - **zip_file**: Zip file containing code to be unzipped into the workspace
    """
    try:
        workspace_path = agent_service.create_workspace(userid)
        # Unzip the file to the workspace
        with zipfile.ZipFile(zip_file.file, 'r') as zip_ref:
            zip_ref.extractall(workspace_path)
        return {"message": "Zip file uploaded and extracted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "deepagent-poc"}


@router.get("/files/{userid}")
async def get_user_files(
    userid: str,
    agent_service: AgentService = Depends(get_agent_service),
):
    """
    Get the file tree structure for a user's workspace.
    
    - **userid**: Unique identifier for the user session
    """
    try:
        workspace_path = Path(agent_service.settings.workspace_base_path) / userid
        
        if not workspace_path.exists():
            return {"files": [], "message": "Workspace not found"}
        
        def build_tree(path: Path, base_path: Path):
            """Recursively build file tree structure."""
            items = []
            try:
                for item in sorted(path.iterdir()):
                    # Skip only .deepagents directory, show other hidden files
                    # if item.name == '.deepagents':
                    #     continue
                    
                    try:
                        relative_path = str(item.relative_to(base_path))
                        
                        if item.is_dir():
                            # For directories, try to get children but handle errors gracefully
                            try:
                                children = build_tree(item, base_path)
                            except (OSError, PermissionError) as child_error:
                                # If we can't read the directory contents, still include it but with empty children
                                children = []
                            
                            items.append({
                                "name": item.name,
                                "path": relative_path,
                                "type": "directory",
                                "children": children
                            })
                        else:
                            # For files, get size but handle errors
                            try:
                                size = item.stat().st_size
                            except (OSError, PermissionError):
                                size = 0
                            
                            items.append({
                                "name": item.name,
                                "path": relative_path,
                                "type": "file",
                                "size": size
                            })
                    except (OSError, PermissionError) as item_error:
                        # Skip items we can't access (broken symlinks, permission issues, etc.)
                        continue
                        
            except (OSError, PermissionError) as dir_error:
                # If we can't read the directory at all, return empty list
                pass
            
            return items
        
        file_tree = build_tree(workspace_path, workspace_path)
        return {"files": file_tree, "workspace_path": str(workspace_path)}
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve files: {str(e)}"
        )


@router.get("/files/{userid}/{file_path:path}")
async def get_file_content(
    userid: str,
    file_path: str,
    agent_service: AgentService = Depends(get_agent_service),
):
    """
    Get the content of a specific file in the user's workspace.
    
    - **userid**: Unique identifier for the user session
    - **file_path**: Relative path to the file within the workspace
    """
    try:
        workspace_path = Path(agent_service.settings.workspace_base_path) / userid
        full_path = workspace_path / file_path
        
        # Security check: ensure the path is within the workspace
        try:
            if not full_path.resolve().is_relative_to(workspace_path.resolve()):
                raise HTTPException(status_code=403, detail="Access denied")
        except (OSError, RuntimeError):
            # Handle cases where resolve() fails (broken symlinks, etc.)
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if file exists (handle broken symlinks gracefully)
        try:
            exists = full_path.exists()
        except (OSError, PermissionError):
            raise HTTPException(status_code=404, detail="File not found")
        
        if not exists:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check if it's a file (handle broken symlinks gracefully)
        try:
            is_file = full_path.is_file()
        except (OSError, PermissionError):
            raise HTTPException(status_code=400, detail="Path is not accessible")
        
        if not is_file:
            raise HTTPException(status_code=400, detail="Path is not a file")
        
        # Read file content with error handling
        try:
            content = full_path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            # If it's a binary file, return base64 encoded
            try:
                import base64
                content = base64.b64encode(full_path.read_bytes()).decode('utf-8')
                file_size = full_path.stat().st_size
                return {
                    "path": file_path,
                    "content": content,
                    "encoding": "base64",
                    "size": file_size
                }
            except (OSError, PermissionError):
                raise HTTPException(status_code=500, detail="Failed to read binary file")
        except (OSError, PermissionError):
            raise HTTPException(status_code=500, detail="Failed to read file content")
        
        # Get file size with error handling
        try:
            file_size = full_path.stat().st_size
        except (OSError, PermissionError):
            file_size = len(content.encode('utf-8'))  # Fallback to content length
        
        return {
            "path": file_path,
            "content": content,
            "encoding": "utf-8",
            "size": file_size
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read file: {str(e)}"
        )