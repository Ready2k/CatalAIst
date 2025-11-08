FROM registry.access.redhat.com/ubi9/nodejs-20:latest

USER 0

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built application and shared types
COPY backend/dist ./dist

# Create data directory
RUN mkdir -p /data && chown -R 1001:0 /data /app

# Switch to non-root user
USER 1001

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start application
CMD ["node", "dist/backend/src/index.js"]
