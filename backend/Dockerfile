# Base
FROM python:3.12-slim AS base

# Builder — install Python deps in isolated prefix
FROM base AS builder
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev libffi-dev \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Runner
FROM base AS runner
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}

# System dependencies for Tesseract, WeasyPrint, OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-deu \
    libtesseract-dev \
    poppler-utils \
    libpq-dev \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Create upload directories and non-root user
RUN mkdir -p /app/uploads/documents /app/uploads/exports \
    && addgroup --system --gid 1001 appgroup \
    && adduser --system --uid 1001 appuser \
    && chown -R appuser:appgroup /app/uploads

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
