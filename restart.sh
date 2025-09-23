#!/bin/bash

# LaSanta Calavera Management System - Restart Script
# Optimiert für Production Deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    error "docker-compose.prod.yml not found. Are you in the correct directory?"
    exit 1
fi

log "Starting LaSanta Calavera system restart..."

# Step 1: Pull latest changes
log "Pulling latest changes from git..."
if git pull -f; then
    success "Git pull completed successfully"
else
    error "Git pull failed. Check your connection and permissions."
    exit 1
fi

# Step 2: Stop existing containers
log "Stopping existing containers..."
if docker compose down; then
    success "Containers stopped successfully"
else
    warning "Some containers may not have stopped cleanly"
fi

# Step 3: Clean up dangling images (optional but good practice)
log "Cleaning up dangling images..."
docker image prune -f > /dev/null 2>&1 || true

# Step 4: Build and start containers
log "Building and starting containers with production configuration..."
if docker compose -f docker-compose.prod.yml up --build -d; then
    success "Containers started successfully"
else
    error "Failed to start containers"
    exit 1
fi

# Step 5: Wait for services to be ready
log "Waiting for services to be ready..."
sleep 10

# Step 6: Health check
log "Performing health checks..."
if docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    success "Services are running"
else
    error "Some services failed to start"
    docker compose -f docker-compose.prod.yml ps
    exit 1
fi

# Step 7: Show running containers
log "Current container status:"
docker compose -f docker-compose.prod.yml ps

# Step 8: Show logs for the last 10 lines
log "Recent logs:"
docker compose -f docker-compose.prod.yml logs --tail=10

success "LaSanta Calavera system restart completed successfully!"
log "System is ready at: https://lsc-nc.de"
