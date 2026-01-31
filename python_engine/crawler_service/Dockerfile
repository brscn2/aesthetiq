FROM python:3.11-slim

# Install system dependencies for Playwright
# Install dependencies manually to avoid issues with missing packages
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    # Playwright/Chromium dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    libxshmfence1 \
    fonts-liberation \
    fonts-unifont \
    fonts-dejavu-core \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY crawler_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (skip install-deps since we installed manually)
RUN playwright install chromium

# Copy mcp_servers first (needed for imports)
COPY mcp_servers/ ./mcp_servers/

# Copy application code
COPY crawler_service/app/ ./app/
COPY crawler_service/config/ ./config/

# Set Python path
ENV PYTHONPATH=/app

# Expose port (for health checks)
EXPOSE 8005

# Run the service
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8005"]
