import socket

from flask import Blueprint, current_app, jsonify
from sqlalchemy import text

from .models import db

bp = Blueprint("system", __name__)


@bp.get("/health")
def health():
    try:
        db.session.execute(text("SELECT 1"))
        db_status = "up"
    except Exception:  # pragma: no cover - hanya terjadi jika DB mati
        db_status = "down"
    code = 200 if db_status == "up" else 503
    return (
        jsonify(
            status="ok" if code == 200 else "degraded",
            database=db_status,
            version=current_app.config["APP_VERSION"],
            environment=current_app.config["APP_ENV"],
            hostname=socket.gethostname(),
        ),
        code,
    )
