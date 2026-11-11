import { useState } from "react";

const EMPTY = { title: "", description: "", priority: "sedang", due_date: "" };

export default function TaskForm({ onSubmit }) {
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setSending(true);
    const ok = await onSubmit({ ...form, due_date: form.due_date || null });
    setSending(false);
    if (ok !== false) setForm(EMPTY);
  };

  return (
    <form className="task-form" onSubmit={submit}>
      <input name="title" placeholder="Judul tugas" value={form.title} onChange={update} maxLength={120} required aria-label="Judul tugas" />
      <textarea
        name="description"
        placeholder="Deskripsi tugas: apa yang sudah dikerjakan, link hasil, dll."
        value={form.description}
        onChange={update}
        rows={3}
        required
        aria-label="Deskripsi tugas"
      />
      <div className="form-row">
        <label>
          Prioritas
          <select name="priority" value={form.priority} onChange={update} aria-label="Prioritas">
            <option value="rendah">Rendah</option>
            <option value="sedang">Sedang</option>
            <option value="tinggi">Tinggi</option>
          </select>
        </label>
        <label>
          Tenggat (opsional)
          <input name="due_date" type="date" value={form.due_date} onChange={update} aria-label="Tenggat" />
        </label>
        <button className="btn primary" disabled={sending}>{sending ? "Mengirim…" : "Kirim tugas"}</button>
      </div>
    </form>
  );
}
