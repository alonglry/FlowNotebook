# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
ARG VITE_GOOGLE_CLIENT_ID=580200184162-6n0hn15la70qopd7hc3tetccm6ok27md.apps.googleusercontent.com
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
COPY dag-notebook/frontend/package*.json ./
RUN npm ci
COPY dag-notebook/frontend/ ./
RUN npm run build

# Stage 2: Production Python Backend + Static Host
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend application code
COPY dag-notebook/backend/ ./

# Copy built frontend assets to /app/dist
COPY --from=frontend-builder /frontend/dist /app/dist

# Set production environment
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

EXPOSE 8080

CMD ["python", "main.py"]
