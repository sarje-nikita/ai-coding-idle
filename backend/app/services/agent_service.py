import os
import shutil
from pathlib import Path
from typing import Optional, List

from deepagents import create_deep_agent, CompiledSubAgent
from deepagents.backends import FilesystemBackend
from langchain.agents.middleware import ShellToolMiddleware, DockerExecutionPolicy, ModelRetryMiddleware
from langchain_openai import AzureChatOpenAI

from app.config.settings import Settings
from app.services.memory_service import AgentMemory
from app.services.skills_service import SkillsService
from langgraph.checkpoint.memory import InMemorySaver  


def get_main_prompt() -> str:
    prompt_path = Path(__file__).parent.parent / "prompts" / "main.md"
    if prompt_path.exists():
        return prompt_path.read_text()
    return ""

def get_prompt(prompt_name: str) -> str:
    """Load prompt from prompts directory."""
    prompt_path = Path(__file__).parent.parent / "prompts" / prompt_name / "main.md"
    if prompt_path.exists():
        return prompt_path.read_text()
    return ""

class AgentService:
    """Service class for handling agent operations."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._model = None

    @property
    def model(self):
        """Lazy initialization of the Azure OpenAI model."""
        if self._model is None:
            self._model = AzureChatOpenAI(
                azure_endpoint=self.settings.azure_openai_endpoint,
                azure_deployment=self.settings.azure_openai_deployment,
                api_version=self.settings.azure_openai_api_version,
                api_key=self.settings.azure_openai_api_key,
            )
        return self._model

    def create_workspace(self, userid: str) -> Path:
        """Create a workspace directory for the user."""
        workspace_path = Path(self.settings.workspace_base_path) / userid
        workspace_path.mkdir(parents=True, exist_ok=True)
        return workspace_path

    def save_files_to_workspace(self, workspace_path: Path, files: List[str]) -> None:
        """Save uploaded files to the workspace."""
        for file_path in files:
            if os.path.exists(file_path):
                shutil.copy2(file_path, workspace_path)

    def create_agent(self, workspace_path: Path, system_prompt: str):
        """Create and configure the deep agent with Docker sandbox and subagents."""
        print("workspace_path-----",workspace_path)
        
        # Create shell middleware configuration that will be shared
        shell_middleware = ShellToolMiddleware(
            workspace_root=str(workspace_path),
            shell_command="/bin/bash",
            execution_policy=DockerExecutionPolicy(
                image=self.settings.docker_image,
                command_timeout=self.settings.docker_command_timeout,  
                network_enabled=self.settings.docker_network_enabled,
                max_output_lines=1000,
                max_output_bytes=1000000,
            ),
        )
        
        # Create retry middleware for handling rate limits and transient failures
        model_retry_middleware = ModelRetryMiddleware(
            max_retries=10,  # Increased from default 3 to handle rate limiting better
            backoff_factor=2.0,
            initial_delay=1.0,  # Start with 1 second delay
            max_delay=60.0,  # Cap at 60 seconds
            jitter=True,  # Add randomness to avoid thundering herd
        )
        
        # Create subagents - reviewer, architect, and specs don't get shell middleware
        specs_agent = create_deep_agent(
            model=self.model,
            backend=FilesystemBackend(root_dir=str(workspace_path), virtual_mode=True),
            middleware=[model_retry_middleware],
            system_prompt=get_prompt("specs"),
        )
        
        architect_agent = create_deep_agent(
            model=self.model,
            backend=FilesystemBackend(root_dir=str(workspace_path), virtual_mode=True),
            middleware=[model_retry_middleware],
            system_prompt=get_prompt("architect"),
        )
        
        developer_agent = create_deep_agent(
            model=self.model,
            backend=FilesystemBackend(root_dir=str(workspace_path), virtual_mode=True),
            middleware=[model_retry_middleware, shell_middleware],
            system_prompt=get_prompt("developer"),
        )
        
        reviewer_agent = create_deep_agent(
            model=self.model,
            backend=FilesystemBackend(root_dir=str(workspace_path), virtual_mode=True),
            middleware=[model_retry_middleware],
            system_prompt=get_prompt("reviewer"),
        )
        
        # Wrap each deep agent as a CompiledSubAgent
        subagents = [
            CompiledSubAgent(
                name="specs",
                description="Specs agent responsible for analyzing projects and creating comprehensive specifications documentation. Use this agent to analyze the codebase structure, technology stack, architecture patterns, dependencies, and generate detailed project specifications.",
                runnable=specs_agent,
            ),
            CompiledSubAgent(
                name="architect",
                description="Architect agent responsible for technical planning and task decomposition. Use this agent to design technical approaches, make architectural decisions, create detailed tasklists with tasks and subtasks, and define implementation strategies.",
                runnable=architect_agent,
            ),
            CompiledSubAgent(
                name="developer",
                description="Developer agent responsible for executing specific implementation tasks. Use this agent to implement code following existing patterns, write tests, execute assigned tasks, and produce high-quality working code.",
                runnable=developer_agent,
            ),
            CompiledSubAgent(
                name="reviewer",
                description="Reviewer agent responsible for validating project completion and quality assurance. Use this agent to verify all tasks are complete, validate goal achievement, test end-to-end functionality, review code quality, and provide final approval or actionable feedback.",
                runnable=reviewer_agent,
            ),
        ]
        
        # Create main agent with subagents
        return create_deep_agent(
            model=self.model,
            backend=FilesystemBackend(root_dir=str(workspace_path), virtual_mode=True),
            middleware=[model_retry_middleware],
            system_prompt=system_prompt,
            subagents=subagents,
            checkpointer=InMemorySaver(),

        )

    def _setup_workspace_skills(self, workspace_path: Path) -> None:
        """Copy app/skills to workspace/.deepagents/skills/ for Docker access."""
        # Source: app/skills/
        app_skills = Path(__file__).parent.parent / "skills"
        
        # Destination: workspace/.deepagents/skills/
        workspace_skills = workspace_path / ".deepagents" / "skills"
        workspace_skills.mkdir(parents=True, exist_ok=True)
        
        if not app_skills.exists():
            return
        
        # Copy each skill directory (exclude __pycache__, __init__.py, load.py)
        for skill_dir in app_skills.iterdir():
            if skill_dir.is_dir() and not skill_dir.name.startswith(('_', '.')):
                target_dir = workspace_skills / skill_dir.name
                if target_dir.exists():
                    shutil.rmtree(target_dir)
                shutil.copytree(skill_dir, target_dir)


    async def run_agent_stream(self, prompt: str, userid: str, files: Optional[List[str]] = None):
        """Run the agent with streaming response."""
        # Create workspace on HOST: /tmp/workspaces/{userid}/
        workspace_path = self.create_workspace(userid)

        # Save files if provided
        if files:
            self.save_files_to_workspace(workspace_path, files)

        # Copy app/skills to workspace/.deepagents/skills/
        # This will be accessible in Docker at /workspace/.deepagents/skills/
        self._setup_workspace_skills(workspace_path)

        # Initialize memory system with proper paths
        # User memory: ~/.deepagents/memories/{userid}/
        # Project memory: /tmp/workspaces/{userid}/.deepagents/
        memory = AgentMemory(
            userid=userid,
            workspace_path=workspace_path,
            memory_base_path=Path.home() / ".deepagents" / "memories"
        )

        # Initialize skills system pointing to workspace skills
        skills = SkillsService(
            skills_base_path=workspace_path / ".deepagents" / "skills",
            app_skills_path=Path(__file__).parent.parent / "skills"
        )

        # Build system prompt with DOCKER container paths
        base_prompt = get_main_prompt()
        
        # Add memory context with Docker paths
        memory_context = memory.build_memory_context(container_workspace="/workspace")
        
        # Add skills context with Docker paths
        skills_context = skills.build_skills_context(container_workspace="/workspace")
        
        workspace_info = f"<workspace info>\nThe current workspace directory is '{workspace_path}/' **dont add absulute path** starting from /temp as for you your root directory is {workspace_path}/ so while accessing files use relative paths only.\n</workspace info>\n"
        # Combine all contexts
        full_system_prompt = base_prompt + "\n\n" + memory_context + "\n\n" + skills_context + "\n\n" + workspace_info

        # Create agent (workspace_path is HOST path, gets mounted to /workspace in Docker)
        agent = self.create_agent(workspace_path, full_system_prompt)

        # Stream agent response with subgraph streaming enabled for transparency
        return agent.astream(
            {"messages": [{"role": "user", "content": prompt}]},
            stream_mode="updates",
            subgraphs=True,  # Enable streaming from subagents for user transparency
            config={"configurable": {"thread_id": userid}},
        )