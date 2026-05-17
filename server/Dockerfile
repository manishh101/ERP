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

# Build
RUN npm run build --workspace server

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

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["sh", "-c", "npx prisma migrate deploy --schema=server/prisma/schema.prisma && node server/dist/index.js"]

EXPOSE 4000
