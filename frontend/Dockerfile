# syntax=docker/dockerfile:1
# Image frontend: React dibuild dengan Node, lalu disajikan oleh Nginx.

# ---------- Stage 1: build ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---------- Stage 2: runtime ----------
FROM nginx:1.27-alpine AS runtime

ARG APP_VERSION=1.0.0
LABEL org.opencontainers.image.title="TaskFlow Web" \
      org.opencontainers.image.description="Frontend React TaskFlow - UTS DevOps" \
      org.opencontainers.image.version="${APP_VERSION}"

# Alamat backend dapat diganti saat runtime (default: service "backend" di compose)
ENV BACKEND_URL=http://backend:5000

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
