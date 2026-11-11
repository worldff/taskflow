"""Endpoint khusus admin: melihat semua tugas masuk dan memverifikasi penyelesaian."""
from datetime import datetime, timezone

from flask import Blueprint, abort, g, jsonify, request

from .auth import admin_required
from .models import Task, User, db

bp = Blueprint("admin", __name__)


@bp.get("/tasks")
@admin_required
def list_all_tasks():
    query = Task.query.join(User, Task.user_id == User.id)
    status = request.args.get("status")
    if status == "menunggu":
        query = query.filter(Task.done.is_(False))
    elif status == "selesai":
        query = query.filter(Task.done.is_(True))
    # Tugas yang menunggu review ditampilkan paling atas, yang terlama lebih dulu
    tasks = query.order_by(Task.done, Task.created_at.asc()).all()
    return jsonify([t.to_dict(include_owner=True) for t in tasks])


@bp.get("/stats")
@admin_required
def admin_stats():
    total = Task.query.count()
    done = Task.query.filter_by(done=True).count()
    return jsonify(
        total=total,
        pending=total - done,
        done=done,
        users=User.query.filter_by(role="user").count(),
    )


@bp.patch("/tasks/<int:task_id>")
@admin_required
def review_task(task_id):
    task = db.session.get(Task, task_id)
    if task is None:
        abort(404, "Tugas tidak ditemukan")
    data = request.get_json(silent=True) or {}
    if "done" not in data:
        abort(400, "Field 'done' wajib diisi")
    task.done = bool(data["done"])
    if task.done:
        task.reviewed_by_id = g.user.id
        task.reviewed_at = datetime.now(timezone.utc)
    else:
        task.reviewed_by_id = None
        task.reviewed_at = None
    db.session.commit()
    return jsonify(task.to_dict(include_owner=True))
