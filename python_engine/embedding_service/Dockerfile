# Multi-stage build for embedding service with CUDA support
FROM nvidia/cuda:11.8.0-runtime-ubuntu22.04 AS base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    DEBIAN_FRONTEND=noninteractive

# Install Python 3.11
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-dev \
    python3-pip \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Create symlinks (force overwrite if exists)
RUN ln -sf /usr/bin/python3.11 /usr/bin/python && \
    ln -sf /usr/bin/python3.11 /usr/bin/python3

# Upgrade pip
RUN python -m pip install --upgrade pip

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app ./app

# Download model weights on build (optional - speeds up startup)
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/clip-ViT-B-32')"

# Expose port
EXPOSE 8004

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8004/health')"

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8004"]
