# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use China mirror for better connectivity)
RUN npm config set registry https://registry.npmmirror.com && npm ci

# Copy source code
COPY . .

# Build the Nuxt application
RUN npm run build && \
    ls -la .output && \
    ls -la .output/public/_nuxt || echo "Warning: _nuxt directory not found"

# Production stage - Nuxt 3 .output is self-contained, no need to install deps
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nuxtjs

# Copy entire built application output (self-contained)
COPY --from=builder /app/.output/ ./.output/

# Create symbolic link to fix Nitro static file path issue
# Nitro looks for files in .output/server/chunks/public/_nuxt/ but they are in .output/public/_nuxt/
RUN mkdir -p .output/server/chunks/public && \
    ln -s /app/.output/public/_nuxt .output/server/chunks/public/_nuxt

# Change ownership
RUN chown -R nuxtjs:nodejs /app

# Switch to non-root user
USER nuxtjs

# Expose port
EXPOSE 3000

# Set environment
ENV HOST=0.0.0.0
ENV PORT=3000

# Health check (using wget which is pre-installed in alpine)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Run the application
CMD ["node", ".output/server/index.mjs"]
