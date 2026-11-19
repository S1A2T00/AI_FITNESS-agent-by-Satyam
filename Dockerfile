# syntax=docker/dockerfile:1

# ---------- build: compile the React frontend ----------
FROM node:26-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
RUN npm run build


# ---------- production: only the server and its runtime deps ----------
FROM node:26-alpine AS production
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3001

# Patch OS packages so the image scan starts clean.
RUN apk upgrade --no-cache

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx

COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server ./server
COPY --chown=node:node constants.ts ./constants.ts

USER node
EXPOSE 3001

# /api/health returns 200 only when the server AND the database are up.
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/api/health" || exit 1

CMD ["node", "server/index.mjs"]
