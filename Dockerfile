# --- Stage 1: Build ---
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies separately for better layer caching
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy source code and build
COPY src ./src
COPY public ./public
RUN npm run build

# Prune devDependencies to leave only production packages
RUN npm prune --production

# --- Stage 2: Production ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy production dependencies and built code from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY public ./public
# Use non-root node user for security
USER node

EXPOSE 3000

CMD ["node", "dist/index.js"]