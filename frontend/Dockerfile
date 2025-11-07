# Build stage
FROM node:20-alpine AS build

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
FROM node:20-alpine

# Install nginx
RUN apk add --no-cache nginx

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=build /workspace/frontend/build /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
