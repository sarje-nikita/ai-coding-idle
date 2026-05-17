FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed (e.g., for gcc in startup_commands)
RUN apt-get update && apt-get install -y \
    gcc \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install python-dotenv

# Copy the application code
COPY . .

# Install the project in editable mode for LangGraph
RUN pip install -e .

# Set environment variable to allow blocking operations in deployment
ENV BG_JOB_ISOLATED_LOOPS=true

# Expose the port for LangGraph dev (default is 2024)
EXPOSE 2024

# Run LangGraph dev with allow-blocking flag
CMD ["langgraph", "dev", "--host", "0.0.0.0", "--allow-blocking"]