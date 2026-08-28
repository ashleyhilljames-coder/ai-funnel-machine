# --- Stage 1: Builder ---
FROM node:22-alpine AS builder
WORKDIR /app

# Copy all configuration files for root and frontend before installing dependencies
COPY package*.json tsconfig.json ./
COPY frontend/package*.json frontend/vite.config.ts frontend/tsconfig*.json frontend/tailwind.config.js frontend/postcss.config.js ./frontend/

# Install root and frontend node dependencies
RUN npm install
RUN cd frontend && npm install

# Copy source files for backend, frontend, scrapers, and static assets
COPY src ./src
COPY scraper ./scraper
COPY public ./public
COPY frontend ./frontend

# Run production build (compiles backend via tsc to ./dist and frontend via vite to ./public)
RUN npm run build

# Prune devDependencies for production runtime
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