import { fmtDate, fmtDateTime } from "./TopBar.jsx";

// Satu baris tugas di akun user. Status selesai hanya bisa diubah admin.
export default function TaskItem({ task, onDelete }) {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = task.due_date && !task.done && task.due_date < today;

  return (
    <li className={task.done ? "done" : ""}>
      <span className={`status-dot ${task.done ? "ok" : "wait"}`} aria-hidden="true">
        {task.done ? "✓" : "…"}
      </span>
      <div className="info">
        <span className="title">{task.title}</span>
        {task.description && <span className="desc">{task.description}</span>}
        <span className="meta">
          {task.done
            ? `Diverifikasi oleh ${task.reviewed_by} · ${fmtDateTime(task.reviewed_at)}`
            : `Dikirim ${fmtDateTime(task.created_at)}`}
          {task.due_date && (
            <span className={overdue ? "overdue" : ""}>
              {" · "}Tenggat {fmtDate(task.due_date)}{overdue ? " (terlambat)" : ""}
            </span>
          )}
        </span>
      </div>
      <span className={`prio prio-${task.priority}`}>{task.priority}</span>
      <span className={`status-badge ${task.done ? "ok" : "wait"}`}>
        {task.done ? "Selesai ✓" : "Menunggu review"}
      </span>
      {!task.done && onDelete ? (
        <button className="del" onClick={() => onDelete(task)} aria-label={`Hapus ${task.title}`} title="Batalkan kiriman">✕</button>
      ) : (
        <span className="del-spacer" />
      )}
    </li>
  );
}
