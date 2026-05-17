"""Memory management for DeepAgent - User and Project memory support."""

import contextlib
from pathlib import Path
from typing import Optional


class AgentMemory:
    """Manages user and project-specific memory for the agent."""

    def __init__(
        self,
        userid: str,
        workspace_path: Path,
        memory_base_path: Optional[Path] = None,
    ):
        """Initialize agent memory.

        Args:
            userid: Unique user identifier
            workspace_path: Current workspace/project path
            memory_base_path: Base path for storing user memories (defaults to ~/.deepagents/memories)
        """
        self.userid = userid
        self.workspace_path = workspace_path

        # User memory directory: ~/.deepagents/memories/{userid}/
        if memory_base_path is None:
            memory_base_path = Path.home() / ".deepagents" / "memories"
        self.user_memory_dir = memory_base_path / userid
        self.user_memory_dir.mkdir(parents=True, exist_ok=True)

        # Project memory directory: {workspace}/.deepagents/
        self.project_memory_dir = workspace_path / ".deepagents"

    def get_user_memory_path(self, filename: str = "agent.md") -> Path:
        """Get path to user memory file."""
        return self.user_memory_dir / filename

    def get_project_memory_path(self, filename: str = "agent.md") -> Path:
        """Get path to project memory file."""
        return self.project_memory_dir / filename

    def load_user_memory(self) -> Optional[str]:
        """Load user-specific memory (personal preferences across all projects)."""
        user_agent_path = self.get_user_memory_path("agent.md")
        if user_agent_path.exists():
            with contextlib.suppress(OSError, UnicodeDecodeError):
                return user_agent_path.read_text()
        return None

    def load_project_memory(self) -> Optional[str]:
        """Load project-specific memory (context for current workspace)."""
        project_agent_path = self.get_project_memory_path("agent.md")
        if project_agent_path.exists():
            with contextlib.suppress(OSError, UnicodeDecodeError):
                return project_agent_path.read_text()
        return None

    def save_user_memory(self, content: str, filename: str = "agent.md") -> None:
        """Save user-specific memory."""
        memory_path = self.get_user_memory_path(filename)
        memory_path.parent.mkdir(parents=True, exist_ok=True)
        memory_path.write_text(content)

    def save_project_memory(self, content: str, filename: str = "agent.md") -> None:
        """Save project-specific memory."""
        memory_path = self.get_project_memory_path(filename)
        memory_path.parent.mkdir(parents=True, exist_ok=True)
        memory_path.write_text(content)

    def list_user_memory_files(self) -> list[str]:
        """List all user memory files."""
        if not self.user_memory_dir.exists():
            return []
        return [f.name for f in self.user_memory_dir.iterdir() if f.is_file()]

    def list_project_memory_files(self) -> list[str]:
        """List all project memory files."""
        if not self.project_memory_dir.exists():
            return []
        return [f.name for f in self.project_memory_dir.iterdir() if f.is_file()]

    def build_memory_context(self, container_workspace: str = "/workspace") -> str:
        """Build complete memory context for system prompt injection.
        
        Args:
            container_workspace: Path to workspace inside Docker container (default: /workspace)
        """
        user_memory = self.load_user_memory()
        project_memory = self.load_project_memory()

        memory_context = self._build_memory_documentation(container_workspace)

        if user_memory or project_memory:
            memory_context += "\n\n## Your Current Memory\n\n"

            if user_memory:
                memory_context += f"<user_memory>\n{user_memory}\n</user_memory>\n\n"
            else:
                memory_context += "<user_memory>\n(No user agent.md found)\n</user_memory>\n\n"

            if project_memory:
                memory_context += f"<project_memory>\n{project_memory}\n</project_memory>\n\n"
            else:
                memory_context += "<project_memory>\n(No project agent.md found)\n</project_memory>\n"

        return memory_context

    def _build_memory_documentation(self, container_workspace: str = "/workspace") -> str:
        """Build memory system documentation for the agent.
        
        Args:
            container_workspace: Path to workspace inside Docker container
        """
        return f"""

## Long-term Memory System

Your long-term memory persists across sessions and is stored in markdown files.

**Project Memory Location**: `.deepagents/` (This project's context)

### Memory Files:

**Project agent.md**: `.deepagents/agent.md`
- How THIS specific project works
- Project-specific architecture and design patterns
- Coding conventions specific to this codebase
- Team conventions and guidelines

### When to CHECK/READ memories (CRITICAL):
- **At the start of ANY new session**: Check project memory
- **BEFORE answering questions**: Check project memory FIRST
- **When user asks you to do something**: Check if you have project-specific guides
- **When user references past work**: Search memory files for related context

### When to UPDATE memories:
- **IMMEDIATELY when user describes your role or how you should behave**
- **IMMEDIATELY when user gives feedback** - Capture what was wrong and how to improve
- When user explicitly asks you to remember something
- When patterns or preferences emerge
- After significant work where context would help in future sessions

### Memory-first Response Pattern:
1. User asks question → Check project memory at `.deepagents/agent.md`
2. Read the file if it exists
3. Base answer on saved knowledge + general knowledge

### Learning from Feedback:
- When user says something is better/worse, capture WHY in agent.md
- Each correction improves you permanently
- Update memories IMMEDIATELY when user says "remember X" or "be careful about Y"
- Look for underlying principles, not just specific mistakes
"""
