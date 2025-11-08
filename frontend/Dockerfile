# Build stage
FROM registry.access.redhat.com/ubi9/nodejs-20:latest AS build

USER 0

WORKDIR /workspace

# Copy shared types
COPY shared ./shared

# Copy frontend directory
COPY frontend ./frontend

# Install dependencies
WORKDIR /workspace/frontend
RUN npm ci

# Build application
RUN npm run build

# Production stage
FROM registry.access.redhat.com/ubi9/nginx-122:latest

USER 0

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=build /workspace/frontend/build /usr/share/nginx/html

# Set proper permissions
RUN chown -R 1001:0 /usr/share/nginx/html && \
    chmod -R g=u /usr/share/nginx/html

# Switch to non-root user
USER 1001

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
