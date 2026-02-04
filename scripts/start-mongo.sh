#!/bin/bash
# Start MongoDB in Docker with port 27017 exposed to host.
# Run from project root: ./scripts/start-mongo.sh

set -e
CONTAINER_NAME="aesthetiq-mong"
IMAGE="mongo:7"
PORT="27017"

echo "Stopping existing container (if any)..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

echo "Starting MongoDB on 127.0.0.1:${PORT}..."
docker run -d \
  --name "$CONTAINER_NAME" \
  -p 127.0.0.1:${PORT}:27017 \
  "$IMAGE"

echo "Waiting for MongoDB to be ready..."
sleep 3

if nc -zv 127.0.0.1 "$PORT" 2>&1; then
  echo "MongoDB is reachable at 127.0.0.1:${PORT}"
else
  echo "Warning: Port check failed. Try again in a few seconds: nc -zv 127.0.0.1 $PORT"
fi
