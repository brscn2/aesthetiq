FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for health checks and MediaPipe/OpenCV
# Using multiple attempts to handle different Debian versions
RUN apt-get update && \
    (apt-get install -y --no-install-recommends \
        curl \
        libglib2.0-0 \
        libgomp1 \
        libsm6 \
        libxext6 \
        libxrender1 \
        libgl1 \
        || apt-get install -y --no-install-recommends \
        curl \
        libglib2.0-0 \
        libgomp1) && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Expose port
EXPOSE 8005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8005/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8005"]
