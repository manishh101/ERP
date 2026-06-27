# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json server/

# Install dependencies
RUN npm ci

# Copy source
COPY server ./server

# Generate Prisma client (needed for TypeScript types)
RUN npx prisma generate --schema=server/prisma/schema.prisma

# Prevent TypeScript out-of-memory issues / swapping on constrained builders
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Build
RUN npx tsc -p server/tsconfig.json --ignoreDeprecations 6.0

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./
COPY server/package*.json server/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy Prisma schema and generate client for runtime
COPY server/prisma ./server/prisma
RUN npx prisma generate --schema=server/prisma/schema.prisma

# Copy built application from builder
COPY --from=builder /app/server/dist ./server/dist

# Create uploads directory
RUN mkdir -p uploads

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["sh", "-c", "npx prisma migrate deploy --schema=server/prisma/schema.prisma || echo 'Prisma migration skipped or failed'; node server/dist/index.js"]

EXPOSE 4000
