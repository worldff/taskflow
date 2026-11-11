import pytest

from app import create_app
from app.models import db

ADMIN = {"email": "admin@test.id", "password": "admin12345"}


@pytest.fixture
def client():
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SECRET_KEY": "test",
            "ADMIN_EMAIL": ADMIN["email"],
            "ADMIN_PASSWORD": ADMIN["password"],
        }
    )
    with app.test_client() as client:
        with app.app_context():
            yield client
            db.session.remove()
            db.drop_all()


def register(client, email="arman@example.com", name="Arman"):
    return client.post(
        "/api/auth/register", json={"name": name, "email": email, "password": "rahasia123"}
    )


def auth_header(client, email="arman@example.com"):
    token = register(client, email=email).get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


def admin_header(client):
    token = client.post("/api/auth/login", json=ADMIN).get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


def new_task(client, headers, title="Tulis Dockerfile", **extra):
    body = {"title": title, "description": "Penjelasan pekerjaan", **extra}
    return client.post("/api/tasks", json=body, headers=headers)


# ---------- system ----------
def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.get_json()["database"] == "up"


# ---------- auth ----------
def test_register_and_login(client):
    res = register(client)
    assert res.status_code == 201
    assert res.get_json()["user"]["role"] == "user"
    res = client.post(
        "/api/auth/login", json={"email": "arman@example.com", "password": "rahasia123"}
    )
    assert res.status_code == 200
    assert "token" in res.get_json()


def test_register_validation(client):
    assert client.post("/api/auth/register", json={}).status_code == 400
    bad_email = {"name": "A", "email": "bukan-email", "password": "rahasia123"}
    assert client.post("/api/auth/register", json=bad_email).status_code == 400
    short_pw = {"name": "A", "email": "a@b.com", "password": "123"}
    assert client.post("/api/auth/register", json=short_pw).status_code == 400


def test_register_duplicate_email(client):
    register(client)
    assert register(client).status_code == 409


def test_login_wrong_password(client):
    register(client)
    res = client.post("/api/auth/login", json={"email": "arman@example.com", "password": "salah"})
    assert res.status_code == 401


def test_me_requires_token(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer xxx"}).status_code == 401
    res = client.get("/api/auth/me", headers=auth_header(client))
    assert res.get_json()["user"]["name"] == "Arman"


def test_admin_account_is_seeded(client):
    res = client.post("/api/auth/login", json=ADMIN)
    assert res.status_code == 200
    assert res.get_json()["user"]["role"] == "admin"


# ---------- tugas user ----------
def test_tasks_require_auth(client):
    assert client.get("/api/tasks").status_code == 401


def test_user_submits_task(client):
    h = auth_header(client)
    res = new_task(client, h, priority="tinggi", due_date="2026-11-05")
    assert res.status_code == 201
    task = res.get_json()
    assert task["status"] == "menunggu" and task["done"] is False
    stats = client.get("/api/tasks/stats", headers=h).get_json()
    assert stats == {"total": 1, "done": 0, "pending": 1, "progress": 0}


def test_task_validation(client):
    h = auth_header(client)
    assert client.post("/api/tasks", json={}, headers=h).status_code == 400
    no_desc = {"title": "Tanpa deskripsi"}
    assert client.post("/api/tasks", json=no_desc, headers=h).status_code == 400
    assert new_task(client, h, priority="urgent").status_code == 400
    assert new_task(client, h, due_date="05-11-2026").status_code == 400


def test_user_cannot_mark_done(client):
    h = auth_header(client)
    task_id = new_task(client, h).get_json()["id"]
    res = client.patch(f"/api/tasks/{task_id}", json={"done": True}, headers=h)
    assert res.status_code == 403
    assert client.get(f"/api/tasks/{task_id}", headers=h).get_json()["done"] is False


def test_user_can_edit_and_delete_pending_task(client):
    h = auth_header(client)
    task_id = new_task(client, h).get_json()["id"]
    res = client.patch(f"/api/tasks/{task_id}", json={"priority": "rendah"}, headers=h)
    assert res.get_json()["priority"] == "rendah"
    assert client.delete(f"/api/tasks/{task_id}", headers=h).status_code == 204
    assert client.get(f"/api/tasks/{task_id}", headers=h).status_code == 404


def test_users_cannot_see_each_other_tasks(client):
    h1 = auth_header(client, "satu@example.com")
    h2 = auth_header(client, "dua@example.com")
    task_id = new_task(client, h1, title="Rahasia").get_json()["id"]
    assert client.get("/api/tasks", headers=h2).get_json() == []
    assert client.get(f"/api/tasks/{task_id}", headers=h2).status_code == 404
    assert client.delete(f"/api/tasks/{task_id}", headers=h2).status_code == 404


# ---------- admin ----------
def test_admin_endpoints_forbidden_for_user(client):
    h = auth_header(client)
    assert client.get("/api/admin/tasks", headers=h).status_code == 403
    assert client.get("/api/admin/stats", headers=h).status_code == 403


def test_admin_cannot_submit_task(client):
    assert new_task(client, admin_header(client)).status_code == 403


def test_full_review_flow(client):
    """User kirim tugas -> masuk ke admin -> admin tandai selesai -> user melihat selesai."""
    user = auth_header(client, "user1@example.com")
    task_id = new_task(client, user, title="Laporan UTS").get_json()["id"]

    admin = admin_header(client)
    incoming = client.get("/api/admin/tasks?status=menunggu", headers=admin).get_json()
    assert [t["id"] for t in incoming] == [task_id]
    assert incoming[0]["owner"]["email"] == "user1@example.com"
    assert client.get("/api/admin/stats", headers=admin).get_json() == {
        "total": 1, "pending": 1, "done": 0, "users": 1
    }

    res = client.patch(f"/api/admin/tasks/{task_id}", json={"done": True}, headers=admin)
    assert res.status_code == 200
    assert res.get_json()["reviewed_by"] == "Administrator"

    mine = client.get(f"/api/tasks/{task_id}", headers=user).get_json()
    assert mine["status"] == "selesai" and mine["reviewed_at"] is not None
    assert client.get("/api/tasks/stats", headers=user).get_json()["progress"] == 100
    assert client.get("/api/tasks?status=selesai", headers=user).get_json()[0]["id"] == task_id

    # Tugas yang sudah diverifikasi terkunci untuk user
    res = client.patch(f"/api/tasks/{task_id}", json={"title": "x"}, headers=user)
    assert res.status_code == 400
    assert client.delete(f"/api/tasks/{task_id}", headers=user).status_code == 400

    # Admin dapat membatalkan verifikasi
    res = client.patch(f"/api/admin/tasks/{task_id}", json={"done": False}, headers=admin)
    assert res.get_json()["status"] == "menunggu" and res.get_json()["reviewed_by"] is None


def test_admin_review_validation(client):
    admin = admin_header(client)
    res = client.patch("/api/admin/tasks/999", json={"done": True}, headers=admin)
    assert res.status_code == 404
    user = auth_header(client)
    task_id = new_task(client, user).get_json()["id"]
    assert client.patch(f"/api/admin/tasks/{task_id}", json={}, headers=admin).status_code == 400
