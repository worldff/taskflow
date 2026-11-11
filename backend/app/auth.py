import re
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import Blueprint, abort, current_app, g, jsonify, request

from .models import User, db

bp = Blueprint("auth", __name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def create_token(user):
    payload = {
        "sub": str(user.id),
        "exp": datetime.now(timezone.utc)
        + timedelta(hours=current_app.config["JWT_EXPIRES_HOURS"]),
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


def login_required(view):
    """Decorator: mewajibkan header Authorization: Bearer <token>."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            abort(401, "Token tidak ditemukan")
        try:
            payload = jwt.decode(
                header[7:], current_app.config["SECRET_KEY"], algorithms=["HS256"]
            )
        except jwt.ExpiredSignatureError:
            abort(401, "Sesi telah berakhir, silakan login kembali")
        except jwt.InvalidTokenError:
            abort(401, "Token tidak valid")
        user = db.session.get(User, int(payload["sub"]))
        if user is None:
            abort(401, "Pengguna tidak ditemukan")
        g.user = user
        return view(*args, **kwargs)

    return wrapper


def admin_required(view):
    """Decorator: hanya pengguna dengan role admin yang boleh mengakses."""

    @wraps(view)
    @login_required
    def wrapper(*args, **kwargs):
        if not g.user.is_admin:
            abort(403, "Halaman ini khusus admin")
        return view(*args, **kwargs)

    return wrapper


@bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not name:
        abort(400, "Nama wajib diisi")
    if not EMAIL_RE.match(email):
        abort(400, "Format email tidak valid")
    if len(password) < 6:
        abort(400, "Password minimal 6 karakter")
    if User.query.filter_by(email=email).first():
        abort(409, "Email sudah terdaftar")

    user = User(name=name[:80], email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify(token=create_token(user), user=user.to_dict()), 201


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    user = User.query.filter_by(email=email).first()
    if user is None or not user.check_password(str(data.get("password", ""))):
        abort(401, "Email atau password salah")
    return jsonify(token=create_token(user), user=user.to_dict())


@bp.get("/me")
@login_required
def me():
    return jsonify(user=g.user.to_dict())
