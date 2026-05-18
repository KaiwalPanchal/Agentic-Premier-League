FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for OpenCV and SQLite
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code and the data (including venue.db)
COPY ./backend ./backend
COPY ./data ./data

# Ensure data directory has correct permissions
RUN chmod -R 777 /app/data

# Set environment variables
ENV SQLITE_DB_PATH=/app/data/venue.db
ENV PORT=8080

# Expose port and run
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}"]
