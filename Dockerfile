# Dockerfile for Production Deployment
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci --only=production --workspaces

# Build client
FROM base AS client-builder
WORKDIR /app
COPY client ./client
COPY client/package*.json ./client/
RUN cd client && npm ci && npm run build

# Production server image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy server files
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY server ./server
COPY --from=client-builder /app/client/build ./client/build

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Set permissions
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "run", "server:start"]