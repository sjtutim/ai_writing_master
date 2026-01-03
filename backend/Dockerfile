# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use China mirror for better connectivity)
RUN npm config set registry https://registry.npmmirror.com && npm ci --only=production=false

# Copy source code
COPY . .

# Generate Prisma client and build (with placeholder DATABASE_URL)
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

# Copy package files
COPY package*.json ./

# Install production dependencies only (use China mirror)
RUN npm config set registry https://registry.npmmirror.com && npm ci --only=production

# Copy Prisma schema (needed for migrations at runtime, optional)

# Copy built application and generated Prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./dist/generated

# Change ownership
RUN chown -R expressjs:nodejs /app

# Switch to non-root user
USER expressjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3001/api/health || exit 1

# Run the application
CMD ["node", "dist/index.js"]
