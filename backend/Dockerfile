FROM node:24-alpine

# Install required packages for Alpine
RUN apk add --no-cache curl shadow su-exec ffmpeg

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built application
COPY backend/dist ./dist

# Copy compiled shared module to the location where backend expects it
# Backend imports from '../../../shared/dist' which resolves to /app/dist/shared/dist
COPY shared/dist ./dist/shared/dist

# Copy test script
COPY backend/test-security.sh ./test-security.sh
RUN chmod +x ./test-security.sh

# Create data directory with proper permissions
RUN mkdir -p /data && chmod -R 755 /data /app

# Copy entrypoint script
COPY backend/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Use entrypoint to fix permissions then switch to non-root user
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/backend/src/index.js"]
