import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App.jsx";
import TaskItem from "../components/TaskItem.jsx";

const json = (data, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(data) });

const health = { version: "1.0.0", environment: "production", hostname: "web" };

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

async function login(email = "a@b.com") {
  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.type(screen.getByLabelText("Password"), "rahasia123");
  await userEvent.click(screen.getByRole("button", { name: "Masuk" }));
}

describe("Halaman autentikasi", () => {
  it("menampilkan form masuk dan bisa pindah ke form daftar", async () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Masuk ke akun" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Daftar sekarang" }));
    expect(screen.getByRole("heading", { name: "Buat akun baru" })).toBeInTheDocument();
  });

  it("menampilkan pesan error dari API saat login gagal", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      json({ error: "Email atau password salah" }, 401)
    );
    render(<App />);
    await login();
    expect(await screen.findByRole("alert")).toHaveTextContent("Email atau password salah");
  });
});

describe("Akun user", () => {
  it("menampilkan status menunggu dan selesai dari admin", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      if (url.includes("/auth/login"))
        return json({ token: "abc", user: { id: 1, name: "Arman Maulana", email: "a@b.com", role: "user" } });
      if (url.includes("/tasks/stats")) return json({ total: 2, pending: 1, done: 1, progress: 50 });
      if (url.includes("/tasks"))
        return json([
          { id: 1, title: "Tulis Dockerfile", description: "Sudah multi-stage", priority: "tinggi", due_date: null, done: false, status: "menunggu", created_at: "2026-11-03T10:00:00+00:00" },
          { id: 2, title: "Setup CI", description: "Workflow jalan", priority: "sedang", due_date: null, done: true, status: "selesai", reviewed_by: "Administrator", reviewed_at: "2026-11-03T11:00:00+00:00", created_at: "2026-11-03T09:00:00+00:00" },
        ]);
      if (url.includes("/health")) return json(health);
      return json({});
    });
    render(<App />);
    await login();
    expect(await screen.findByText("Halo, Arman 👋")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Tulis Dockerfile")).toBeInTheDocument());
    expect(screen.getAllByText("Menunggu review").length).toBeGreaterThan(0);
    expect(screen.getByText("Selesai ✓")).toBeInTheDocument();
    expect(screen.getByText(/Diverifikasi oleh Administrator/)).toBeInTheDocument();
    expect(screen.queryByText("Panel Admin")).not.toBeInTheDocument();
  });
});

describe("Akun admin", () => {
  it("melihat tugas dari user lalu menandainya selesai", async () => {
    const calls = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((url, opts = {}) => {
      calls.push([opts.method || "GET", url]);
      if (url.includes("/auth/login"))
        return json({ token: "adm", user: { id: 9, name: "Administrator", email: "admin@taskflow.id", role: "admin" } });
      if (url.includes("/admin/stats")) return json({ total: 1, pending: 1, done: 0, users: 1 });
      if (url.match(/\/admin\/tasks\/5$/)) return json({ id: 5, done: true });
      if (url.includes("/admin/tasks"))
        return json([
          { id: 5, title: "Laporan UTS", description: "Bab 1-8 lengkap", priority: "sedang", due_date: null, done: false, status: "menunggu", created_at: "2026-11-03T10:00:00+00:00", owner: { id: 1, name: "Celvin", email: "celvin@x.id" } },
        ]);
      if (url.includes("/health")) return json(health);
      return json({});
    });
    render(<App />);
    await login("admin@taskflow.id");
    expect(await screen.findByRole("heading", { name: "Panel Admin" })).toBeInTheDocument();
    expect(await screen.findByText("Laporan UTS")).toBeInTheDocument();
    expect(screen.getByText("Celvin")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "✓ Tandai selesai" }));
    await waitFor(() =>
      expect(calls).toContainEqual(["PATCH", "/api/admin/tasks/5"])
    );
  });
});

describe("TaskItem", () => {
  it("tugas menunggu bisa dibatalkan, tugas selesai terkunci", async () => {
    const onDelete = vi.fn();
    const pending = { id: 7, title: "Setup CI", description: "x", priority: "sedang", due_date: "2020-01-01", done: false, created_at: "2026-11-01T00:00:00Z" };
    const { rerender } = render(<ul><TaskItem task={pending} onDelete={onDelete} /></ul>);
    expect(screen.getByText(/terlambat/)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Hapus Setup CI"));
    expect(onDelete).toHaveBeenCalledWith(pending);

    rerender(<ul><TaskItem task={{ ...pending, done: true, reviewed_by: "Admin", reviewed_at: "2026-11-02T00:00:00Z" }} onDelete={onDelete} /></ul>);
    expect(screen.queryByLabelText("Hapus Setup CI")).not.toBeInTheDocument();
    expect(screen.getByText("Selesai ✓")).toBeInTheDocument();
  });
});
