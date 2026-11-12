import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import TaskForm from "./TaskForm.jsx";
import TaskItem from "./TaskItem.jsx";
import TopBar, { useAutoRefresh } from "./TopBar.jsx";

const FILTERS = [
  ["semua", "Semua"],
  ["menunggu", "Menunggu review"],
  ["selesai", "Selesai"],
];

// Dashboard untuk role "user": mengirim tugas dan memantau status verifikasi admin.
export default function Dashboard({ user, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, done: 0, progress: 0 });
  const [filter, setFilter] = useState("semua");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const [list, s] = await Promise.all([api.listTasks(filter), api.stats()]);
      setTasks(list);
      setStats(s);
      setError("");
    } catch (err) {
      if (err.status === 401) onLogout();
      else setError(err.message);
    }
  }, [filter, onLogout]);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);

  const addTask = async (task) => {
    try {
      await api.createTask(task);
      setNotice("Tugas terkirim dan menunggu pengecekan admin.");
      setTimeout(() => setNotice(""), 4000);
      await load();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const remove = async (task) => {
    try { await api.deleteTask(task.id); await load(); } catch (err) { setError(err.message); }
  };

  return (
    <div className="app">
      <TopBar user={user} onLogout={onLogout} subtitle="Pengumpulan tugas UTS DevOps" />

      <main className="container">
        <h2 className="greet">Halo, {user.name.split(" ")[0]} 👋</h2>

        <section className="stats">
          <Stat label="Tugas dikirim" value={stats.total} />
          <Stat label="Menunggu review" value={stats.pending} tone="warn" />
          <Stat label="Selesai" value={stats.done} tone="ok" />
          <div className="stat">
            <strong>{stats.progress}%</strong>
            <span>Progres</span>
            <div className="bar"><div style={{ width: `${stats.progress}%` }} /></div>
          </div>
        </section>

        {error && <div className="alert" role="alert">{error}</div>}
        {notice && <div className="notice" role="status">{notice}</div>}

        <section className="card">
          <h3>Kirim tugas</h3>
          <p className="hint">Tulis deskripsi pekerjaan yang sudah kamu kerjakan. Admin akan mengecek lalu menandainya selesai.</p>
          <TaskForm onSubmit={addTask} />
        </section>

        <section className="card">
          <div className="list-head">
            <h3>Tugas saya</h3>
            <nav className="filters" aria-label="Filter tugas">
              {FILTERS.map(([key, label]) => (
                <button key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>
                  {label}
                </button>
              ))}
            </nav>
          </div>
          {tasks.length ? (
            <ul className="tasks">
              {tasks.map((t) => <TaskItem key={t.id} task={t} onDelete={remove} />)}
            </ul>
          ) : (
            <p className="empty">Belum ada tugas di sini.</p>
          )}
        </section>
      </main>
      <footer>TaskFlow · React + Flask + PostgreSQL · UTS DevOps IF-B Sore</footer>
    </div>
  );
}

export function Stat({ label, value, tone }) {
  return (
    <div className={`stat ${tone ? `tone-${tone}` : ""}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
