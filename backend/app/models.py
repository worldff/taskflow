from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()

PRIORITIES = ("rendah", "sedang", "tinggi")
ROLES = ("user", "admin")


def _now():
    return datetime.now(timezone.utc)


def _iso(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:  # SQLite menyimpan tanpa zona waktu
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(10), nullable=False, default="user", server_default="user")
    created_at = db.Column(db.DateTime, nullable=False, default=_now)

    tasks = db.relationship(
        "Task",
        backref="owner",
        cascade="all, delete-orphan",
        foreign_keys="Task.user_id",
    )

    @property
    def is_admin(self):
        return self.role == "admin"

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "email": self.email, "role": self.role}


class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, default="")
    priority = db.Column(db.String(10), nullable=False, default="sedang")
    due_date = db.Column(db.Date, nullable=True)
    # done = True berarti sudah diverifikasi selesai oleh admin
    done = db.Column(db.Boolean, nullable=False, default=False)
    reviewed_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=_now)

    reviewer = db.relationship("User", foreign_keys=[reviewed_by_id])

    @property
    def status(self):
        return "selesai" if self.done else "menunggu"

    def to_dict(self, include_owner=False):
        data = {
            "id": self.id,
            "title": self.title,
            "description": self.description or "",
            "priority": self.priority,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "done": self.done,
            "status": self.status,
            "reviewed_by": self.reviewer.name if self.reviewer else None,
            "reviewed_at": _iso(self.reviewed_at),
            "created_at": _iso(self.created_at),
        }
        if include_owner:
            owner = self.owner
            data["owner"] = {"id": owner.id, "name": owner.name, "email": owner.email}
        return data


# Kolom yang ditambahkan setelah versi awal. Database lama (SQLite di laptop atau
# volume PostgreSQL) otomatis ditambah kolom ini saat aplikasi start.
_NEW_COLUMNS = {
    "users": {"role": "VARCHAR(10) NOT NULL DEFAULT 'user'"},
    "tasks": {"reviewed_by_id": "INTEGER", "reviewed_at": "TIMESTAMP"},
}


def upgrade_schema():
    inspector = inspect(db.engine)
    for table, columns in _NEW_COLUMNS.items():
        existing = {c["name"] for c in inspector.get_columns(table)}
        for name, ddl in columns.items():
            if name not in existing:
                db.session.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
    db.session.commit()


def ensure_admin(email, password, name="Administrator"):
    """Membuat akun admin awal (atau menjadikan akun tersebut admin)."""
    if not email or not password:
        return
    email = email.strip().lower()
    admin = User.query.filter_by(email=email).first()
    if admin is None:
        admin = User(name=name, email=email, role="admin")
        admin.set_password(password)
        db.session.add(admin)
    elif admin.role != "admin":
        admin.role = "admin"
    try:
        db.session.commit()
    except IntegrityError:
        # Proses lain sudah membuat akun admin yang sama pada saat bersamaan.
        db.session.rollback()
