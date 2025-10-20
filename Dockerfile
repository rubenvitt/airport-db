# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.12.3 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build arguments for environment variables
ARG NEXT_PUBLIC_API_URL
ARG OPENSKY_API_URL
ARG API_NINJAS_API_URL

# Set build environment variables
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    OPENSKY_API_URL=$OPENSKY_API_URL \
    API_NINJAS_API_URL=$API_NINJAS_API_URL

# Build the Next.js application
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.12.3 --activate

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/.next ./.next
COPY --from=builder --chown=nodejs:nodejs /app/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/next.config.js ./
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/airports', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["pnpm", "start"]