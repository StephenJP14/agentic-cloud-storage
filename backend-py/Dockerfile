# Use official Python runtime
FROM python:3.11-slim

# Prevent Python from writing .pyc files
ENV PYTHONDONTWRITEBYTECODE=1
# Ensure stdout/stderr are unbuffered
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y gcc zlib1g-dev

# Set working directory
WORKDIR /app

# Install system dependencies (optional, adjust as needed)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Default command (change to your app entrypoint)
CMD ["python", "main.py"]