"""Skills service for managing and loading agent skills."""

import os
import shutil
from pathlib import Path
from typing import Optional, List
from app.skills.load import list_skills, SkillMetadata


class SkillsService:
    """Service for managing agent skills."""
    
    def __init__(self, skills_base_path: Optional[Path] = None, app_skills_path: Optional[Path] = None, userid: Optional[str] = None, workspace_path: Optional[Path] = None):
        """
        Initialize skills service.
        
        Args:
            skills_base_path: Base path for global skills (defaults to ~/.deepagents/skills)
            app_skills_path: Path to application skills folder (defaults to app/skills)
            userid: User identifier (optional, for backward compatibility)
            workspace_path: Workspace path (optional, for backward compatibility)
        """
        # Store optional backward compat params
        self.userid = userid
        self.workspace_path = workspace_path
        
        # Global skills path: ~/.deepagents/skills/
        if skills_base_path is None:
            skills_base_path = Path.home() / ".deepagents" / "skills"
        self.skills_path = skills_base_path
        self.skills_path.mkdir(parents=True, exist_ok=True)
        
        # Application skills path: app/skills/
        if app_skills_path is None:
            # Get the app/skills directory relative to this file
            current_file = Path(__file__)
            app_skills_path = current_file.parent.parent / "skills"
        self.app_skills_path = app_skills_path
        
        # Sync app skills to global skills directory
        self._sync_app_skills()
    
    def _sync_app_skills(self):
        """Copy skills from app/skills to skills_path (excluding __init__.py, load.py, __pycache__)."""
        if not self.app_skills_path.exists():
            return
        
        for skill_dir in self.app_skills_path.iterdir():
            # Skip non-directories, hidden, private, and special files
            if not skill_dir.is_dir() or skill_dir.name.startswith(('_', '.')):
                continue
                
            target_dir = self.skills_path / skill_dir.name
            
            # Copy or update the skill
            if target_dir.exists():
                shutil.rmtree(target_dir)
            
            # Copy only SKILL.md and other resource files (not Python files)
            target_dir.mkdir(parents=True, exist_ok=True)
            for item in skill_dir.iterdir():
                if item.name in ('__init__.py', 'load.py') or item.name.startswith('_'):
                    continue
                if item.is_file():
                    shutil.copy2(item, target_dir / item.name)
                elif item.is_dir() and not item.name.startswith(('_', '.')):
                    shutil.copytree(item, target_dir / item.name)

    # Skills system documentation template
    SKILLS_SYSTEM_PROMPT = """

## Skills System

You have access to a skills library that provides specialized capabilities and domain knowledge.

{skills_locations}

**Available Skills:**

{skills_list}

**How to Use Skills (Progressive Disclosure):**

Skills follow a **progressive disclosure** pattern - you know they exist (name + description above), but you only read the full instructions when needed:

1. **Recognize when a skill applies**: Check if the user's task matches any skill's description
2. **Read the skill's full instructions**: The skill list above shows the exact path to use with read_file
3. **Follow the skill's instructions**: SKILL.md contains step-by-step workflows, best practices, and examples
4. **Access supporting files**: Skills may include Python scripts, configs, or reference docs - use absolute paths

**When to Use Skills:**
- When the user's request matches a skill's domain (e.g., "research X" → web-research skill)
- When you need specialized knowledge or structured workflows
- When a skill provides proven patterns for complex tasks

**Skills are Self-Documenting:**
- Each SKILL.md tells you exactly what the skill does and how to use it
- The skill list above shows the full path for each skill's SKILL.md file

**Executing Skill Scripts:**
Skills may contain Python scripts or other executable files. Always use absolute paths from the skill list.

**Example Workflow:**

User: "Can you research the latest developments in quantum computing?"

1. Check available skills above → See "web-research" skill with its full path
2. Read the skill using the path shown in the list
3. Follow the skill's research workflow (search → organize → synthesize)
4. Use any helper scripts with absolute paths

Remember: Skills are tools to make you more capable and consistent. When in doubt, check if a skill exists for the task!
"""

    def load_skills(self) -> List[SkillMetadata]:
        """Load all available skills from global skills directory.

        Returns:
            List of skill metadata
        """
        # Use standard loader with user_skills_dir parameter
        return list_skills(user_skills_dir=self.skills_path)

    def _format_skills_locations(self, container_workspace: str = "/workspace") -> str:
        """Format skills locations for display in system prompt.
        
        Args:
            container_workspace: Path to workspace inside Docker container
        """
        return f"**Skills Location**: `/.deepagents/skills/`"

    def _format_skills_list(self, skills: List[SkillMetadata], container_workspace: str = "/workspace") -> str:
        """Format skills metadata for display in system prompt.
        
        Args:
            skills: List of skill metadata
            container_workspace: Path to workspace inside Docker container
        """
        if not skills:
            return f"(No skills available yet. Skills should be in `{container_workspace}/.deepagents/skills/`)"

        lines = []
        for skill in skills:
            # Convert HOST path to Docker container path
            skill_path = Path(skill['path'])
            # Get relative path from skills_path and prepend container path
            relative_path = skill_path.relative_to(self.skills_path)
            container_path = f"/.deepagents/skills/{relative_path}"
            
            lines.append(f"- **{skill['name']}**: {skill['description']}")
            lines.append(f"  → Read `{container_path}` for full instructions")
        
        return "\n".join(lines)

    def build_skills_context(self, container_workspace: str = "/workspace") -> str:
        """Build the complete skills context for the system prompt.
        
        Args:
            container_workspace: Path to workspace inside Docker container

        Returns:
            Formatted skills documentation string
        """
        skills = self.load_skills()
        skills_locations = self._format_skills_locations(container_workspace)
        skills_list = self._format_skills_list(skills, container_workspace)

        return self.SKILLS_SYSTEM_PROMPT.format(
            skills_locations=skills_locations,
            skills_list=skills_list,
        )

    def get_skill_content(self, skill_name: str) -> Optional[str]:
        """Get the full content of a skill's SKILL.md file.

        Args:
            skill_name: Name of the skill to read

        Returns:
            Skill content or None if not found
        """
        skills = self.load_skills()
        for skill in skills:
            if skill["name"] == skill_name:
                try:
                    return Path(skill["path"]).read_text(encoding="utf-8")
                except (OSError, UnicodeDecodeError):
                    return None
        return None
