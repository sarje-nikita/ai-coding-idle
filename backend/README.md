# DeepAgent POC

AI-powered coding assistant with sandbox execution using FastAPI and LangChain.

## Features

- **AI Agent**: Powered by Azure OpenAI GPT-4
- **Sandbox Execution**: Docker-based secure code execution
- **FastAPI**: Modern, fast web framework
- **Structured Code**: Industry-standard project organization
- **Dependency Injection**: Clean architecture with proper separation of concerns

## Project Structure

```
├── app/
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings.py          # Application settings and configuration
│   ├── dependencies/
│   │   └── __init__.py          # Dependency injection setup
│   ├── middleware/
│   │   ├── error_handlers.py    # Global error handling
│   │   └── logging.py           # Request/response logging
│   ├── models/
│   │   ├── __init__.py
│   │   └── agent.py             # Pydantic models for API
│   ├── routers/
│   │   ├── __init__.py
│   │   └── agent.py             # API endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   └── agent_service.py     # Business logic
│   ├── __init__.py
│   └── main.py                  # FastAPI application factory
├── main.py                      # Application entry point
├── pyproject.toml               # Project configuration
├── requirements.txt             # Dependencies
├── .env.example                 # Environment variables template
└── README.md                    # This file
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd deepagent-poc
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Azure OpenAI credentials
   ```

## Configuration

Edit the `.env` file with your Azure OpenAI credentials:

```env
AZURE_OPENAI_API_KEY=your_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com
```

## Running the Application

### Development
```bash
python main.py
```

### Production
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## API Usage

### Run Agent
```bash
curl -X POST "http://localhost:8000/api/v1/run-agent" \
     -F "prompt=Create a hello world Python script" \
     -F "userid=test-user"
```

### Health Check
```bash
curl http://localhost:8000/api/v1/health
```

## API Documentation

Once running, visit `http://localhost:8000/docs` for interactive API documentation.

## Development

### Code Quality
```bash
# Install dev dependencies
pip install -e ".[dev]"

# Format code
black .

# Sort imports
isort .

# Lint code
flake8 .

# Type checking
mypy .
```

### Testing
```bash
pytest
```

## Architecture

- **Models**: Pydantic models for request/response validation
- **Services**: Business logic and external integrations
- **Routers**: API endpoint definitions
- **Dependencies**: Dependency injection container
- **Middleware**: Cross-cutting concerns (logging, error handling)
- **Config**: Centralized configuration management

## Security

- Docker sandbox for code execution
- Input validation with Pydantic
- CORS configuration
- Environment-based secrets management

## License

[Add your license here]