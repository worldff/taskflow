"""TaskFlow API - backend REST untuk aplikasi full stack TaskFlow."""
import os

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException

from .models import db, ensure_admin, upgrade_schema

__version__ = os.getenv("APP_VERSION", "1.0.0")


def create_app(test_config=None):
    app = Flask(__name__)

    app.config.from_mapping(
        SECRET_KEY=os.getenv("SECRET_KEY", "dev-secret-change-me-in-production"),
        SQLALCHEMY_DATABASE_URI=os.getenv("DATABASE_URL", "sqlite:///taskflow.db"),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JWT_EXPIRES_HOURS=int(os.getenv("JWT_EXPIRES_HOURS", "12")),
        CORS_ORIGINS=os.getenv("CORS_ORIGINS", "http://localhost:5173"),
        # Akun admin awal dibuat otomatis dari environment variable
        ADMIN_NAME=os.getenv("ADMIN_NAME", "Administrator"),
        ADMIN_EMAIL=os.getenv("ADMIN_EMAIL", "admin@taskflow.id"),
        ADMIN_PASSWORD=os.getenv("ADMIN_PASSWORD", "admin123"),
        APP_VERSION=__version__,
        APP_ENV=os.getenv("APP_ENV", "development"),
    )
    if test_config:
        app.config.update(test_config)

    db.init_app(app)

    from .admin import bp as admin_bp
    from .auth import bp as auth_bp
    from .system import bp as system_bp
    from .tasks import bp as tasks_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(tasks_bp, url_prefix="/api/tasks")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(system_bp, url_prefix="/api")

    @app.after_request
    def add_cors_headers(response):
        # Di production frontend & API satu origin (lewat Nginx), CORS hanya untuk dev.
        origins = [o.strip() for o in app.config["CORS_ORIGINS"].split(",") if o.strip()]
        origin = request.headers.get("Origin")
        if origin and origin in origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
        return response

    @app.errorhandler(HTTPException)
    def handle_http_error(err):
        return jsonify(error=err.description), err.code

    with app.app_context():
        db.create_all()
        upgrade_schema()
        cfg = app.config
        ensure_admin(cfg["ADMIN_EMAIL"], cfg["ADMIN_PASSWORD"], cfg["ADMIN_NAME"])
        # Tutup koneksi milik proses induk agar tiap worker Gunicorn membuat koneksinya sendiri.
        if db.engine.dialect.name != "sqlite":
            db.engine.dispose()

    return app
