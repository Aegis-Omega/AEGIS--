# AEGIS Ω — Sovereign Omega Runtime
# Two-stage build: TypeScript frontend + Python bridge in one container.
# Epistemic Tier: T1 — production deployment substrate.
#
# Stage 1: Build the TypeScript governance frontend
FROM node:22-alpine AS ts-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production runtime
FROM python:3.11-slim AS runtime
WORKDIR /app

# System deps for Python matrix layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY python/requirements.txt ./python/requirements.txt
RUN pip install --no-cache-dir -r python/requirements.txt 2>/dev/null || true

# Copy Python bridge and matrix layer
COPY python/ ./python/

# Copy compiled TypeScript frontend from build stage
COPY --from=ts-build /app/dist ./dist

# Copy checkpoint directory (persisted via volume mount in production)
RUN mkdir -p /app/data

# Expose bridge port
EXPOSE 7890

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:7890/health || exit 1

# Run bridge with checkpoint directory mounted at /app/data
ENV SOVEREIGN_BRIDGE_PORT=7890
ENV AEGIS_CHECKPOINT_PATH=/app/data/aegis_checkpoint.json

WORKDIR /app/python
CMD ["python", "bridge.py"]
