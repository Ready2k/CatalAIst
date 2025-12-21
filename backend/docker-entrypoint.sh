#!/bin/sh
set -e

echo "Starting CatalAIst backend..."

# Create data directory with proper permissions
mkdir -p /data
chmod 755 /data

# Start the application
cd /app
npm start
