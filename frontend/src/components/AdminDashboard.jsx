import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Stat } from "./Dashboard.jsx";
import TopBar, { fmtDate, fmtDateTime, useAutoRefresh } from "./TopBar.jsx";

const FILTERS = [
  ["menunggu", "Perlu dicek"],
  ["selesai", "Selesai"],
  ["semua", "Semua"],
];

// Dashboard untuk role "admin": menerima tugas dari semua user dan memverifikasinya.
export default function AdminDashboard({ user, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, done: 0, users: 0 });
  const [filter, setFilter] = useState("menunggu");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [list, s] = await Promise.all([api.adminListTasks(filter), api.adminStats()]);
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

  const review = async (task, done) => {
    setBusy(task.id);
    try { await api.adminReview(task.id, done); await load(); }
    catch (err) { setError(err.message); }
    finally { setBusy(null); }
  };

  return (
    <div className="app">
      <TopBar user={user} onLogout={onLogout} subtitle="Panel admin" />

      <main className="container">
        <h2 className="greet">Panel Admin</h2>
        <p className="hint">Cek deskripsi tugas yang dikirim pengguna, lalu tandai selesai jika sudah sesuai.</p>

        <section className="stats">
          <Stat label="Tugas masuk" value={stats.total} />
          <Stat label="Perlu dicek" value={stats.pending} tone="warn" />
          <Stat label="Selesai diverifikasi" value={stats.done} tone="ok" />
          <Stat label="Pengguna" value={stats.users} />
        </section>

        {error && <div className="alert" role="alert">{error}</div>}

        <section className="card">
          <div className="list-head">
            <h3>Tugas dari pengguna</h3>
            <nav className="filters" aria-label="Filter tugas">
              {FILTERS.map(([key, label]) => (
                <button key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>
                  {label}
                  {key === "menunggu" && stats.pending > 0 && <span className="count">{stats.pending}</span>}
                </button>
              ))}
            </nav>
          </div>

          {tasks.length ? (
            <ul className="review-list">
              {tasks.map((t) => (
                <li key={t.id} className={t.done ? "done" : ""}>
                  <div className="review-head">
                    <span className="avatar sm">{t.owner.name.charAt(0).toUpperCase()}</span>
                    <div>
                      <strong>{t.owner.name}</strong>
                      <span className="muted small"> · {t.owner.email}</span>
                      <div className="muted small">Dikirim {fmtDateTime(t.created_at)}</div>
                    </div>
                    <span className={`prio prio-${t.priority}`}>{t.priority}</span>
                  </div>
                  <div className="review-body">
                    <span className="title">{t.title}</span>
                    <p className="desc-full">{t.description}</p>
                    {t.due_date && <span className="muted small">Tenggat {fmtDate(t.due_date)}</span>}
                  </div>
                  <div className="review-actions">
                    {t.done ? (
                      <>
                        <span className="status-badge ok">Selesai ✓ · {fmtDateTime(t.reviewed_at)}</span>
                        <button className="btn" disabled={busy === t.id} onClick={() => review(t, false)}>
                          Batalkan
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="status-badge wait">Menunggu review</span>
                        <button className="btn success" disabled={busy === t.id} onClick={() => review(t, true)}>
                          ✓ Tandai selesai
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">
              {filter === "menunggu" ? "Tidak ada tugas yang perlu dicek. 🎉" : "Belum ada tugas di sini."}
            </p>
          )}
        </section>
      </main>
      <footer>TaskFlow · Panel Admin · UTS DevOps IF-B Sore</footer>
    </div>
  );
}
