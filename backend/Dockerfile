FROM python:3.10-alpine AS builder

# Install build dependencies
RUN apk add --no-cache --virtual .build-deps \
    gcc \
    g++ \
    musl-dev \
    python3-dev \
    linux-headers \
    cmake \
    make

WORKDIR /app

# Copy and install requirements in a separate layer
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Create final image
FROM python:3.10-alpine

# Install only runtime dependencies
RUN apk add --no-cache \
    poppler-utils \
    tesseract-ocr \
    libreoffice \
    libstdc++

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"] 