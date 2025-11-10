FROM registry.access.redhat.com/ubi9/nodejs-20:latest

USER 0

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built application and shared types
COPY backend/dist ./dist

# Copy test script
COPY backend/test-security.sh ./test-security.sh
RUN chmod +x ./test-security.sh

# Create data directory with proper permissions
RUN mkdir -p /data && chown -R 1001:0 /data /app && chmod -R g+w /data

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
