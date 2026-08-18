# ==============================================================================
# Google Cloud Run Container — TanStack Start SSR
# ==============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build production bundle
COPY . .
ENV NODE_ENV=production
RUN npm run build

# ------------------------------------------------------------------------------
# Production Runner
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Copy prebuilt Nitro output from builder
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package*.json ./

EXPOSE 8080

# Start TanStack Start Nitro server
CMD ["node", ".output/server/index.mjs"]
