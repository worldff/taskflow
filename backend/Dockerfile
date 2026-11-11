# syntax=docker/dockerfile:1
# Image backend (REST API). Dapat dibangun dengan Docker maupun Podman.

# ---------- Stage 1: builder ----------
FROM python:3.12-slim AS builder
WORKDIR /build
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt

# ---------- Stage 2: runtime ----------
FROM python:3.12-slim AS runtime

ARG APP_VERSION=1.0.0
LABEL org.opencontainers.image.title="TaskFlow API" \
      org.opencontainers.image.description="Backend REST API TaskFlow - UTS DevOps" \
      org.opencontainers.image.version="${APP_VERSION}"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_VERSION=${APP_VERSION} \
    APP_ENV=production

WORKDIR /app
COPY --from=builder /install /usr/local

# Jalankan sebagai user non-root demi keamanan
RUN useradd --create-home --uid 1001 appuser
COPY --chown=appuser:appuser app ./app
COPY --chown=appuser:appuser wsgi.py .
USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:5000/api/health').status==200 else 1)"

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--access-logfile", "-", "wsgi:app"]
