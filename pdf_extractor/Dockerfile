FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directories for input and output
RUN mkdir -p /data/input /data/output

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV INPUT_DIR=/data/input
ENV OUTPUT_DIR=/data/output

# Run the application
ENTRYPOINT ["python", "table_extractor.py"]
CMD ["--help"] 