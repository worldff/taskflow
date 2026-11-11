"""Endpoint tugas milik pengguna (role user).

Alur: user mengirim tugas -> status "menunggu" -> admin memverifikasi -> status "selesai".
User tidak dapat menandai tugasnya sendiri sebagai selesai.
"""
from datetime import date

from flask import Blueprint, abort, g, jsonify, request

from .auth import login_required
from .models import PRIORITIES, Task, db

bp = Blueprint("tasks", __name__)


def _get_own_task(task_id):
    task = db.session.get(Task, task_id)
    if task is None or task.user_id != g.user.id:
        abort(404, "Tugas tidak ditemukan")
    return task


def _parse_due(value):
    if value in (None, ""):
        return None
    try:
        return date.fromisoformat(str(value))
    except ValueError:
        abort(400, "Format due_date harus YYYY-MM-DD")


def _check_priority(value):
    if value not in PRIORITIES:
        abort(400, f"Priority harus salah satu dari: {', '.join(PRIORITIES)}")
    return value


@bp.get("")
@login_required
def list_tasks():
    query = Task.query.filter_by(user_id=g.user.id)
    status = request.args.get("status")
    if status == "menunggu":
        query = query.filter_by(done=False)
    elif status == "selesai":
        query = query.filter_by(done=True)
    tasks = query.order_by(Task.done, Task.created_at.desc()).all()
    return jsonify([t.to_dict() for t in tasks])


@bp.get("/stats")
@login_required
def stats():
    total = Task.query.filter_by(user_id=g.user.id).count()
    done = Task.query.filter_by(user_id=g.user.id, done=True).count()
    return jsonify(
        total=total,
        done=done,
        pending=total - done,
        progress=round(done * 100 / total) if total else 0,
    )


@bp.post("")
@login_required
def create_task():
    if g.user.is_admin:
        abort(403, "Admin tidak mengirim tugas; admin memverifikasi tugas pengguna")
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    if not title:
        abort(400, "Judul tugas wajib diisi")
    description = str(data.get("description", "")).strip()
    if not description:
        abort(400, "Deskripsi tugas wajib diisi agar dapat dicek admin")
    task = Task(
        user_id=g.user.id,
        title=title[:120],
        description=description,
        priority=_check_priority(data.get("priority", "sedang")),
        due_date=_parse_due(data.get("due_date")),
    )
    db.session.add(task)
    db.session.commit()
    return jsonify(task.to_dict()), 201


@bp.get("/<int:task_id>")
@login_required
def get_task(task_id):
    return jsonify(_get_own_task(task_id).to_dict())


@bp.patch("/<int:task_id>")
@login_required
def update_task(task_id):
    task = _get_own_task(task_id)
    data = request.get_json(silent=True) or {}
    if "done" in data:
        abort(403, "Status selesai hanya dapat diubah oleh admin")
    if task.done:
        abort(400, "Tugas yang sudah diverifikasi admin tidak dapat diubah")
    if "title" in data:
        title = str(data["title"]).strip()
        if not title:
            abort(400, "Judul tugas tidak boleh kosong")
        task.title = title[:120]
    if "description" in data:
        description = str(data["description"]).strip()
        if not description:
            abort(400, "Deskripsi tugas tidak boleh kosong")
        task.description = description
    if "priority" in data:
        task.priority = _check_priority(data["priority"])
    if "due_date" in data:
        task.due_date = _parse_due(data["due_date"])
    db.session.commit()
    return jsonify(task.to_dict())


@bp.delete("/<int:task_id>")
@login_required
def delete_task(task_id):
    task = _get_own_task(task_id)
    if task.done:
        abort(400, "Tugas yang sudah diverifikasi admin tidak dapat dihapus")
    db.session.delete(task)
    db.session.commit()
    return "", 204
