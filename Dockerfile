# --- Stage 1: Builder ---
FROM node:22-alpine AS builder
WORKDIR /app

# Copy root and frontend package definitions for layer caching
COPY package*.json tsconfig.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies for both root and frontend
RUN npm ci
RUN npm --prefix frontend ci

# Copy backend & frontend source code
COPY src ./src
COPY scraper ./scraper
COPY public ./public
COPY frontend ./frontend

# Run production build (compiles TS backend to dist/ and Vite frontend to public/)
RUN npm run build

# Prune root devDependencies for production runtime
RUN npm prune --production

# --- Stage 2: Production Runner ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy package definitions, production node_modules, compiled backend, and built public assets
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Use non-root node user for security
USER node

EXPOSE 3000

CMD ["node", "dist/src/index.js"]